# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Interactive Catmull-Rom spline interpolation demo."""

from ai4animation import (
    AI4Animation,
    Rotation,
    Spline,
    Tensor,
    Transform,
    Utility,
    Vector3,
)

RESOLUTION = 30
PERCENTAGE = 0.5


class Program:
    def Start(self):
        self.Root = AI4Animation.Scene.AddEntity("Spline")
        self.ControlPoints = [
            AI4Animation.Scene.AddEntity(
                "P0",
                position=Vector3.Create(-2.0, 0.5, -1.0),
                rotation=Rotation.LookPlanar(Vector3.Create(1.0, 0.0, 0.5)),
                parent=self.Root,
            ),
            AI4Animation.Scene.AddEntity(
                "P1",
                position=Vector3.Create(-0.5, 1.5, 1.5),
                rotation=Rotation.LookPlanar(Vector3.Create(0.5, 0.0, 1.0)),
                parent=self.Root,
            ),
            AI4Animation.Scene.AddEntity(
                "P2",
                position=Vector3.Create(1.0, 0.75, 0.5),
                rotation=Rotation.LookPlanar(Vector3.Create(1.0, 0.0, -0.25)),
                parent=self.Root,
            ),
            AI4Animation.Scene.AddEntity(
                "P3",
                position=Vector3.Create(2.5, 1.25, -1.0),
                rotation=Rotation.LookPlanar(Vector3.Create(0.25, 0.0, -1.0)),
                parent=self.Root,
            ),
        ]

        self.Percentage = PERCENTAGE
        self.Resolution = RESOLUTION

    def Standalone(self):
        AI4Animation.Standalone.Camera.SetTarget(self.Root)
        self.Percentage = AI4Animation.GUI.Slider(
            0.78, 0.10, 0.20, 0.04, 0.5, 0.0, 1.0, label="Percentage"
        )
        self.Resolution = AI4Animation.GUI.Slider(
            0.78, 0.16, 0.20, 0.04, 30, 2, 64, integers=True, label="Resolution"
        )

    def Draw(self):
        control = Transform.TR(
            Tensor.Stack([p.GetPosition() for p in self.ControlPoints], axis=0),
            Tensor.Stack([p.GetRotation() for p in self.ControlPoints], axis=0),
        )
        positions = Transform.GetPosition(control)
        resolution = max(2, int(self.Resolution.GetValue()))
        spline = Spline.GetPointsOnSplineTransform(control, resolution)
        curve = Transform.GetPosition(
            Spline.GetPointsOnSplineTransform(control, max(resolution, 64))
        )
        sample = Spline.GetPointOnSplineTransform(control, self.Percentage.GetValue())

        AI4Animation.Draw.Cylinder(positions[:-1], positions[1:], 0.02, 0.02, color=AI4Animation.Color.RED)
        AI4Animation.Draw.Sphere(positions, size=0.1, color=AI4Animation.Color.RED)
        for i in range(len(self.ControlPoints)):
            AI4Animation.Draw.Transform(control[i], size=1.0)

        AI4Animation.Draw.Cylinder(curve[:-1], curve[1:], 0.035, 0.035, color=AI4Animation.Color.GREEN)
        AI4Animation.Draw.Sphere(Transform.GetPosition(spline), size=0.06, color=AI4Animation.Color.MAGENTA)

        AI4Animation.Draw.Cube(Transform.GetPosition(sample), size=0.125, color=AI4Animation.Color.BLUE)
        AI4Animation.Draw.Vector(Transform.GetPosition(sample), 0.5 * Transform.GetAxisZ(sample), color=AI4Animation.Color.MAGENTA)

    def GUI(self):
        self.Percentage.GUI()
        self.Resolution.GUI()
        for point in self.ControlPoints:
            point.DrawHandle()


def main():
    AI4Animation(Program(), mode=AI4Animation.Mode.STANDALONE)


if __name__ == "__main__":
    main()
