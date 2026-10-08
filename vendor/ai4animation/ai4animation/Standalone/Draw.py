# Copyright (c) Meta Platforms, Inc. and affiliates.
import math

import raylib as rl
from ai4animation import Utility
from ai4animation.AI4Animation import AI4Animation
from ai4animation.Math import Tensor, Transform as t, Vector3
from raylib.colors import BLACK, BLUE, GREEN, RED, WHITE


def ScreenWidth():
    return rl.GetScreenWidth()


def ScreenHeight():
    return rl.GetScreenHeight()


def SetDepthRendering(value):
    rl.rlDrawRenderBatchActive()
    if value:
        rl.rlEnableDepthTest()
    else:
        rl.rlDisableDepthTest()


def Cube(position, size=0.1, color=BLACK):
    if position.shape[0] == 0:
        return
    position_list = position.reshape(-1, 3).tolist()
    for pos in position_list:
        rl.DrawCube(pos, size, size, size, color)


def Cuboid(position, size, color=BLACK):
    """Draw axis-aligned cuboids. ``size`` is [3] or [N,3] extents (full width)."""
    positions = Tensor.Create(position).reshape(-1, 3)
    if positions.shape[0] == 0:
        return
    sizes = Tensor.Create(size).reshape(-1, 3)
    if sizes.shape[0] == 1 and positions.shape[0] > 1:
        sizes = Tensor.Repeat(sizes, positions.shape[0], 0)
    for pos, extent in zip(positions.tolist(), sizes.tolist()):
        rl.DrawCube(pos, extent[0], extent[1], extent[2], color)


def WireCuboid(position, size, color=BLACK):
    positions = Tensor.Create(position).reshape(-1, 3)
    if positions.shape[0] == 0:
        return
    sizes = Tensor.Create(size).reshape(-1, 3)
    if sizes.shape[0] == 1 and positions.shape[0] > 1:
        sizes = Tensor.Repeat(sizes, positions.shape[0], 0)
    for pos, extent in zip(positions.tolist(), sizes.tolist()):
        rl.DrawCubeWires(pos, extent[0], extent[1], extent[2], color)


# Default is 16 rings (first parameter) and 16 slices (second parameter)
def Sphere(position, size=0.1, resolution=6, color=BLACK):
    if position.shape[0] == 0:
        return
    position_list = position.reshape(-1, 3).tolist()
    for pos in position_list:
        rl.DrawSphereEx(pos, size, resolution, resolution, color)


# Draws a circle in 3D world space. Defaults to lying flat on the XZ plane
# (up-facing) by rotating the default XY-plane circle 90 degrees around the X axis.
def WireCircle(position, size=0.1, axis=(1.0, 0.0, 0.0), angle=90.0, color=BLACK):
    if position.shape[0] == 0:
        return
    position_list = position.reshape(-1, 3).tolist()
    for pos in position_list:
        rl.DrawCircle3D(pos, size, axis, angle, color)


def Line(start, end, color=BLACK):
    start, end = start.reshape(-1, 3), end.reshape(-1, 3)
    for start_pos, end_pos in zip(start.tolist(), end.tolist()):
        rl.DrawLine3D(start_pos, end_pos, color)


def LineStrip(positions, color=BLACK):
    if positions.shape[0] < 2:
        return
    positions_list = positions.tolist()
    for i in range(1, positions.shape[0]):
        rl.DrawLine3D(positions_list[i - 1], positions_list[i], color)


def Plane(position, size, color=BLACK):
    if position.shape[0] == 0:
        return
    position_list = position.tolist()
    size_list = size.tolist()
    for pos in position_list:
        rl.DrawPlane(pos, size_list, color)


def Cylinder(start, end, startSize, endSize, resolution=10, color=BLACK):
    if start.shape[0] == 0:
        return
    start = start.reshape(-1, 3)
    end = end.reshape(-1, 3)
    start_list = start.tolist()
    end_list = end.tolist()
    for start_pos, end_pos in zip(start_list, end_list):
        rl.DrawCylinderEx(start_pos, end_pos, startSize, endSize, resolution, color)


def Quad(a, b, c, d, color):
    for a, b, c, d in zip(a, b, c, d):
        rl.DrawTriangle3D(a.tolist(), b.tolist(), c.tolist(), color)
        rl.DrawTriangle3D(a.tolist(), c.tolist(), d.tolist(), color)
        rl.DrawTriangle3D(c.tolist(), b.tolist(), a.tolist(), color)
        rl.DrawTriangle3D(d.tolist(), c.tolist(), a.tolist(), color)


def Model(model, position, scale, color=WHITE):
    rl.DrawModel(model, position, scale, color)


