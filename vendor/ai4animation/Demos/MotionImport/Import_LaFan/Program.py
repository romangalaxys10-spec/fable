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
    Vector3,
)

SCRIPT_DIR = Path(__file__).parent

DATASET_PATH = os.path.join(SCRIPT_DIR, "bvh/NPZ")

ASSETS_PATH = str(SCRIPT_DIR.parent.parent / "_ASSETS_/Geno")
MODEL_PATH = os.path.join(ASSETS_PATH, "Model.glb")
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
                ),
                lambda x: MotionModule(x),
                lambda x: ContactModule(
                    x,
                    [
                        (Definitions.LeftAnkleName, 0.25),
                        (Definitions.LeftBallName, 0.25),
                        (Definitions.RightAnkleName, 0.25),
                        (Definitions.RightBallName, 0.25),
                    ],
                ),
                lambda x: MirrorModule(
                    x,
                    Vector3.Axis.ZPositive,
                    correction=Vector3.Create(180, 0, 180),
                    map=MirrorModule.Map.All,
                ),
            ],
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


def main():
    AI4Animation(Program())


if __name__ == "__main__":
    main()
