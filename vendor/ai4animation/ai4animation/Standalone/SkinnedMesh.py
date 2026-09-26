# Copyright (c) Meta Platforms, Inc. and affiliates.
from array import array
from io import BytesIO

import cffi
import numpy as np
from ai4animation.AI4Animation import AI4Animation
from ai4animation.Math import Tensor, Transform
from pyray import load_model_from_mesh, Matrix, Mesh
from raylib import (
    LoadImageFromMemory,
    LoadTextureFromImage,
    MATERIAL_MAP_DIFFUSE,
    MatrixIdentity,
    MemAlloc,
    RAYWHITE,
    SetMaterialTexture,
    UnloadImage,
    UploadMesh,
    WHITE,
)

ffi = cffi.FFI()

# raylib's Mesh.indices is hard-coded as `unsigned short*` (uint16), so a single
# submesh can address at most this many distinct vertices.
UINT16_INDEX_LIMIT = 65535


def _split_indexed_mesh_into_chunks(
    triangles: np.ndarray,
    max_unique_vertices: int = UINT16_INDEX_LIMIT,
):
    """Split a triangle index buffer into chunks each referencing <= max_unique_vertices
    distinct vertex indices.

    Returns a list of (global_vertex_indices, local_triangles_uint16) tuples, one per
    chunk. `global_vertex_indices` is a sorted int64 array selecting rows from the
    source mesh's per-vertex arrays; `local_triangles_uint16` is a flat uint16 buffer
    of triangle indices remapped to [0, len(global_vertex_indices)).

    Triangle order is preserved (sequential range partition) so the same chunking
    decisions are reproducible. Chunks are sized greedily with adaptive bisection.
    """
    tris = np.asarray(triangles).reshape(-1, 3)
    n_tris = tris.shape[0]

    chunks = []
    start = 0
    # Start optimistic; will adapt to the mesh's actual vertex-sharing density.
    target_batch = min(200_000, max(1, n_tris))
    # Worst-case safe size: every triangle contributes 3 unseen vertices.
    safe_min = max(1, max_unique_vertices // 3)

    while start < n_tris:
        size = min(target_batch, n_tris - start)
        while True:
            end = start + size
            sub = tris[start:end]
            unique_global = np.unique(sub)
            if len(unique_global) <= max_unique_vertices:
                break
            # Doesn't fit — shrink based on observed density, with safety net.
            ratio = max_unique_vertices / len(unique_global)
            new_size = max(safe_min, int(size * ratio * 0.95))
            if new_size >= size:
                new_size = max(safe_min, size - 1)
            size = new_size

        local_tris = np.searchsorted(unique_global, sub).astype(np.uint16)
        chunks.append((unique_global, local_tris.flatten()))

        # Adapt next-batch target from this chunk's vertices-per-triangle density.
        density = len(unique_global) / max(1, end - start)
        target_batch = max(safe_min, int(max_unique_vertices / max(density, 1e-3)))
        start = end

    return chunks


def _create_texture_from_image(image):
    if image is None:
        return None

    encoded = BytesIO()
    image.convert("RGBA").save(encoded, format="PNG")
    image_bytes = encoded.getvalue()

    raylib_image = LoadImageFromMemory(
        b".png",
        ffi.from_buffer("unsigned char[]", image_bytes),
        len(image_bytes),
    )
    texture = LoadTextureFromImage(raylib_image)
    UnloadImage(raylib_image)
    return texture


class SkinnedMesh:
    def __init__(self, actor, model):
        self.Actor = actor

        self.SkinnedMeshes = [mesh for mesh in model.Meshes if mesh.HasSkinning]

        self.BindMatrices = np.transpose(
            Tensor.Create(model.Skin.Inverse_bind_matrices), axes=(0, 2, 1)
        )

        self.Models = []
        self.BoneMatrixViews = []
        self.Textures = []
        self.Color = RAYWHITE

        print(
            f"Loading {len(self.SkinnedMeshes)} skinned meshes (skipping {len(model.Meshes) - len(self.SkinnedMeshes)} non-skinned meshes)"
        )

        boneCount = len(model.JointNames)
        self.BoneCount = boneCount

        MAX_BONES_SUPPORTED = 254
        if boneCount > MAX_BONES_SUPPORTED:
            raise ValueError(
                f"Character has {boneCount} bones, but shader only supports {MAX_BONES_SUPPORTED}. "
                f"Increase MAX_BONE_NUM in skinnedShadow.vs and skinnedBasic.vs"
            )

        for mesh in self.SkinnedMeshes:
            vertexCount = len(mesh.Vertices)
            mesh_vertices = np.asarray(mesh.Vertices)
            mesh_normals = np.asarray(mesh.Normals)
            mesh_skin_indices = np.asarray(mesh.SkinIndices)
            mesh_skin_weights = np.asarray(mesh.SkinWeights)
            has_texcoords = (
                getattr(mesh, "TexCoords", None) is not None
                and len(mesh.TexCoords) == vertexCount
            )
            mesh_texcoords = (
                np.asarray(mesh.TexCoords, dtype=np.float32) if has_texcoords else None
            )

            # raylib's index buffer is uint16, so any mesh with >65535 vertices
            # must be split into multiple sub-meshes ("chunks") with local indices.
            # For meshes already small enough, this produces exactly one chunk.
            mesh_chunks = _split_indexed_mesh_into_chunks(
                mesh.Triangles, max_unique_vertices=UINT16_INDEX_LIMIT
            )
            if vertexCount > UINT16_INDEX_LIMIT:
                print(
                    f"  Mesh has {vertexCount} vertices (>{UINT16_INDEX_LIMIT}); "
                    f"splitting into {len(mesh_chunks)} sub-meshes for raylib"
                )

            mesh_texture = _create_texture_from_image(getattr(mesh, "Image", None))

            for chunk_idx, (global_indices, local_triangles) in enumerate(mesh_chunks):
                chunkVertexCount = len(global_indices)
                chunkTriangleCount = local_triangles.shape[0] // 3

                # Gather per-vertex data for this chunk
                chunk_positions = mesh_vertices[global_indices]
                chunk_normals = mesh_normals[global_indices]
                if has_texcoords:
                    chunk_texcoords = mesh_texcoords[global_indices]
                else:
                    chunk_texcoords = np.tile(
                        np.array([0.5, 0.5], dtype=np.float32),
                        (chunkVertexCount, 1),
                    )
                chunk_skin_indices = mesh_skin_indices[global_indices]
                chunk_skin_weights = mesh_skin_weights[global_indices]

                vertices = array("f", chunk_positions.flatten())
                normals = array("f", chunk_normals.flatten())
                triangles = array("H", local_triangles)
                texcoords = array("f", chunk_texcoords.flatten())

                # 4 bones per vertex
                boneIds = np.zeros((chunkVertexCount, 4), dtype=np.uint8)
                currentSkinBones = min(chunk_skin_indices.shape[1], 4)
                boneIds[:, :currentSkinBones] = chunk_skin_indices[
                    :, :currentSkinBones
                ].astype(np.uint8)
                bone_ids = array("B", boneIds.flatten())

                # Bone weights
                boneWeights = np.zeros((chunkVertexCount, 4), dtype=np.float32)
                boneWeights[:, :currentSkinBones] = chunk_skin_weights[
                    :, :currentSkinBones
                ]
                bone_weights = array("f", boneWeights.flatten())

                raylib_mesh = Mesh()
                raylib_mesh.vertexCount = chunkVertexCount
                raylib_mesh.triangleCount = chunkTriangleCount
                raylib_mesh.vertices = ffi.cast("float*", vertices.buffer_info()[0])
                raylib_mesh.texcoords = ffi.cast("float*", texcoords.buffer_info()[0])
                raylib_mesh.normals = ffi.cast("float*", normals.buffer_info()[0])
                raylib_mesh.indices = ffi.cast(
                    "unsigned short*", triangles.buffer_info()[0]
                )
                raylib_mesh.boneIds = ffi.cast(
                    "unsigned char*", bone_ids.buffer_info()[0]
                )
                raylib_mesh.boneWeights = ffi.cast(
                    "float*", bone_weights.buffer_info()[0]
                )
                raylib_mesh.boneCount = boneCount
                raylib_mesh.vaoId = 0

                # Allocate bone matrices
                raylib_mesh.boneMatrices = MemAlloc(boneCount * ffi.sizeof(Matrix()))
                for i in range(boneCount):
                    raylib_mesh.boneMatrices[i] = MatrixIdentity()

                # Upload mesh with dynamic flag for bone updates
                UploadMesh(ffi.addressof(raylib_mesh), True)

                # Create Model for this chunk
                raylib_model = load_model_from_mesh(raylib_mesh)
                raylib_model.materials[0].maps[MATERIAL_MAP_DIFFUSE].color = WHITE

                if mesh_texture is not None:
                    SetMaterialTexture(
                        ffi.addressof(raylib_model.materials[0]),
                        MATERIAL_MAP_DIFFUSE,
                        mesh_texture,
                    )
                    # Only register the texture object once (it's shared by all chunks).
                    if chunk_idx == 0:
                        self.Textures.append(mesh_texture)

                self.Models.append(raylib_model)

                # Cache numpy view of bone matrices for efficient updates
                gpu_mesh = raylib_model.meshes[0]
                matView = np.frombuffer(
                    ffi.buffer(
                        gpu_mesh.boneMatrices,
                        gpu_mesh.boneCount * ffi.sizeof(Matrix()),
                    ),
                    dtype=np.float32,
                ).reshape(gpu_mesh.boneCount, 4, 4)
                self.BoneMatrixViews.append(matView)

        # Precompute model-joint → scene entity index mapping.
        # Uses name lookup so hierarchy and model joint counts/orderings can differ.
        valid = [
            (i, actor.NameToEntity[name].Index)
            for i, name in enumerate(model.JointNames)
            if name in actor.NameToEntity
        ]
        self._model_idx  = np.array([p[0] for p in valid], dtype=np.int32)
        self._entity_idx = np.array([p[1] for p in valid], dtype=np.int32)

        print(
            f"Initialized {len(self.Models)} skinned submeshes with {boneCount} bones"
        )

        AI4Animation.Standalone.RenderPipeline.RegisterModel(
            name=self.Actor.Entity.Name,
            model=self.Models,
            skinned_mesh=self,
            color=self.Color,
        )

    def SetColor(self, color):
        self.Color = color
        self.Unregister()
        self.Register()

    def Register(self):
        if not AI4Animation.Standalone.RenderPipeline.HasModel(self.Models):
            AI4Animation.Standalone.RenderPipeline.RegisterModel(
                name=self.Actor.Entity.Name,
                model=self.Models,
                skinned_mesh=self,
                color=self.Color,
            )

    def Unregister(self):
        if AI4Animation.Standalone.RenderPipeline.HasModel(self.Models):
            AI4Animation.Standalone.RenderPipeline.UnregisterModel(self.Models)

    def Update(self):
        # GPU skinning - compute and update bone matrices
        if not self.Models:
            return

        # Update bone matrices for all meshes (GPU will use these in shaders)
        skinning = np.tile(np.eye(4, dtype=np.float32), (self.BoneCount, 1, 1))
        if len(self._entity_idx):
            T = AI4Animation.Scene.Transforms[self._entity_idx]
            S = AI4Animation.Scene.Scales[self._entity_idx]
            skinning[self._model_idx] = Transform.TRS(
                Transform.GetPosition(T), Transform.GetRotation(T), S
            )

        transforms = np.matmul(skinning, self.BindMatrices)
        for matView in self.BoneMatrixViews:
            matView[:] = transforms
