# Copyright (c) Meta Platforms, Inc. and affiliates.
import os
import sys
from pathlib import Path

from ai4animation import (
    AI4Animation,
    ContactModule,
    Dataset,
    MirrorModule,
    MotionEditor,
    MotionModule,
    RootModule,
    Transform,
    Vector3,
    Rotation,
)

SCRIPT_DIR = Path(__file__).parent

DATASET_PATH = os.path.join(SCRIPT_DIR, "bvh/NPZ")

ASSETS_PATH = str(SCRIPT_DIR.parent.parent / "_ASSETS_/Quadruped")
MODEL_PATH = os.path.join(ASSETS_PATH, "Dog.glb")
sys.path.append(ASSETS_PATH)
import Definitions


class Program:
    def Start(self):
        self.Dataset = Dataset(
            DATASET_PATH,
            [
                lambda x: RootModule(
                    x,
                    Definitions.HipName,
                    Definitions.LeftHipName,
                    Definitions.RightHipName,
                    Definitions.LeftShoulderName,
                    Definitions.RightShoulderName,
                    Definitions.NeckName,
                    topology=RootModule.Topology.QUADRUPED,
                ),
                lambda x: MotionModule(x),
                lambda x: ContactModule(
                    x,
                    [
                        (Definitions.LeftHandSiteName, 1.0),
                        (Definitions.RightHandSiteName, 1.0),
                        (Definitions.LeftFootSiteName, 1.0),
                        (Definitions.RightFootSiteName, 1.0),
                    ],
                ),
                lambda x: MirrorModule(
                    x, Vector3.Axis.ZPositive,
                ),
            ],
            operation=lambda x: self.CorrectMotion(x),
        )
        self.Editor = AI4Animation.Scene.AddEntity("MotionEditor").AddComponent(
            MotionEditor,
            self.Dataset,
            MODEL_PATH,
            Definitions.FULL_BODY_NAMES,
        )
        AI4Animation.Standalone.Camera.SetTarget(self.Editor.Actor.Entity)

    def Update(self):
        pass

    def CorrectMotion(self, motion):
        motion.Frames = Transform.GetMirror(motion.Frames, Vector3.Axis.XPositive)
        idx = motion.Hierarchy.GetBoneIndex([Definitions.HeadName, Definitions.LeftShoulderName, Definitions.RightShoulderName])
        motion.Frames[:, idx] = Transform.Multiply(motion.Frames[:, idx], Transform.R(Rotation.Euler(90, 0, 0)))

def main():
    AI4Animation(Program())


if __name__ == "__main__":
    main()