def Transform(matrix, size=0.1, axisSize=0.25):
    p = t.GetPosition(matrix)
    x = t.GetAxisX(matrix)
    y = t.GetAxisY(matrix)
    z = t.GetAxisZ(matrix)
    Line(p, p + size * axisSize * x, RED)
    Line(p, p + size * axisSize * y, GREEN)
    Line(p, p + size * axisSize * z, BLUE)
    Sphere(p, size=0.05 * size, color=BLACK)
    Sphere(p + size * axisSize * x, size=0.05 * size * axisSize, color=RED)
    Sphere(p + size * axisSize * y, size=0.05 * size * axisSize, color=GREEN)
    Sphere(p + size * axisSize * z, size=0.05 * size * axisSize, color=BLUE)


def Vector(origin, direction, size=0.05, color=BLACK):
    Sphere(origin, size, color=AI4Animation.Color.BLACK)
    Cylinder(origin, origin + direction, size, 0, color=color)


def Text(
    text, x, y, size=1.0, color=WHITE, pivot=0, canvas=None
):  # x and y are between 0 and 1
    text = Utility.ToBytes(text)

    if canvas is not None:
        x = (
            canvas.Rectangle.x + (canvas.Rectangle.width * x)
            if canvas.ScaleWidth
            else x
        )
        y = (
            canvas.Rectangle.y + (canvas.Rectangle.height * y)
            if canvas.ScaleHeight
            else y
        )

    size = int(ScreenHeight() * size)

    w = rl.MeasureText(text, size)
    h = size

    x = ScreenWidth() * x - w * pivot
    y = ScreenHeight() * y

    rl.DrawText(text, int(x), int(y), size, color)


def Text3D(text, position, size=1.0, color=WHITE):
    camera = AI4Animation.Standalone.Camera.Camera
    if not isinstance(text, list):
        text = [text]
    position_list = position.reshape(-1, 3).tolist()
    for i, pos in enumerate(position_list):
        point = rl.GetWorldToScreen(pos, camera)
        x = point.x / ScreenWidth()
        y = point.y / ScreenHeight()
        Text(text[i], x, y, size, color)


def Skeleton(root, positions, actor, bones=None, size: float = 1.0, color=None):
    parent_positions = positions[actor.GetParentIndices(bones)]
    bone_positions = positions[actor.GetBoneIndices(bones)]
    color = AI4Animation.Color.BLACK if color is None else color
    if root is not None:
        Transform(root, 0.5)
    Cylinder(
        parent_positions,
        bone_positions,
        0.02 * size,
        0.0,
        10,
        Utility.Opacity(color, 0.25),
    )


def Frustum(
    position, forward, fov=60.0, aspect=16.0 / 9.0, near=0.1, far=1.0, color=BLACK
):
    forward = forward / math.sqrt(float((forward * forward).sum()))
    world_up = Vector3.Create(0, 1, 0)
    right = Tensor.Cross(forward, world_up)
    right = right / math.sqrt(float((right * right).sum()))
    up = Tensor.Cross(right, forward)

    half_v = math.tan(math.radians(fov) * 0.5)
    half_h = half_v * aspect

    near_h = half_v * near
    near_w = half_h * near
    far_h = half_v * far
    far_w = half_h * far

    near_center = position + forward * near
    far_center = position + forward * far

    ntl = near_center + up * near_h - right * near_w
    ntr = near_center + up * near_h + right * near_w
    nbl = near_center - up * near_h - right * near_w
    nbr = near_center - up * near_h + right * near_w

    ftl = far_center + up * far_h - right * far_w
    ftr = far_center + up * far_h + right * far_w
    fbl = far_center - up * far_h - right * far_w
    fbr = far_center - up * far_h + right * far_w

    Line(ntl, ntr, color)
    Line(ntr, nbr, color)
    Line(nbr, nbl, color)
    Line(nbl, ntl, color)

    Line(ftl, ftr, color)
    Line(ftr, fbr, color)
    Line(fbr, fbl, color)
    Line(fbl, ftl, color)

    Line(ntl, ftl, color)
    Line(ntr, ftr, color)
    Line(nbl, fbl, color)
    Line(nbr, fbr, color)

    # cap = Utility.Opacity(color, 0.5)
    # Quad(ntl, ntr, nbr, nbl, cap)
    # Quad(ftl, ftr, fbr, fbl, cap)
    # fill = Utility.Opacity(color, 0.15)
    # Quad(ntl, ntr, ftr, ftl, fill)
    # Quad(nbl, nbr, fbr, fbl, fill)
    # Quad(ntl, nbl, fbl, ftl, fill)
    # Quad(ntr, nbr, fbr, ftr, fill)
