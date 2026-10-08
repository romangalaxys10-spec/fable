# Copyright (c) Meta Platforms, Inc. and affiliates.
"""3D voxel grid path planning with Catmull-Rom path sampling."""

import heapq
import math

from ai4animation import Utility
from ai4animation.AI4Animation import AI4Animation
from ai4animation.Math import Rotation, Spline, Tensor, Transform, Vector3

_NEIGHBOR_OFFSETS = Tensor.Create(
    [
        [dx, dy, dz]
        for dz in (-1, 0, 1)
        for dy in (-1, 0, 1)
        for dx in (-1, 0, 1)
        if not (dx == 0 and dy == 0 and dz == 0)
    ]
)


class Path:
    History = None

    def __init__(self, points):
        self.Points = Tensor.Create(points).reshape(-1, 3)

    def GetPathPoint(self, percentage, resolution):
        step = 1.0 / max(int(resolution) - 1, 1)
        position = Spline.GetPointOnSpline(self.Points, percentage)
        tangent = (
            Spline.GetPointOnSpline(
                self.Points, Utility.Clamp(percentage + step, 0.0, 1.0)
            )
            - position
        )
        if float(Tensor.Norm(tangent, keepDim=False)) < Tensor.EPS:
            rotation = Rotation.Identity()
        else:
            rotation = Rotation.LookPlanar(tangent)
        return Transform.TR(position, rotation)

    def GetPathPoints(self, resolution):
        return Spline.GetPointsOnSpline(self.Points, int(resolution))

    def GetPathLength(self):
        points = self.Points
        if points.shape[0] < 2:
            return 0.0
        deltas = points[1:] - points[:-1]
        lengths = Tensor.Norm(deltas, keepDim=False)
        return float(Tensor.Sum(lengths, axis=0, keepDim=False))

    def Draw(self, history=False, planner=None):
        points = self.Points
        if points.shape[0] == 0:
            return

        AI4Animation.Draw.Cube(
            points[:1], size=0.15, color=AI4Animation.Color.BLUE
        )
        AI4Animation.Draw.Cube(
            points[-1:], size=0.15, color=AI4Animation.Color.BLUE
        )
        if points.shape[0] > 1:
            AI4Animation.Draw.Cylinder(
                points[:-1],
                points[1:],
                0.025,
                0.025,
                color=AI4Animation.Color.GREEN,
            )

        if history and planner is not None and Path.History is not None:
            visited = Path.History > 0.0
            if float(Tensor.Sum(visited, keepDim=False)) > 0.0:
                AI4Animation.Draw.Cuboid(
                    planner.Positions[visited],
                    planner.Volume,
                    color=Utility.Opacity(AI4Animation.Color.BLACK, 0.5),
                )

    @staticmethod
    def ManhattanDistance(a_coords, b_coords):
        return int(Tensor.Sum(Tensor.Abs(a_coords - b_coords), keepDim=False))

    @staticmethod
    def GetShortestPath(
        planner,
        source,
        target,
        max_search_depth,
        cost,
        termination,
        start_position=None,
        goal_position=None,
    ):
        n = planner.Count
        parent = Tensor.Zeros(n) - 1.0
        depth = Tensor.Zeros(n)
        costs = Tensor.Zeros(n) + float("inf")
        visited = Tensor.Zeros(n)

        best = int(source)
        costs[best] = (
            float(cost(best, target)) if planner.Walkable[best] else float("inf")
        )

        counter = 0
        candidates = []
        heapq.heappush(candidates, (float(costs[best]), counter, best))
        queued = {best}
        Path.History = visited

        while candidates:
            _, _, current = heapq.heappop(candidates)
            queued.discard(current)
            if visited[current] > 0.0:
                continue
            visited[current] = 1.0

            if costs[current] < costs[best]:
                best = current

            if termination(best, target):
                break

            if int(depth[current]) == max_search_depth:
                continue

            if not planner.Walkable[target]:
                if depth[current] < depth[best] and costs[current] > costs[best]:
                    continue
                if (
                    current != best
                    and int(depth[current])
                    + Path.ManhattanDistance(
                        planner.Coordinates[current], planner.Coordinates[target]
                    )
                    > max_search_depth
                ):
                    continue

            neighbors = planner.GetNeighborIndices(current)
            for neighbor in neighbors:
                neighbor = int(neighbor)
                if visited[neighbor] > 0.0 or neighbor in queued:
                    continue
                parent[neighbor] = float(current)
                depth[neighbor] = depth[current] + 1.0
                costs[neighbor] = float(cost(neighbor, target))
                counter += 1
                heapq.heappush(candidates, (float(costs[neighbor]), counter, neighbor))
                queued.add(neighbor)

        chain = []
        pivot = best
        while pivot >= 0:
            chain.append(Tensor.Copy(planner.Positions[pivot]))
            pivot = int(parent[pivot])
        chain.reverse()

        points = []
        if start_position is not None:
            points.append(Tensor.Create(start_position).reshape(3))
        points.extend(chain)
        if goal_position is not None:
            points.append(Tensor.Create(goal_position).reshape(3))

        if len(points) == 0:
            points = [Tensor.Copy(planner.Positions[best])]

        path = Tensor.Stack(points, axis=0)
        if planner.ProjectZero:
            path = Tensor.Copy(path)
            path[:, 1] = 0.0
        return Path(path)


