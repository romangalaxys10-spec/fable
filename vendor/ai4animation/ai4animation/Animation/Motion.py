# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Motion data container with bone transforms, velocities, and module support."""

import os

import numpy as np
from ai4animation.Animation.Hierarchy import Hierarchy
from ai4animation.Math import Quaternion, Tensor, Transform, Vector3


class Motion:
    def __init__(self, name, hierarchy, frames, framerate, operation=None):
        self.Name = name
        self.Hierarchy = hierarchy
        self.Frames = frames  # [num_frames, num_joints, 4, 4]
        self.Framerate = framerate

        if operation is not None:
            operation(self)

        if self.NumJoints != len(hierarchy.BoneNames):
            print(
                f"Warning: Number of joints in frames ({self.NumJoints}) doesn't match hierarchy ({len(hierarchy.BoneNames)})"
            )

        self.Scale = 1.0

        self.Modules = []
        self.MirrorModule = None

    @property
    def NumFrames(self) -> int:
        return self.Frames.shape[0]

    @property
    def NumJoints(self) -> int:
        return self.Frames.shape[1]

    @property
    def DeltaTime(self) -> float:
        return 1.0 / self.Framerate

    @property
    def TotalTime(self) -> float:
        return (self.NumFrames - 1) / self.Framerate

    def AddModule(self, module):
        if callable(module):
            module = module(self)
        self.Modules.append(module)
        self.Modules[-1].Initialize()

    def AddModules(self, modules):
        for module in modules:
            if callable(module):
                module = module(self)
            self.Modules.append(module)
        for module in self.Modules:
            module.Initialize()

    def GetModule(self, module):
        for instance in self.Modules:
            if type(instance) is module:
                return instance
        print("Module of type", module, "could not be found in asset", self.Name)
        return None

    def GetFrameIndices(self, timestamps=None):
        if timestamps is None:
            timestamps = Tensor.LinSpace(0, self.TotalTime, self.NumFrames)
        timestamps = Tensor.Create(timestamps)
        indices = Tensor.Clamp(
            Tensor.Round(timestamps * self.Framerate), 0, self.NumFrames - 1
        )
        return Tensor.ToInt(indices)

    def GetTimestamps(self, framerate, start_padding=0.0, end_padding=0.0):
        if self.TotalTime - end_padding <= 0:
            print(
                f"Warning: Total time ({self.TotalTime:.2f}s) is less than or equal to end padding ({end_padding:.2f}s). No timestamps will be generated."
            )
            return Tensor.Zeros(0)
        return Tensor.Arange(
            start_padding, self.TotalTime - end_padding, 1.0 / framerate
        )

    def GetBoneIndices(self, names_or_indices=None):
        if names_or_indices is None:
            return list(range(self.NumJoints))
        if isinstance(names_or_indices, int):
            return [names_or_indices]
        elif isinstance(names_or_indices[0], int):
            return list(names_or_indices)
        return self.Hierarchy.GetBoneIndex(names_or_indices)

    def GetBoneTransformations(
        self, timestamps=None, bone_names_or_indices=None, mirrored=False
    ):
        # This fails if only one (float) timestamp is given because only one (int) frame_indices is returned. The rest of the function works tho. Expected?
        # if len(frame_indices) == 0 or len(bone_indices) == 0:
        #     print("Failed sampling bone transformations because frame indices or bone specifications were invalid")
        #     return None

        if mirrored:
            if self.MirrorModule is None:
                from ai4animation.Animation.MirrorModule import MirrorModule

                self.MirrorModule = self.GetModule(MirrorModule)
                if self.MirrorModule is None:
                    print("Warning: Mirror module not found. Skipping mirroring.")
                    return self.GetBoneTransformations(
                        timestamps, bone_names_or_indices, False
                    )

        frame_indices = self.GetFrameIndices(timestamps)
        bone_indices = self.GetBoneIndices(bone_names_or_indices)

        transformations = (
            self.Frames[frame_indices.flatten()][:, bone_indices]
            if not mirrored
            else self.MirrorModule.GetBoneTransformations(
                frame_indices.flatten(), bone_indices
            )
        )

        if self.Scale != 1.0:
            transformations = Transform.Scale(transformations, self.Scale)

        transformations = transformations.reshape(
            frame_indices.shape + transformations.shape[1:]
        )

        return transformations

    def GetBonePositions(
        self, timestamps=None, bone_names_or_indices=None, mirrored=False
    ):
        return Transform.GetPosition(
            self.GetBoneTransformations(timestamps, bone_names_or_indices, mirrored)
        )

    def GetBoneRotations(
        self, timestamps=None, bone_names_or_indices=None, mirrored=False
    ):
        return Transform.GetRotation(
            self.GetBoneTransformations(timestamps, bone_names_or_indices, mirrored)
        )

    def GetBoneVelocities(
        self, timestamps=None, bone_names_or_indices=None, mirrored=False
    ):
        timestamps = (
            Tensor.LinSpace(0, self.TotalTime, self.NumFrames)
            if timestamps is None
            else timestamps
        )
        t_previous = Tensor.Clamp(
            timestamps - self.DeltaTime, 0.0, self.TotalTime - self.DeltaTime
        )
        t_current = Tensor.Clamp(timestamps, self.DeltaTime, self.TotalTime)
        pos_previous = self.GetBonePositions(
            t_previous, bone_names_or_indices, mirrored
        )
        pos_current = self.GetBonePositions(t_current, bone_names_or_indices, mirrored)
        return (pos_current - pos_previous) / self.DeltaTime

    def GetBoneLengths(
        self,
        timestamps=None,
        bone_names_or_indices=None,
        parent_names_or_indices=None,
        mirrored=False,
    ):
        if timestamps is None:
            timestamps = Tensor.LinSpace(0, self.TotalTime, self.NumFrames)

        if bone_names_or_indices is None:
            bone_names_or_indices = self.Hierarchy.BoneNames

        if parent_names_or_indices is None:
            parent_names_or_indices = self.Hierarchy.ParentNames

        # Replace None parents with the bone name itself (creates new list, no side effects)
        parent_names_or_indices = [
            bone if parent is None else parent
            for bone, parent in zip(bone_names_or_indices, parent_names_or_indices)
        ]

        bone_indices = self.GetBoneIndices(bone_names_or_indices)
        parent_indices = self.GetBoneIndices(parent_names_or_indices)

        bone_positions = self.GetBonePositions(timestamps, bone_indices, mirrored)
        parent_positions = self.GetBonePositions(timestamps, parent_indices, mirrored)

        return Vector3.Distance(bone_positions, parent_positions)

    def GetBodyProportion(
        self,
        timestamps=None,
        bone_names_or_indices=None,
        parent_names_or_indices=None,
        mirrored=False,
    ):
        lengths = self.GetBoneLengths(
            timestamps, bone_names_or_indices, parent_names_or_indices, mirrored
        )
        lengths = Tensor.Squeeze(lengths, -1)
        proportion = Tensor.Sum(lengths, axis=-1, keepDim=True)
        return proportion

    def Debug(self):
        print(f"=== Motion: {self.Name} ===")
        print(f"Frames: {self.NumFrames}")
        print(f"Joints: {self.NumJoints}")
        print(f"Framerate: {self.Framerate:.2f} fps")
        print(f"Duration: {self.TotalTime:.2f}s")
        print(f"Frames shape: {self.Frames.shape}")
        self.Hierarchy.Debug()

    # Asset Serialization
    def SaveToNPZ(self, absolute_path):
        directory = os.path.dirname(absolute_path)
        if directory:
            os.makedirs(directory, exist_ok=True)

        if not absolute_path.endswith(".npz"):
            absolute_path = absolute_path + ".npz"

        frames = self.GetBoneTransformations()
        positions = Transform.GetPosition(frames)
        rotations = Transform.GetRotation(frames)
        quaternions = Quaternion.FromMatrix(rotations)

        np.savez_compressed(
            absolute_path,
            name=self.Name,
            framerate=self.Framerate,
            positions=positions,
            quaternions=quaternions,
            bone_names=self.Hierarchy.BoneNames,
            parent_names=self.Hierarchy.ParentNames,
            parent_indices=self.Hierarchy.ParentIndices,
        )

    def SaveToGLB(self, absolute_path):
        from ai4animation.Export.GLBExporter import GLBExporter

        directory = os.path.dirname(absolute_path)
        if directory:
            os.makedirs(directory, exist_ok=True)

        frames = self.GetBoneTransformations()
        return GLBExporter.Export(
            positions=Transform.GetPosition(
                frames
            ),  # (F, J, 3) float32, world joint positions
            rotations=Quaternion.FromMatrix(
                Transform.GetRotation(frames)
            ),  # (F, J, 4) float32, world quaternions (x, y, z, w)
            bone_names=self.Hierarchy.BoneNames,  # (J,) str, joint names
            parent_indices=np.array(
                self.Hierarchy.ParentIndices
            ),  # (J,) ints, parent index per joint, -1 for root
            out_path=absolute_path,
            fps=self.Framerate,
        )

    @classmethod
    def LoadFromNPZ(cls, absolute_path, operation=None):
        if not absolute_path.endswith(".npz"):
            absolute_path = absolute_path + ".npz"
        if not os.path.isfile(absolute_path):
            raise FileNotFoundError(f"NPZ file not found: {absolute_path}")

        with np.load(absolute_path, allow_pickle=True) as data:
            hierarchy = Hierarchy(
                bone_names=data["bone_names"].tolist(),
                parent_names=data["parent_names"].tolist(),
            )

            positions = Tensor.Create(data["positions"])  # [NumFrames, NumJoints, 3]
            quaternions = Tensor.Create(
                data["quaternions"]
            )  # [NumFrames, NumJoints, 4]

            frames = Transform.TR(positions, Quaternion.ToMatrix(quaternions))

            return cls(
                name=str(data["name"]),
                hierarchy=hierarchy,
                frames=frames,
                framerate=float(data["framerate"]),
                operation=operation,
            )

    @classmethod
    def LoadFromGLB(
        cls,
        absolute_path,
        names=None,
        scale=1.0,  # TODO: not yet supported
        operation=None,
    ):
        from ai4animation.Import.GLBImporter import GLB

        if not os.path.isfile(absolute_path):
            raise FileNotFoundError(f"GLB file not found: {absolute_path}")
        return GLB(absolute_path).LoadMotion(names=names, operation=operation)

    @classmethod
    def LoadFromBVH(
        cls,
        absolute_path,
        names=None,
        scale=1.0,
        operation=None,
    ):
        from ai4animation.Import.BVHImporter import BVH

        if not os.path.isfile(absolute_path):
            raise FileNotFoundError(f"BVH file not found: {absolute_path}")
        return BVH(absolute_path, scale=scale).LoadMotion(
            names=names, operation=operation
        )

    @classmethod
    def LoadFromFBX(
        cls,
        absolute_path,
        names=None,
        scale=1.0,  # TODO: not yet supported
        operation=None,
    ):
        from ai4animation.Import.FBXImporter import FBX

        if not os.path.isfile(absolute_path):
            raise FileNotFoundError(f"FBX file not found: {absolute_path}")
        return FBX(absolute_path).LoadMotion(names=names, operation=operation)
