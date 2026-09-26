# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Module for computing bone contact labels based on velocity thresholds."""

from ai4animation import Utility
from ai4animation.AI4Animation import AI4Animation
from ai4animation.Animation.Module import Module
from ai4animation.Animation.Motion import Motion
from ai4animation.Animation.TimeSeries import TimeSeries
from ai4animation.Math import Tensor


class ContactModule(Module):
    def __init__(
        self, motion: Motion, configs, proportional=False
    ) -> None:  # Each config is a tuple of (boneName, velocityThreshold)
        super().__init__(motion)

        self.Configs = configs
        self.BoneNames = [config[0] for config in configs]
        self.BoneIndices = self.Motion.GetBoneIndices(self.BoneNames)
        self.VelocityThresholds = [config[1] for config in configs]
        self.Proportional = proportional

        for config in configs:
            if len(config) != 2:
                print(
                    "ContactModule config length did not have expected tuple size of 2 for (boneName, velocityThreshold)"
                )

    def Initialize(self):
        pass

    def GetName(self):
        return "Contact"

    def ComputeSeries(
        self,
        timestamp: float,
        mirrored: bool,
        timeseries: TimeSeries,
    ):
        timestamps = timeseries.SimulateTimestamps(timestamp)
        instance = self.Series(
            timeseries,
            self.BoneNames,
            self.GetContacts(timestamps, mirrored),
        )
        return instance

    def GUI(self, editor):
        if Module.Visualize[ContactModule]:
            self.ComputeSeries(editor.Timestamp, editor.Mirror, editor.TimeSeries).GUI(
                0.3, 0.9, 0.4, 0.05
            )

    def Draw(self, editor):
        if Module.Visualize[ContactModule]:
            timestamps = editor.TimeSeries.SimulateTimestamps(editor.Timestamp)
            positions = self.Motion.GetBonePositions(
                timestamps, self.BoneIndices, editor.Mirror
            ).reshape(-1, 3)
            contacts = self.GetContacts(timestamps, editor.Mirror).reshape(-1, 1)
            for i in range(contacts.shape[0]):
                if contacts[i]:
                    AI4Animation.Draw.Sphere(
                        positions[i],
                        size=0.04,
                        color=Utility.Opacity(AI4Animation.Color.GREEN, 0.5),
                    )
                else:
                    AI4Animation.Draw.Sphere(
                        positions[i],
                        size=0.02,
                        color=Utility.Opacity(AI4Animation.Color.BLACK, 0.25),
                    )

    def GetContacts(self, timestamps, mirrored):
        velocities = self.Motion.GetBoneVelocities(
            timestamps, self.BoneIndices, mirrored
        )
        velocities = Tensor.Norm(velocities, keepDim=False)
        if self.Proportional:
            lengths = self.Motion.GetBoneLengths(
                timestamps=timestamps, mirrored=mirrored
            )
            scales = Tensor.Sum(lengths, axis=-2, keepDim=False)
        else:
            scales = 1
        return velocities < (self.VelocityThresholds * scales)

    class Series(TimeSeries):
        def __init__(self, timeSeries, names, values=None):
            super().__init__(timeSeries.Start, timeSeries.End, timeSeries.SampleCount)
            self.Names = names
            self.Values = (
                Tensor.Zeros((self.SampleCount, len(self.Names)))
                if values is None
                else values
            )

        def GUI(self, x=0.3, y=0.94, width=0.4, height=0.05):
            AI4Animation.GUI.BarPlot(
                x,
                y,
                width,
                height,
                Tensor.SwapAxes(self.Values, 0, 1),
                label="Contacts",
                colors=[AI4Animation.Color.GREEN],
            )

        def Draw(self):
            pass
