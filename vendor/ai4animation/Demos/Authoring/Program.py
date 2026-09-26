# Copyright (c) Meta Platforms, Inc. and affiliates.
import math

from ai4animation import (
    AI4Animation,
    Tensor,
    Time,
    Transform,
    Vector3,
)
from MotionController import MotionController
from PathPlanner3D import PathPlanner3D

CENTER = (0.0, 1.0, 0.0)
SIZE = (10.0, 2.0, 10.0)
RESOLUTION = (12, 1, 12)
MAX_DEPTH = 40
SPLINE_RESOLUTION = 80
WALK_SPEED = 1.0
CONTROL_STRENGTH = 2.0

OBSTACLES = [
    ((0.0, 0.5, 0.0), (1.0, 1.0, 2.0)),
    ((3.0, 0.5, -2.5), (1.0, 1.0, 1.0)),
    ((-3.0, 0.5, 2.5), (1.0, 1.0, 1.0)),
]


class AuthoringProgram:
    def __init__(self, prediction_fps=10):
        self.PredictionFPS = prediction_fps

    def Start(self):
        self.MotionController = MotionController()
        self.SetGuidance(0)

        self.StartPoint = AI4Animation.Scene.AddEntity(
            "Start", position=Vector3.Create(-4.0, 0.0, -4.0)
        )
        self.GoalPoint = AI4Animation.Scene.AddEntity(
            "Goal", position=Vector3.Create(4.0, 0.0, 4.0)
        )
        self.CenterPoint = AI4Animation.Scene.AddEntity(
            "Center", position=Vector3.Create(*CENTER)
        )

        self.Obstacles = []
        self.ObstacleSizes = []
        for i, (center, size) in enumerate(OBSTACLES):
            self.Obstacles.append(
                AI4Animation.Scene.AddEntity(
                    f"Obstacle{i}", position=Vector3.Create(*center)
                )
            )
            self.ObstacleSizes.append(Tensor.Create(size).reshape(3))

        self.Planner = PathPlanner3D(
            center=CENTER,
            size=SIZE,
            resolution=RESOLUTION,
            obstacles=OBSTACLES,
            project_zero=True,
        )
        self.Path = None
        self.SplinePivot = 0.0
        self.GoalTransform = None

        start = self.StartPoint.GetPosition().copy()
        start[1] = 0.0
        root = Transform.TR(
            start, Transform.GetRotation(self.MotionController.Actor.Root)
        )
        self.MotionController.Actor.SetRoot(root)
        self.MotionController.Actor.Entity.SetPosition(start)
        for series in (
            self.MotionController.SimulationObject,
            self.MotionController.RootControl,
        ):
            for i in range(series.SampleCount):
                series.SetPosition(start, i)
                series.SetDirection(Transform.GetAxisZ(root), i)
                series.SetVelocity(Vector3.Zero(), i)

    def SetGuidance(self, index):
        self.GuidanceStyleIndex = index % len(self.MotionController.GuidanceNames)
        self.SelectedGuidanceName = self.MotionController.GuidanceNames[
            self.GuidanceStyleIndex
        ]
        self.GuidancePose = self.MotionController.GuidanceTemplates[
            self.SelectedGuidanceName
        ].Positions.copy()
        if hasattr(self, "GuidanceDropdown"):
            self.GuidanceDropdown.Button.Label = f"Style: {self.SelectedGuidanceName}"

    def GetPivotBySpeed(self, time, speed):
        if self.Path is None or self.Path.Points.shape[0] < 2:
            return None

        path_length = max(self.Path.GetPathLength(), Tensor.EPS)
        total_time = path_length / max(float(speed), Tensor.EPS)
        walked = math.fmod(float(time), 2.0 * total_time) * float(speed)
        percentage = walked / path_length
        if percentage > 1.0:
            percentage = 2.0 - percentage

        resolution = max(2, SPLINE_RESOLUTION)
        self.SplinePivot = percentage
        return self.Path.GetPathPoint(percentage, resolution)

    def Update(self):
        self.Path = self.Planner.Search(
            self.StartPoint.GetPosition(),
            self.GoalPoint.GetPosition(),
            MAX_DEPTH,
        )

        goal = self.GetPivotBySpeed(Time.TotalTime, self.WalkSpeed.GetValue())
        if goal is None:
            return

        self.GoalTransform = goal
        self.MotionController.Update(
            goal, CONTROL_STRENGTH, self.GuidancePose, Time.DeltaTime, self.PredictionFPS
        )

    def Standalone(self):
        AI4Animation.Standalone.Camera.SetTarget(self.MotionController.Actor.Entity)

        self.Panel = AI4Animation.GUI.Canvas(
            "Authoring", 0.79, 0.04, 0.19, 0.38, scale_height=False
        )

        def slider(y, value, min_v, max_v, label, integers=False):
            return AI4Animation.GUI.Slider(
                0.08,
                y,
                0.84,
                0.045,
                value,
                min_v,
                max_v,
                integers=integers,
                canvas=self.Panel,
                label=label,
            )

        def button(y, label, state=True):
            return AI4Animation.GUI.Button(
                label, 0.08, y, 0.84, 0.045, state=state, canvas=self.Panel
            )

        self.WalkSpeed = slider(0.05, WALK_SPEED, 0.1, 3.0, "Walk Speed")
        self.DrawGeometry = button(0.1, "Draw Geometry", False)
        self.DrawPath = button(0.15, "Draw Path", True)
        self.DrawRootControl = button(0.2, "Root Control", False)
        self.DrawGuidanceControl = button(0.25, "Guidance Control", False)
        self.DrawSequences = button(0.3, "Sequences", False)

        for item in (
            self.WalkSpeed,
            self.DrawGeometry,
            self.DrawPath,
            self.DrawRootControl,
            self.DrawGuidanceControl,
            self.DrawSequences,
        ):
            self.Panel.AddItem(item)

        self.GuidanceDropdown = AI4Animation.GUI.Dropdown(
            f"Guidance: {self.SelectedGuidanceName}",
            0.375,
            0.1,
            0.25,
            0.04,
            options=[
                (name, (lambda _idx, i=i: self.SetGuidance(i)))
                for i, name in enumerate(self.MotionController.GuidanceNames)
            ],
        )

    def Draw(self):
        self.MotionController.SimulationObject.Draw()

        if self.DrawRootControl.Active:
            self.MotionController.RootControl.Draw()
        if self.DrawGuidanceControl.Active:
            self.MotionController.GuidanceControl.DrawLegacy(
                self.MotionController.Actor
            )
        if (
            self.DrawSequences.Active
            and self.MotionController.Previous is not None
            and self.MotionController.Sequence is not None
        ):
            self.MotionController.Previous.Draw(
                self.MotionController.Actor, AI4Animation.Color.RED
            )
            self.MotionController.Sequence.Draw(
                self.MotionController.Actor, AI4Animation.Color.GREEN
            )

        self.Planner.Draw(
            path=self.Path,
            draw_geometry=self.DrawGeometry.Active,
            draw_path=self.DrawPath.Active,
            draw_history=False,
            spline_resolution=SPLINE_RESOLUTION,
            spline_pivot=None,
        )

        if self.GoalTransform is not None:
            goal_position = Transform.GetPosition(self.GoalTransform)
            AI4Animation.Draw.Cube(
                goal_position, size=0.15, color=AI4Animation.Color.CYAN
            )
            AI4Animation.Draw.Vector(
                goal_position,
                0.5 * Transform.GetAxisZ(self.GoalTransform),
                size=0.04,
                color=AI4Animation.Color.MAGENTA,
            )

        AI4Animation.Draw.Text3D("Start", self.StartPoint.GetPosition(), size=0.02)
        AI4Animation.Draw.Text3D("Goal", self.GoalPoint.GetPosition(), size=0.02)

    def GUI(self):
        self.Panel.GUI()
        self.StartPoint.DrawHandle()
        self.GoalPoint.DrawHandle()

        self.GuidanceDropdown.Button.Label = f"Style: {self.SelectedGuidanceName}"
        self.GuidanceDropdown.GUI()


if __name__ == "__main__":
    AI4Animation(
        AuthoringProgram(prediction_fps=10),
        mode=AI4Animation.Mode.STANDALONE,
    )
