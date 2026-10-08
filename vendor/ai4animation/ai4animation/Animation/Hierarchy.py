# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Skeleton hierarchy: bone names, parent names, and index mappings."""

class Hierarchy:
    def __init__(self, bone_names, parent_names):
        self.BoneNames = bone_names
        self.ParentNames = parent_names
        self.NameToIndex = {name: i for i, name in enumerate(bone_names)}

        # Convert parent names to parent indices
        self.ParentIndices = []
        for parent_name in parent_names:
            if parent_name is None:
                self.ParentIndices.append(-1)  # Root bone
            else:
                parent_idx = self.NameToIndex.get(parent_name, -1)
                self.ParentIndices.append(parent_idx)

    def GetBoneIndex(self, names, debug=False):
        #TODO: Fix undesired behaviour (across framework) if string is not a list but a single string
        if not isinstance(names, (list, tuple)):
            names = list(names)

        indices = []
        for name in names:
            idx = self.NameToIndex.get(name, -1)
            if idx == -1 and debug:
                print(f"Bone '{name}' not found in {self.BoneNames}")
            indices.append(idx)
        return indices

    def GetBoneName(self, indices):
        if not isinstance(indices, (list, tuple)):
            indices = list(indices)
        names = []
        for idx in indices:
            if self.IsValidBoneIndex(idx):
                names.append(self.BoneNames[idx])
            else:
                names.append("None")
        return names

    def GetParentIndex(self, index):
        if self.IsValidBoneIndex(index):
            return self.ParentIndices[index]
        return -1

    def IsValidBoneIndex(self, index):
        return 0 <= index < len(self.BoneNames)

    def IsRoot(self, index):
        return self.IsValidBoneIndex(index) and self.ParentIndices[index] == -1

    def Debug(self):
        print("=== Hierarchy ===")
        print(f"Bones: {len(self.BoneNames)}")
        for i, name in enumerate(self.BoneNames):
            parent = self.ParentNames[i] if self.ParentNames[i] is not None else "None"
            print(
                f"  [{i}] {name} (parent: {parent}) (parent_idx: {self.ParentIndices[i]})"
            )
