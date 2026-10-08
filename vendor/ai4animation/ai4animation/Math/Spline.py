# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Catmull-Rom spline sampling for positions, rotations, and transforms."""

from ai4animation.Math import Quaternion, Rotation, Tensor, Transform, Vector3

def _CatmullRom(positions, percentages):
    positions = Tensor.Create(positions).reshape(-1, 3)
    percentages = Tensor.Clamp(Tensor.Create(percentages).reshape(-1), 0.0, 1.0)

    count = positions.shape[0]
    if count == 0:
        return Tensor.Zeros(percentages.shape[0], 3)
    if count == 1:
        return Tensor.Repeat(positions[:1], percentages.shape[0], 0)

    padded = Tensor.Concat((positions[:1], positions, positions[-1:]), axis=0)
    num_sections = padded.shape[0] - 3
    scaled = percentages * float(num_sections)
    cur_point = Tensor.ToInt(Tensor.Minimum(scaled, float(num_sections - 1)))
    t = (scaled - Tensor.Create(cur_point)).reshape(-1, 1)
    t2 = t * t
    t3 = t2 * t

    p0 = padded[cur_point]
    p1 = padded[cur_point + 1]
    p2 = padded[cur_point + 2]
    p3 = padded[cur_point + 3]
    return 0.5 * (
        2.0 * p1
        + (-p0 + p2) * t
        + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2
        + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3
    )

def _Percentages(resolution):
    resolution = int(resolution)
    if resolution < 1:
        raise ValueError("resolution must be >= 1")
    if resolution == 1:
        return Tensor.Create([0.0])
    return Tensor.LinSpace(0.0, 1.0, resolution, axis=-1)


def GetPointOnSpline(positions, percentage):
    if isinstance(percentage, (float, int)):
        return _CatmullRom(positions, [percentage])[0]
    return _CatmullRom(positions, percentage)

def GetPointOnSplineRotation(rotations, percentage):
    forwards = Rotation.GetAxisZ(rotations)
    ups = Rotation.GetAxisY(rotations)
    return Rotation.Look(
        Vector3.Normalize(GetPointOnSpline(forwards, percentage)),
        Vector3.Normalize(GetPointOnSpline(ups, percentage)),
    )

def GetPointOnSplineQuaternion(quaternions, percentage):
    return Quaternion.FromMatrix(
        GetPointOnSplineRotation(Quaternion.ToMatrix(quaternions), percentage)
    )

def GetPointOnSplineTransform(transforms, percentage):
    return Transform.TR(
        GetPointOnSpline(Transform.GetPosition(transforms), percentage),
        GetPointOnSplineRotation(Transform.GetRotation(transforms), percentage),
    )

def GetPointsOnSpline(positions, resolution):
    return _CatmullRom(positions, _Percentages(resolution))

def GetPointsOnSplineTransform(transforms, resolution):
    return Transform.TR(
        GetPointsOnSpline(Transform.GetPosition(transforms), resolution),
        GetPointsOnSplineRotation(Transform.GetRotation(transforms), resolution),
    )

def GetPointsOnSplineQuaternion(quaternions, resolution):
    return Quaternion.FromMatrix(
        GetPointsOnSplineRotation(Quaternion.ToMatrix(quaternions), resolution)
    )

def GetPointsOnSplineRotation(rotations, resolution):
    percentages = _Percentages(resolution)
    forwards = Rotation.GetAxisZ(rotations)
    ups = Rotation.GetAxisY(rotations)
    return Rotation.Look(
        Vector3.Normalize(_CatmullRom(forwards, percentages)),
        Vector3.Normalize(_CatmullRom(ups, percentages)),
    )
