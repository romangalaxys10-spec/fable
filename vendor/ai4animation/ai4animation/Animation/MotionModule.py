# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Module for extracting per-bone motion features (positions, rotations, velocities)."""

import numpy as np
from ai4animation import Utility
from ai4animation.AI4Animation import AI4Animation
from ai4animation.Animation.Module import Module
from ai4animation.Animation.Motion import Motion
from ai4animation.Animation.RootModule import RootModule
from ai4animation.Animation.TimeSeries import TimeSeries
from ai4animation.Math import Rotation, Tensor, Transform, Vector3, Quaternion

MAX_WINDOW = 2.0
MIN_POWER = 0.0
MAX_POWER = 1.0
MAX_SHIFT = 0.5
MAX_NOISE = 0.025


class MotionModule(Module):
    def __init__(self, motion: Motion) -> None:
        super().__init__(motion)

    def Initialize(self):
        pass

    def GetName(self):
        return "Motion"

    def ComputeSeries(
        self,
        timestamp: float,
        mirrored: bool,
        names: list[str],
        timeseries: TimeSeries,
        smoothing: TimeSeries = None,
        power: float = 1.0,
        noise: float = 0.0,
    ):
        timestamps = timeseries.SimulateTimestamps(timestamp)
        transforms = self.GetTransforms(
            timestamps, mirrored, names, smoothing, power, noise
        )
        velocities = self.GetVelocities(
            timestamps, mirrored, names, smoothing, power, noise
        )
        instance = self.Series(
            timeseries, names, transforms, velocities
        )
        return instance

    def GetTransforms(
        self,
        timestamps,
        mirrored,
        names,
        smoothing: TimeSeries = None,
        power: float = 1.0,
        noise: float = 0.0,
    ):
        if smoothing is not None and smoothing.Window > 0.0:
            curves = Transform.Normalize(
                self.SmoothCurves(
                    self.Motion.GetBoneTransformations,
                    timestamps,
                    mirrored,
                    names,
                    smoothing,
                    power,
                )
            )
        else:
            curves = self.Motion.GetBoneTransformations(timestamps, names, mirrored)
        if noise > 0.0:
            # Position
            curves[..., :3, 3] += noise * np.random.randn(*curves[..., :3, 3].shape)
            # Rotation
            angles = 180 * noise * Tensor.RandomUniform((*curves.shape[:-2], 3))
            delta = Rotation.Euler(angles)
            curves[..., :3, :3] = Rotation.RotationFrom(delta, curves[..., :3, :3])
        return curves

    def GetPositions(
        self,
        timestamps,
        mirrored,
        names,
        smoothing: TimeSeries = None,
        power: float = 1.0,
        noise: float = 0.0,
    ):
        if smoothing is not None and smoothing.Window > 0.0:
            curves = self.SmoothCurves(
                self.Motion.GetBonePositions,
                timestamps,
                mirrored,
                names,
                smoothing,
                power,
            )
        else:
            curves = self.Motion.GetBonePositions(timestamps, names, mirrored)
        if noise > 0.0:
            curves += noise * np.random.randn(*curves.shape)
        return curves

    def GetRotations(
        self,
        timestamps,
        mirrored,
        names,
        smoothing: TimeSeries = None,
        power: float = 1.0,
        noise: float = 0.0,
    ):
        if smoothing is not None and smoothing.Window > 0.0:
            curves = Rotation.Normalize(
                self.SmoothCurves(
                    self.Motion.GetBoneRotations,
                    timestamps,
                    mirrored,
                    names,
                    smoothing,
                    power,
                )
            )
        else:
            curves = self.Motion.GetBoneRotations(timestamps, names, mirrored)
        if noise > 0.0:
            angles = 180 * noise * Tensor.RandomUniform((*curves.shape[:-2], 3))
            delta = Rotation.Euler(angles)
            curves = Rotation.RotationFrom(delta, curves)
        return curves

    def GetVelocities(
        self,
        timestamps,
        mirrored,
        names,
        smoothing: TimeSeries = None,
        power: float = 1.0,
        noise: float = 0.0,
    ):
        dt = self.Motion.DeltaTime
        a = self.GetPositions(
            timestamps - dt,
            mirrored,
            names,
            smoothing,
            power,
            noise,
        )
        b = self.GetPositions(
            timestamps,
            mirrored,
            names,
            smoothing,
            power,
            noise,
        )
        return (b - a) / dt

    def SmoothCurves(self, fn, timestamps, mirrored, names, smoothing, power):
        axis = len(timestamps.shape)
        timestamps = Tensor.Unsqueeze(timestamps, -1)
        timestamps = timestamps + smoothing.Timestamps
        values = fn(timestamps, names, mirrored)
        values = Tensor.Gaussian(
            values,
            power=power,
            axis=axis,
            keepDim=False,
        )
        return values

    def Standalone(self):
        x = 0.325
        y = 0.165
        w = 0.24
        h = 0.04

        y += 0
        self.Slider_SmoothWindow = AI4Animation.GUI.Slider(
            x, y, w / 2, h, 0.0, 0.0, MAX_WINDOW, label="Smooth Window"
        )
        self.Slider_SmoothPower = AI4Animation.GUI.Slider(
            x + w / 2, y, w / 2, h, 1.0, MIN_POWER, MAX_POWER, label="Smooth Power"
        )
        self.Button_SmoothRandomize = AI4Animation.GUI.Button(
            "Random", x + w, y, 0.1, h, False, True
        )

        y += h
        self.Slider_ShiftAmount = AI4Animation.GUI.Slider(
            x, y, w, h, 0.0, 0.0, MAX_SHIFT, label="Shift Amount"
        )
        self.Button_ShiftRandomize = AI4Animation.GUI.Button(
            "Random", x + w, y, 0.1, h, False, True
        )

        y += h
        self.Slider_NoiseAmount = AI4Animation.GUI.Slider(
            x, y, w, h, 0.0, 0.0, MAX_NOISE, label="Noise Amount"
        )
        self.Button_NoiseRandomize = AI4Animation.GUI.Button(
            "Random", x + w, y, 0.1, h, False, True
        )

    def GUI(self, editor):
        if Module.Visualize[MotionModule]:
            self.Slider_SmoothWindow.GUI()
            self.Slider_SmoothPower.GUI()
            self.Button_SmoothRandomize.GUI()

            self.Slider_ShiftAmount.GUI()
            self.Button_ShiftRandomize.GUI()

            self.Slider_NoiseAmount.GUI()
            self.Button_NoiseRandomize.GUI()

    def Draw(self, editor):
        if Module.Visualize[MotionModule]:
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
            # window = np.power(window / MAX_WINDOW, 5.0) * MAX_WINDOW
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
            series = self.ComputeSeries(
                editor.Timestamp,
                editor.Mirror,
                editor.Actor.GetBoneNames(),
                TimeSeries(shift, MAX_SHIFT, 16),
                smoothing,
                power,
                noise,
            )
            series.Draw()

    class Series(TimeSeries):
        def __init__(self, timeSeries, names, transforms=None, velocities=None):
            super().__init__(timeSeries.Start, timeSeries.End, timeSeries.SampleCount)
            self.Names = names
            self.NameToIndexMap = {}
            for i in range(len(names)):
                self.NameToIndexMap[names[i]] = i

            self.Transforms = (
                Transform.Identity((self.SampleCount, self.TrajectoryCount))
                if transforms is None
                else transforms
            )
            self.Velocities = (
                Vector3.Zero((self.SampleCount, self.TrajectoryCount))
                if velocities is None
                else velocities
            )

        @property
        def TrajectoryCount(self) -> int:
            return len(self.Names)

        def GetTransforms(self, bone_names=None, start=None, end=None):
            start = 0 if start is None else start
            end = self.SampleCount if end is None else end

            if bone_names == None:
                return self.Transforms[start:end]
            else:
                bone_indices = [self.NameToIndexMap[name] for name in bone_names]
                return self.Transforms[start:end, bone_indices, :, :]

        def GetPositions(self, bone_names=None, start=None, end=None):
            return Transform.GetPosition(self.GetTransforms(bone_names, start, end))

        def GetRotations(self, bone_names=None, start=None, end=None):
            return Transform.GetRotation(self.GetTransforms(bone_names, start, end))

        def GetVelocities(self, bone_names=None, start=None, end=None):
            start = 0 if start is None else start
            end = self.SampleCount if end is None else end

            if bone_names == None:
                return self.Velocities[start:end]
            else:
                bone_indices = [self.NameToIndexMap[name] for name in bone_names]
                return self.Velocities[start:end, bone_indices, :]

        def ClampDistance(self, pivot, distance):
            for index in range(self.SampleCount):
                for bone in range(self.TrajectoryCount):
                    offset = Transform.GetPosition(self.Transforms[index, bone]) - pivot
                    horizontal = Vector3.Create(offset[0], 0, offset[2])
                    if Vector3.Length(horizontal) > distance:
                        horizontal = distance * Vector3.Normalize(horizontal)
                        self.Transforms[index, bone, :3, 3] = pivot + Vector3.Create(
                            horizontal[0], offset[1], horizontal[2]
                        )

        def Draw(
            self,
            start=None,
            end=None,
            thickness=1.0,
            drawConnections=True,
            drawPositions=True,
            drawRotations=True,
            drawVelocities=True,
            positionColor=None,
            rotationColor=None,
            velocityColor=None,
            actor=None,
        ):
            start = 0 if start is None else start
            end = self.SampleCount if end is None else end

            if actor is None:
                for i, _ in enumerate(self.Names):
                    transforms = self.Transforms[start:end, i]
                    positions = Transform.GetPosition(transforms)
                    rotations = Transform.GetRotation(transforms)
                    velocities = self.Velocities[start:end, i]
                    pColor = (
                        AI4Animation.Color.BLACK
                        if positionColor is None
                        else positionColor
                    )
                    vColor = Utility.Opacity(
                        (
                            AI4Animation.Color.GREEN
                            if velocityColor is None
                            else velocityColor
                        ),
                        0.5,
                    )
                    if drawConnections:
                        AI4Animation.Draw.LineStrip(positions, color=pColor)
                    if drawPositions:
                        AI4Animation.Draw.Sphere(
                            positions, 0.02 * thickness, color=pColor
                        )
                    if drawRotations:
                        AI4Animation.Draw.Transform(
                            transforms, 0.2 * thickness, 0.4 * thickness
                        )
                    if drawVelocities:
                        AI4Animation.Draw.Vector(
                            positions, velocities, 0.005 * thickness, color=vColor
                        )
            else:
                for i in range(start, end, 1):
                    AI4Animation.Draw.Skeleton(
                        None,
                        Transform.GetPosition(self.Transforms[i]),
                        actor,
                        bones=self.Names,
                    )