class PathPlanner3D:
    def __init__(
        self,
        center=None,
        size=None,
        resolution=(10, 10, 10),
        obstacles=None,
        project_zero=False,
    ):
        self.Center = (
            Vector3.Create(0, 0, 0) if center is None else Tensor.Create(center)
        ).reshape(3)
        self.Size = (
            Vector3.Create(10, 10, 10) if size is None else Tensor.Create(size)
        ).reshape(3)
        self.Resolution = Tensor.Create(resolution).reshape(3)
        self.ProjectZero = project_zero

        if obstacles is None or len(obstacles) == 0:
            self.ObstacleCenters = Tensor.Zeros(0, 3)
            self.ObstacleSizes = Tensor.Zeros(0, 3)
        else:
            centers, sizes = zip(*obstacles)
            self.ObstacleCenters = Tensor.Create(centers).reshape(-1, 3)
            self.ObstacleSizes = Tensor.Create(sizes).reshape(-1, 3)

        self.Coordinates = None
        self.Positions = None
        self.Walkable = None
        self.Volume = None
        self.Generate()

    @property
    def Count(self):
        return 0 if self.Positions is None else int(self.Positions.shape[0])

    def AddObstacle(self, center, size):
        self.ObstacleCenters = Tensor.Concat(
            (self.ObstacleCenters, Tensor.Create(center).reshape(1, 3)), axis=0
        )
        self.ObstacleSizes = Tensor.Concat(
            (self.ObstacleSizes, Tensor.Create(size).reshape(1, 3)), axis=0
        )

    def ClearObstacles(self):
        self.ObstacleCenters = Tensor.Zeros(0, 3)
        self.ObstacleSizes = Tensor.Zeros(0, 3)

    def SetObstacles(self, centers, sizes):
        self.ObstacleCenters = Tensor.Create(centers).reshape(-1, 3)
        self.ObstacleSizes = Tensor.Create(sizes).reshape(-1, 3)

    def SetCenter(self, center, regenerate=True):
        self.Center = Tensor.Create(center).reshape(3)
        if regenerate:
            self.Generate()

    def SetSize(self, size, regenerate=True):
        self.Size = Tensor.Maximum(Tensor.Create(size).reshape(3), Vector3.One() * Tensor.EPS)
        if regenerate:
            self.Generate()

    def SetResolution(self, resolution, regenerate=True):
        self.Resolution = Tensor.Maximum(Tensor.Create(resolution).reshape(3), Vector3.One())
        if regenerate:
            self.Generate()

    def Generate(self):
        rx = max(1, int(round(float(self.Resolution[0]))))
        ry = max(1, int(round(float(self.Resolution[1]))))
        rz = max(1, int(round(float(self.Resolution[2]))))
        self.Resolution = Tensor.Create([rx, ry, rz])

        indices = Tensor.Arange(0, rx * ry * rz, 1)
        xx = indices % rx
        yy = (indices // rx) % ry
        zz = indices // (rx * ry)
        self.Coordinates = Tensor.Stack((xx, yy, zz), axis=-1)

        resolution = Tensor.Maximum(self.Resolution, Vector3.One())
        self.Volume = self.Size / resolution

        half = 0.5 * self.Size
        min_inner = self.Center - half + 0.5 * self.Volume
        max_inner = self.Center + half - 0.5 * self.Volume
        denom = Tensor.Maximum(self.Resolution - 1.0, Vector3.One())
        t = Tensor.Create(self.Coordinates) / denom
        # Single-cell axes sit at the grid center.
        t = Tensor.Where(self.Resolution <= 1.0, 0.5, t)
        self.Positions = min_inner + t * (max_inner - min_inner)
        self.Walkable = ~self.OverlapsObstacles(self.Positions)

    def Search(self, start, end, max_search_depth, distance_to_target=None):
        source = self.GetClosestIndex(start)
        target = self.GetClosestIndex(end)

        if distance_to_target is None:

            def cost(index, target_index):
                return float(
                    Tensor.Norm(
                        self.Positions[index] - self.Positions[target_index],
                        keepDim=False,
                    )
                )

            def termination(index, target_index):
                return index == target_index

        else:
            radius = float(
                (
                    self.Volume[0]
                    * self.Volume[1]
                    * self.Volume[2]
                    * (3.0 / 4.0)
                    / math.pi
                )
                ** (1.0 / 3.0)
            )

            def cost(index, target_index):
                distance = float(
                    Tensor.Norm(
                        self.Positions[index] - self.Positions[target_index],
                        keepDim=False,
                    )
                )
                return abs(distance - distance_to_target)

            def termination(index, target_index):
                distance = float(
                    Tensor.Norm(
                        self.Positions[index] - self.Positions[target_index],
                        keepDim=False,
                    )
                )
                return (
                    distance_to_target - radius
                    <= distance
                    <= distance_to_target + radius
                )

        return Path.GetShortestPath(
            self,
            source,
            target,
            int(max_search_depth),
            cost,
            termination,
            start_position=start,
            goal_position=end,
        )

    def CoordsToIndex(self, coords):
        coords = Tensor.ToInt(Tensor.Create(coords))
        rx, ry = int(self.Resolution[0]), int(self.Resolution[1])
        return coords[..., 2] * ry * rx + coords[..., 1] * rx + coords[..., 0]

    def GetClosestIndex(self, position):
        position = Tensor.Create(position).reshape(3)
        half = 0.5 * self.Size
        min_bound = self.Center - half
        max_bound = self.Center + half
        clamped = Tensor.Clamp(position, min_bound, max_bound)
        span = Tensor.Maximum(max_bound - min_bound, Tensor.EPS)
        normalized = (clamped - min_bound) / span
        coords = Tensor.ToInt(Tensor.Round(normalized * (self.Resolution - 1.0)))
        coords = Tensor.ToInt(Tensor.Clamp(coords, 0, self.Resolution - 1.0))
        return int(self.CoordsToIndex(coords))

    def GetNeighborIndices(self, index):
        coords = Tensor.Create(self.Coordinates[int(index)]) + _NEIGHBOR_OFFSETS
        valid = (Tensor.Sum(coords >= 0.0, axis=1, keepDim=False) == 3) & (
            Tensor.Sum(coords < self.Resolution, axis=1, keepDim=False) == 3
        )
        if float(Tensor.Sum(valid, keepDim=False)) == 0.0:
            return Tensor.Zeros(0)
        indices = self.CoordsToIndex(coords[valid])
        return indices[self.Walkable[indices]]

    def GetBlockedPositions(self):
        if self.Count == 0:
            return Tensor.Zeros(0, 3)
        return self.Positions[~self.Walkable]

    def Draw(
        self,
        path=None,
        draw_geometry=True,
        draw_path=True,
        draw_history=False,
        spline_resolution=None,
        spline_pivot=None,
    ):
        from ai4animation.AI4Animation import AI4Animation

        AI4Animation.Draw.WireCuboid(
            self.Center, self.Size, color=AI4Animation.Color.CYAN
        )

        if self.ObstacleCenters.shape[0] > 0:
            AI4Animation.Draw.SetDepthRendering(True)
            AI4Animation.Draw.Cuboid(
                self.ObstacleCenters,
                self.ObstacleSizes,
                color=Utility.Opacity(AI4Animation.Color.ORANGE, 1.0),
            )
            AI4Animation.Draw.SetDepthRendering(False)
        if draw_geometry:
            # AI4Animation.Draw.Cuboid(
            #     self.Positions[self.Walkable],
            #     self.Volume,
            #     color=Utility.Opacity(AI4Animation.Color.WHITE, 0.05),
            # )
            blocked = self.GetBlockedPositions()
            if blocked.shape[0] > 0:
                AI4Animation.Draw.Cuboid(
                    blocked,
                    self.Volume,
                    color=Utility.Opacity(AI4Animation.Color.WHITE, 0.5),
                )

        if path is None or not draw_path:
            return

        path.Draw(history=draw_history, planner=self)

        if spline_resolution is None:
            return

        resolution = max(2, int(spline_resolution))
        spline = path.GetPathPoints(resolution)
        AI4Animation.Draw.Sphere(spline, size=0.05, color=AI4Animation.Color.MAGENTA)

        if spline_pivot is None:
            return

        pivot = path.GetPathPoint(float(spline_pivot), resolution)
        AI4Animation.Draw.Sphere(
            Transform.GetPosition(pivot), size=0.12, color=AI4Animation.Color.CYAN
        )
        AI4Animation.Draw.Vector(
            Transform.GetPosition(pivot),
            0.5 * Transform.GetAxisZ(pivot),
            size=0.04,
            color=AI4Animation.Color.CYAN,
        )

    def OverlapsObstacles(self, positions):
        positions = Tensor.Create(positions).reshape(-1, 3)
        if self.ObstacleCenters.shape[0] == 0:
            return Tensor.Zeros(positions.shape[0]) > 0.0

        half_voxel = 0.5 * self.Volume
        half_obstacle = 0.5 * self.ObstacleSizes
        # [N, M, 3] absolute offsets from each voxel to each obstacle center.
        delta = Tensor.Abs(
            Tensor.Unsqueeze(positions, 1) - Tensor.Unsqueeze(self.ObstacleCenters, 0)
        )
        overlap = (
            Tensor.Sum(
                delta <= Tensor.Unsqueeze(half_voxel + half_obstacle, 0),
                axis=-1,
                keepDim=False,
            )
            == 3
        )
        return Tensor.Sum(overlap, axis=-1, keepDim=False) > 0
