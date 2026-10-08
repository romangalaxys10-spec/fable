# Copyright (c) Meta Platforms, Inc. and affiliates.

from pathlib import Path
import sys

from ai4animation import AI4Animation, Tensor, Vector3

sys.path.append(str(Path(__file__).resolve().parent.parent))
from PathPlanner3D import PathPlanner3D

CENTER = (0.0, 1.0, 0.0)
SIZE = (10.0, 2.0, 10.0)
RESOLUTION = (12, 1, 12)
MAX_DEPTH = 40
SPLINE_RESOLUTION = 80
SPLINE_PIVOT = 0.5

OBSTACLES = [
    ((0.0, 1.0, 0.0), (2.0, 2.0, 4.0)),
    ((3.0, 1.0, -2.5), (2.0, 2.0, 2.0)),
    ((-3.0, 1.0, 2.5), (2.0, 2.0, 2.0)),
]


class Program:
    def Start(self):
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

    def Standalone(self):
        self.Panel = AI4Animation.GUI.Canvas("PathPlanner3D", 0.765, 0.04, 0.22, 0.84)

        def slider(y, value, min_v, max_v, label, integers=False):
            return AI4Animation.GUI.Slider(
                0.08,
                y,
                0.84,
                0.05,
                value,
                min_v,
                max_v,
                integers=integers,
                canvas=self.Panel,
                label=label,
            )

        def button(y, label, state=True):
            return AI4Animation.GUI.Button(
                label, 0.08, y, 0.84, 0.05, state=state, canvas=self.Panel
            )

        self.SizeX = slider(0.06, SIZE[0], 1.0, 50.0, "Size X")
        self.SizeY = slider(0.12, SIZE[1], 0.5, 20.0, "Size Y")
        self.SizeZ = slider(0.18, SIZE[2], 1.0, 50.0, "Size Z")
        self.ResX = slider(0.25, RESOLUTION[0], 1, 40, "Res X", integers=True)
        self.ResY = slider(0.31, RESOLUTION[1], 1, 20, "Res Y", integers=True)
        self.ResZ = slider(0.37, RESOLUTION[2], 1, 40, "Res Z", integers=True)
        self.MaxDepth = slider(0.44, MAX_DEPTH, 1, 80, "Max Depth", integers=True)
        self.SplineResolution = slider(
            0.50, SPLINE_RESOLUTION, 2, 200, "Spline Res", integers=True
        )
        self.SplinePivot = slider(0.56, SPLINE_PIVOT, 0.0, 1.0, "Spline Pivot")

        self.ProjectZero = button(0.63, "Project Zero", True)
        self.DrawGeometry = button(0.70, "Draw Geometry", True)
        self.DrawPath = button(0.77, "Draw Path", True)
        self.DrawHistory = button(0.84, "Draw History", False)

        for item in (
            self.SizeX,
            self.SizeY,
            self.SizeZ,
            self.ResX,
            self.ResY,
            self.ResZ,
            self.MaxDepth,
            self.SplineResolution,
            self.SplinePivot,
            self.ProjectZero,
            self.DrawGeometry,
            self.DrawPath,
            self.DrawHistory,
        ):
            self.Panel.AddItem(item)

    def Update(self):
        center = self.CenterPoint.GetPosition()
        size = Vector3.Create(
            self.SizeX.GetValue(), self.SizeY.GetValue(), self.SizeZ.GetValue()
        )
        resolution = Vector3.Create(
            self.ResX.GetValue(), self.ResY.GetValue(), self.ResZ.GetValue()
        )
        obstacle_centers = Tensor.Stack(
            [obstacle.GetPosition() for obstacle in self.Obstacles], axis=0
        )
        obstacle_sizes = Tensor.Stack(self.ObstacleSizes, axis=0)

        self.Planner.ProjectZero = self.ProjectZero.Active

        grid_changed = (
            Vector3.Distance(center, self.Planner.Center).item() > 1e-4
            or Vector3.Distance(size, self.Planner.Size).item() > 1e-4
            or Vector3.Distance(resolution, self.Planner.Resolution).item() > 1e-4
            or Vector3.Distance(
                obstacle_centers.reshape(-1),
                self.Planner.ObstacleCenters.reshape(-1),
            ).item()
            > 1e-4
        )
        if grid_changed:
            self.Planner.SetCenter(center, regenerate=False)
            self.Planner.SetSize(size, regenerate=False)
            self.Planner.SetObstacles(obstacle_centers, obstacle_sizes)
            self.Planner.SetResolution(resolution, regenerate=True)

        self.Path = self.Planner.Search(
            self.StartPoint.GetPosition(),
            self.GoalPoint.GetPosition(),
            max(1, int(self.MaxDepth.GetValue())),
        )

    def Draw(self):
        self.Planner.Draw(
            path=self.Path,
            draw_geometry=self.DrawGeometry.Active,
            draw_path=self.DrawPath.Active,
            draw_history=self.DrawHistory.Active,
            spline_resolution=self.SplineResolution.GetValue(),
            spline_pivot=self.SplinePivot.GetValue(),
        )

    def GUI(self):
        self.Panel.GUI()
        self.StartPoint.DrawHandle()
        self.GoalPoint.DrawHandle()
        self.CenterPoint.DrawHandle()
        for obstacle in self.Obstacles:
            obstacle.DrawHandle()


def main():
    AI4Animation(Program(), mode=AI4Animation.Mode.STANDALONE)


if __name__ == "__main__":
    main()
