# Copyright (c) Meta Platforms, Inc. and affiliates.
import threading
from enum import Enum

import numpy as np
from ai4animation import Utility
from ai4animation.AI4Animation import AI4Animation
from ai4animation.Animation.Module import Module
from ai4animation.Animation.Motion import Motion
from ai4animation.Animation.TimeSeries import TimeSeries
from ai4animation.Math import Rotation, Tensor, Transform, Vector3

MAX_WINDOW = 2.0
MAX_NOISE = 0.025
MIN_POWER = 0.0
MAX_POWER = 1.0
MAX_SHIFT = 0.5

class RootModule(Module):
    class Topology(Enum):
        BIPED = "biped"
        QUADRUPED = "quadruped"

    class Reference(Enum):
        GROUND = "ground"
        CENTER = "center"

    def __init__(
        self,
        motion: Motion,
        hip,
        left_hip,
        right_hip,
        left_shoulder,
        right_shoulder,
        neck,
        topology=Topology.BIPED,
        reference=Reference.GROUND,
    ) -> None:
        super().__init__(motion)

        self.RootTopology = (
            topology
            if isinstance(topology, RootModule.Topology)
            else RootModule.Topology(str(topology).lower())
        )

        self.RootReference = reference

        self.BoneIndices = motion.GetBoneIndices(
            [hip, left_hip, right_hip, left_shoulder, right_shoulder, neck]
        )
        (
            self.Hip,
            self.LeftHip,
            self.RightHip,
            self.LeftShoulder,
            self.RightShoulder,
            self.Neck,
        ) = self.BoneIndices

    def Initialize(self):
        self.StandardMatrices = None
        self.MirroredMatrices = None
        self.Lock = threading.Lock()

    def GetName(self):
        return "Root"

    def ComputeSeries(
        self,
        timestamp: float,
        mirrored: bool,
        timeseries: TimeSeries,
        smoothing: TimeSeries = None,
        power: float = 1.0,
        noise: float = 0.0,
    ):
        timestamps = timeseries.SimulateTimestamps(timestamp)
        instance = self.Series(
            timeseries,
            self.GetTransforms(timestamps, mirrored, smoothing, power=power, noise=noise),
            self.GetVelocities(timestamps, mirrored, smoothing, power=power, noise=noise),
        )
        return instance

    def GetTransforms(
        self,
        timestamps,
        mirrored: bool,
        smoothing: TimeSeries = None,
        power: float = 1.0,
        noise: float = 0.0,
    ):
        if smoothing is not None and smoothing.Window > 0.0:
            timestamps = Tensor.Unsqueeze(timestamps, -1) + smoothing.Timestamps
            axis = len(timestamps.shape) - 1

            matrices = self.GetTransforms(timestamps, mirrored)

            positions = Transform.GetPosition(matrices)
            directions = Transform.GetAxisZ(matrices)

            center = positions[..., int((smoothing.SampleCount - 1) / 2), :]
            bias = 2.0
            positions = (
                Tensor.Gaussian(
                    positions - Tensor.Unsqueeze(center, axis),
                    power=power * bias,
                    axis=axis,
                    keepDim=False,
                )
                + center
            )

            angles = Vector3.SignedAngle(
                directions[..., 0:-1, :],
                directions[..., 1:, :],
                Vector3.Create(0, 1, 0),
            ) / (timestamps[..., 1:] - timestamps[..., 0:-1])
            bias = Tensor.Deg2Rad(Tensor.Abs(Tensor.Sum(angles, -1)))
            bias = Tensor.Unsqueeze(bias, -1)
            directions = Tensor.Gaussian(
                directions, power=power * bias, axis=axis, keepDim=False
            )

            matrices = Transform.TR(positions, Rotation.LookPlanar(directions))
        else:
            with self.Lock:
                if self.StandardMatrices is None:
                    self.StandardMatrices = self.Compute(None, False)
                if self.MirroredMatrices is None:
                    self.MirroredMatrices = self.Compute(None, True)
            matrices = self.MirroredMatrices if mirrored else self.StandardMatrices
            matrices = matrices[self.Motion.GetFrameIndices(timestamps)]
            if self.Motion.Scale != 1.0:
                matrices = Transform.Scale(matrices, self.Motion.Scale)
        if noise > 0.0:
            #Position
            delta = noise * np.random.randn(*matrices[..., :3, 3].shape)
            delta[..., 1] = 0.0
            matrices[..., :3, 3] += delta
            #Rotation
            delta = Rotation.RotationY(
                180*noise*Tensor.RandomUniform(matrices.shape[:-2])
            )
            matrices[..., :3, :3] = Rotation.RotationFrom(delta, matrices[..., :3, :3])
        return matrices

    def GetPositions(
        self,
        timestamps,
        mirrored: bool,
        smoothing: TimeSeries = None,
        power: float = 1.0,
        noise: float = 0.0,
    ):
        return Transform.GetPosition(
            self.GetTransforms(timestamps, mirrored, smoothing, power=power, noise=noise)
        )

    def GetRotations(
        self,
        timestamps,
        mirrored: bool,
        smoothing: TimeSeries = None,
        power: float = 1.0,
        noise: float = 0.0,
    ):
        return Transform.GetRotation(
            self.GetTransforms(timestamps, mirrored, smoothing, power=power, noise=noise)
        )

    def GetVelocities(
        self,
        timestamps,
        mirrored: bool,
        smoothing: TimeSeries = None,
        power: float = 1.0,
        noise: float = 0.0,
    ):
        t_previous = Tensor.Clamp(
            timestamps - self.Motion.DeltaTime,
            0.0,
            self.Motion.TotalTime - self.Motion.DeltaTime,
        )
        t_current = Tensor.Clamp(
            timestamps, self.Motion.DeltaTime, self.Motion.TotalTime
        )
        pos_previous = self.GetPositions(t_previous, mirrored, smoothing, power=power, noise=noise)
        pos_current = self.GetPositions(t_current, mirrored, smoothing, power=power, noise=noise)
        return (pos_current - pos_previous) / self.Motion.DeltaTime

    def GetDeltaTransforms(
        self,
        timestamps=None,
        mirrored=False,
        deltaTime=None,
        smoothing: TimeSeries = None,
    ):
        dt = self.Motion.DeltaTime if deltaTime is None else deltaTime
        timestamps = Tensor.Clamp(
            Tensor.Concat((timestamps[..., :1] - dt, timestamps), -1),
            0,
            self.Motion.TotalTime,
        )
        transforms = self.GetTransforms(timestamps, mirrored, smoothing)
        prev = transforms[..., :-1, :, :]
        next = transforms[..., 1:, :, :]
        delta = Transform.TransformationTo(next, prev)
        return delta

    # Returns (dX, dTheta, dZ) if planar=True
    # Returns (dX, dY, dZ, dTheta) if planar=False
    def GetDeltaVectors(
        self,
        timestamps=None,
        mirrored=False,
        deltaTime=None,
        smoothing: TimeSeries = None,
        planar=True,
    ):
        if planar:
            delta = self.GetDeltaTransforms(timestamps, mirrored, deltaTime, smoothing)
            pos = Transform.GetPosition(delta)
            rot = Transform.GetRotation(delta)
            x = pos[..., 0]
            z = pos[..., 2]
            y = Vector3.SignedAngle(Vector3.Z, Rotation.GetAxisZ(rot), Vector3.Y)
            vec = Tensor.Stack((x, y, z), -1)
            return vec
        else:
            delta = self.GetDeltaTransforms(timestamps, mirrored, deltaTime, smoothing)
            pos = Transform.GetPosition(delta)
            rot = Transform.GetRotation(delta)
            x = pos[..., 0]
            y = pos[..., 1]
            z = pos[..., 2]
            w = Vector3.SignedAngle(Vector3.Z, Rotation.GetAxisZ(rot), Vector3.Y)
            vec = Tensor.Stack((x, y, z, w), -1)
            return vec

    def Compute(self, timestamps, mirrored):
        bone_transformations = self.Motion.GetBoneTransformations(
            timestamps=timestamps,
            bone_names_or_indices=self.BoneIndices,
            mirrored=mirrored,
        )
        if self.Motion.Scale != 1.0:
            bone_transformations = Transform.Scale(
                bone_transformations, 1.0 / self.Motion.Scale
            )
        bone_positions = Transform.GetPosition(bone_transformations)
        hip_pos = bone_positions[..., 0, :]
        left_hip_pos = bone_positions[..., 1, :]
        right_hip_pos = bone_positions[..., 2, :]
        left_shoulder_pos = bone_positions[..., 3, :]
        right_shoulder_pos = bone_positions[..., 4, :]
        neck_pos = bone_positions[..., 5, :]

        # root positions
        if self.RootReference == RootModule.Reference.GROUND:
            root_positions = Tensor.ZerosLike(hip_pos)
            root_positions[..., 0] = hip_pos[..., 0]
            root_positions[..., 1] = 0.0
            root_positions[..., 2] = hip_pos[..., 2]
        if self.RootReference == RootModule.Reference.CENTER:
            root_positions = hip_pos

        # root rotations
        up_batch = Tensor.ZerosLike(hip_pos)
        up_batch[..., 1] = 1.0

        if self.RootTopology == RootModule.Topology.QUADRUPED:
            forward_batch = neck_pos - hip_pos
        if self.RootTopology == RootModule.Topology.BIPED:
            hip_batch = left_hip_pos - right_hip_pos
            shoulder_batch = left_shoulder_pos - right_shoulder_pos

            # Project on horizontal plane: v - (v·up)up
            hip_dot_up = Tensor.Unsqueeze(Tensor.Dot(hip_batch, up_batch), -1)
            hip_batch_projected = hip_batch - hip_dot_up * up_batch
            hip_batch_normalized = Tensor.Normalize(hip_batch_projected)
            shoulder_dot_up = Tensor.Unsqueeze(Tensor.Dot(shoulder_batch, up_batch), -1)
            shoulder_batch_projected = shoulder_batch - shoulder_dot_up * up_batch
            shoulder_batch_normalized = Tensor.Normalize(shoulder_batch_projected)

            averaged_batch = (hip_batch_normalized + shoulder_batch_normalized) * 0.5
            averaged_batch_normalized = Tensor.Normalize(averaged_batch)

            forward_batch = Tensor.Cross(averaged_batch_normalized, up_batch)

        # Project forward on horizontal plane and normalize
        forward_dot_up = Tensor.Unsqueeze(Tensor.Dot(forward_batch, up_batch), -1)
        forward_batch = forward_batch - forward_dot_up * up_batch
        forward_batch = Tensor.Normalize(forward_batch)

        root_rotations = Rotation.Look(forward_batch, up_batch)

        return Transform.TR(root_positions, root_rotations)

    def Callback(self, editor):
        if editor.Actor:
            editor.Actor.Root = self.GetTransforms(editor.Timestamp, editor.Mirror)

    def Standalone(self):
        x = 0.325
        y = 0.165
        w = 0.24
        h = 0.04

        y+=0
        self.Slider_SmoothWindow = AI4Animation.GUI.Slider(
            x, y, w/2, h, 0.0, 0.0, MAX_WINDOW, label="Smooth Window"
        )
        self.Slider_SmoothPower = AI4Animation.GUI.Slider(
            x+w/2, y, w/2, h, 1.0, MIN_POWER, MAX_POWER, label="Smooth Power"
        )
        self.Button_SmoothRandomize = AI4Animation.GUI.Button(
            "Random", x+w,y,0.1,h,False,True
        )
        y+=h
        self.Slider_ShiftAmount = AI4Animation.GUI.Slider(
            x, y, w, h, 0.0, 0.0, MAX_SHIFT, label="Shift Amount"
        )
        self.Button_ShiftRandomize = AI4Animation.GUI.Button(
            "Random", x+w,y,0.1,h,False,True
        )
        y+=h
        self.Slider_NoiseAmount = AI4Animation.GUI.Slider(
            x, y, w, h, 0.0, 0.0, MAX_NOISE, label="Noise Amount"
        )
        self.Button_NoiseRandomize = AI4Animation.GUI.Button(
            "Random", x+w,y,0.1,h,False,True
        )

    def GUI(self, editor):
        if Module.Visualize[RootModule]:
            self.Slider_SmoothWindow.GUI()
            self.Slider_SmoothPower.GUI()
            self.Button_SmoothRandomize.GUI()

            self.Slider_ShiftAmount.GUI()
            self.Button_ShiftRandomize.GUI()

            self.Slider_NoiseAmount.GUI()
            self.Button_NoiseRandomize.GUI()

    def Draw(self, editor):
        if Module.Visualize[RootModule]:
            if self.Button_SmoothRandomize.Active:
                self.Slider_SmoothWindow.SetValue(
                    Tensor.RandomUniform(min=0.0, max=MAX_WINDOW)
                )
                self.Slider_SmoothPower.SetValue(
                    Tensor.RandomUniform(min=MIN_POWER, max=MAX_POWER)
                )
            if self.Button_ShiftRandomize.Active:
                self.Slider_ShiftAmount.SetValue(
                    Tensor.RandomUniform(min=0.0, max=MAX_SHIFT)
                )
            if self.Button_NoiseRandomize.Active:
                self.Slider_NoiseAmount.SetValue(
                    Tensor.RandomUniform(min=0.0, max=MAX_NOISE)
                )

            window = self.Slider_SmoothWindow.GetValue()
            power = self.Slider_SmoothPower.GetValue()
            smoothing = (
                TimeSeries(
                    -window / 2,
                    window / 2,
                    editor.TimeSeries.SampleCount,
                )
                if window > 0.0
                else None
            )
            shift = self.Slider_ShiftAmount.GetValue()
            noise = self.Slider_NoiseAmount.GetValue()
            self.ComputeSeries(
                editor.Timestamp,
                editor.Mirror,
                TimeSeries(shift, MAX_SHIFT, editor.TimeSeries.SampleCount),
                smoothing,
                power,
                noise
            ).Draw()

    class Series(TimeSeries):
        def __init__(self, timeSeries, transforms=None, velocities=None):
            super().__init__(timeSeries.Start, timeSeries.End, timeSeries.SampleCount)

            self.Transforms = (
                Transform.Identity(self.SampleCount)
                if transforms is None
                else transforms
            )
            self.Velocities = (
                Vector3.Zero(self.SampleCount) if velocities is None else velocities
            )

        def Draw(
            self,
            start=None,
            end=None,
            drawPositions=True,
            drawDirections=True,
            drawVelocities=True,
            positionColor=None,
            directionColor=None,
            velocityColor=None,
        ):
            start = 0 if start is None else start
            end = self.SampleCount if end is None else end

            positionColor = (
                AI4Animation.Color.BLACK if positionColor is None else positionColor
            )
            directionColor = (
                AI4Animation.Color.ORANGE if directionColor is None else directionColor
            )
            velocityColor = Utility.Opacity(
                AI4Animation.Color.GREEN if velocityColor is None else velocityColor,
                0.5,
            )

            positions = Transform.GetPosition(self.Transforms[start:end])
            directions = Transform.GetAxisZ(self.Transforms[start:end])
            velocities = self.Velocities[start:end]
            AI4Animation.Draw.LineStrip(positions, color=positionColor)
            if drawPositions:
                AI4Animation.Draw.Sphere(positions, size=0.025, color=positionColor)
            if drawDirections:
                AI4Animation.Draw.Cylinder(
                    positions,
                    positions + 0.5 * directions,
                    0.025,
                    0,
                    1,
                    color=directionColor,
                )
            if drawVelocities:
                AI4Animation.Draw.Vector(
                    positions, velocities, 0.025, color=velocityColor
                )

        def SetPosition(self, value, index):
            Transform.SetPosition(self.Transforms, value, index)

        def GetPosition(self, index):
            return Transform.GetPosition(self.Transforms, index)

        def SetDirection(self, value, index):
            Transform.SetRotation(self.Transforms, Rotation.LookPlanar(value), index)

        def GetDirection(self, index):
            return Transform.GetAxisZ(self.Transforms, index)

        def SetVelocity(self, value, index):
            Vector3.SetVector(self.Velocities, value, index)

        def GetVelocity(self, index):
            return Vector3.GetVector(self.Velocities, index)

        def Increment(self, start, end):
            """Shift series samples left in [start, end), matching Unity RootModule.Series."""
            for i in range(start, end):
                self.Transforms[i] = self.Transforms[i + 1].copy()
                self.Velocities[i] = self.Velocities[i + 1].copy()

        def GetLength(self):
            prev = Transform.GetPosition(self.Transforms)[..., :-1, :]
            next = Transform.GetPosition(self.Transforms)[..., 1:, :]
            length = Tensor.Sum(Tensor.Norm(next - prev, keepDim=False))
            return length

        def ClampDistance(self, pivot, distance):
            for index in range(self.SampleCount):
                offset = self.GetPosition(index) - pivot
                horizontal = Vector3.Create(offset[0], 0, offset[2])
                if Vector3.Length(horizontal) > distance:
                    horizontal = distance * Vector3.Normalize(horizontal)
                    self.SetPosition(
                        pivot + Vector3.Create(horizontal[0], offset[1], horizontal[2]),
                        index,
                    )

        def ControlFromTarget(self, start, goal, strength=1.0):
            start_position = Transform.GetPosition(start).copy()
            goal_position = Transform.GetPosition(goal).copy()
            start_position[..., 1] = 0.0
            goal_position[..., 1] = 0.0

            delta = goal_position - start_position
            start_direction = Transform.GetAxisZ(start).copy()
            start_direction[..., 1] = 0.0
            if Vector3.Length(delta) != 0.0:
                goal_direction = delta
            else:
                goal_direction = Transform.GetAxisZ(goal).copy()
                goal_direction[..., 1] = 0.0
            if Vector3.Length(goal_direction) == 0.0:
                goal_direction = start_direction
            if Vector3.Length(start_direction) == 0.0:
                start_direction = goal_direction

            weight = Tensor.Unsqueeze(Tensor.LinSpace(0.0, 1.0, self.SampleCount), -1)
            positions = Vector3.Lerp(start_position, goal_position, weight)
            directions = Vector3.Normalize(
                Vector3.Lerp(start_direction, goal_direction, weight)
            )
            self.Transforms = Transform.TR(positions, Rotation.LookPlanar(directions))
            self.Velocities = Tensor.Repeat(
                (strength * delta / max(self.Window, Tensor.EPS)).reshape(1, 3),
                self.SampleCount,
                0,
            )

        def Control(
            self,
            position,
            direction,
            velocity,
            deltaTime,
            moveSensitivty=10.0,
            turnSensitivity=10.0,
        ):
            pivot = 0
            direction = Vector3.Normalize(direction)
            if Vector3.Length(direction) == 0.0:
                if Vector3.Length(velocity) != 0.0:
                    direction = Vector3.Normalize(velocity)
                else:
                    direction = self.GetDirection(pivot)
            self.SetVelocity(
                Vector3.LerpDt(
                    self.GetVelocity(pivot), velocity, deltaTime, moveSensitivty
                ),
                pivot,
            )
            self.SetPosition(position + self.GetVelocity(pivot) * deltaTime, pivot)
            self.SetDirection(
                Vector3.SlerpDt(
                    self.GetDirection(pivot), direction, deltaTime, turnSensitivity
                ),
                pivot,
            )

            for index in range(pivot + 1, self.SampleCount):
                ratio = Utility.Ratio(index, pivot, self.SampleCount - 1)
                self.SetVelocity(
                    Vector3.LerpDt(
                        self.GetVelocity(index - 1),
                        velocity,
                        self.DeltaTime,
                        ratio * moveSensitivty,
                    ),
                    index,
                )
                self.SetPosition(
                    self.GetPosition(index - 1)
                    + self.GetVelocity(index) * self.DeltaTime,
                    index,
                )
                self.SetDirection(
                    Vector3.Slerp(self.GetDirection(pivot), direction, ratio), index
                )