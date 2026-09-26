# Copyright (c) Meta Platforms, Inc. and affiliates.
import math

from ai4animation.Math import Tensor, Vector3


def CheckVisibility(
    point, position, forward, fov=60.0, aspect=16.0 / 9.0, near=0.1, far=1.0
):
    forward = forward / math.sqrt(float((forward * forward).sum()))
    world_up = Vector3.Create(0, 1, 0)
    right = Tensor.Cross(forward, world_up)
    right = right / math.sqrt(float((right * right).sum()))
    up = Tensor.Cross(right, forward)

    diff = point - position
    z = float((diff * forward).sum())
    if z < near or z > far:
        return False

    half_v = math.tan(math.radians(fov) * 0.5)
    half_h = half_v * aspect

    y = float((diff * up).sum())
    if abs(y) > half_v * z:
        return False

    x = float((diff * right).sum())
    if abs(x) > half_h * z:
        return False

    return True
