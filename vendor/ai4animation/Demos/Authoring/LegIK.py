# Copyright (c) Meta Platforms, Inc. and affiliates.
from ai4animation import FABRIK, Rotation, Vector3


class LegIK:
    def __init__(self, ankleIK: FABRIK, ballIK: FABRIK):
        self.AnkleIK = ankleIK
        self.BallIK = ballIK
        ankle_pos = ankleIK.LastBone().GetPosition().copy()
        ball_pos = ballIK.LastBone().GetPosition().copy()
        self.AnkleBaseline: float = ankle_pos[..., 1]
        self.BallBaseline: float = ball_pos[..., 1]
        self.AnkleBallDistance: float = Vector3.Distance(ankle_pos, ball_pos)

        self.AnkleTargetPosition = self.AnkleIK.LastBone().GetPosition()
        self.AnkleTargetRotation = self.AnkleIK.LastBone().GetRotation()
        self.BallTargetPosition = self.BallIK.LastBone().GetPosition()
        self.BallTargetRotation = self.BallIK.LastBone().GetRotation()

    def Solve(
        self,
        ankleContact: float,
        ballContact: float,
        maxIterations: int,
        maxAccuracy: float,
        poleTarget=None,
        poleWeight=1.0,
    ):
        self.SolveAnkle(
            ankleContact, maxIterations, maxAccuracy, poleTarget, poleWeight
        )
        self.SolveBall(ballContact, maxIterations, maxAccuracy)

    def SolveAnkle(
        self,
        contact: float,
        maxIterations: int,
        maxAccuracy: float,
        poleTarget,
        poleWeight,
    ):
        weight = contact
        locked_pos = self.AnkleTargetPosition.copy()
        locked_pos[..., 1] = max(
            Vector3.Lerp(locked_pos[..., 1], self.AnkleBaseline, weight),
            self.AnkleBaseline,
        )

        self.AnkleTargetPosition = Vector3.Lerp(
            self.AnkleIK.LastBone().GetPosition(), locked_pos, weight
        )

        self.AnkleTargetRotation = Rotation.Interpolate(
            self.AnkleIK.LastBone().GetRotation(),
            self.AnkleTargetRotation,
            0.5 * weight,
        )

        self.AnkleIK.Solve(
            self.AnkleTargetPosition,
            self.AnkleTargetRotation,
            maxIterations,
            maxAccuracy,
            poleTarget,
            poleWeight,
        )

    def SolveBall(self, contact: float, maxIterations: int, maxAccuracy: float):
        weight = contact
        locked_pos = self.BallTargetPosition.copy()
        locked_pos[..., 1] = max(
            Vector3.Lerp(locked_pos[..., 1], self.BallBaseline, weight),
            self.BallBaseline,
        )

        self.BallTargetPosition = Vector3.Lerp(
            self.BallIK.LastBone().GetPosition(), locked_pos, weight
        )

        # Enforce ankle-ball distance constraint horizontally to preserve
        # the grounded height computed above.
        grounded_height = self.BallTargetPosition[..., 1]
        direction = self.BallTargetPosition - self.AnkleTargetPosition
        direction[..., 1] = 0.0
        horizontal_dist = Vector3.Length(direction)
        if horizontal_dist > 1e-6:
            direction = Vector3.Normalize(direction)
        else:
            direction = Vector3.UnitX()
        vertical_offset = grounded_height - self.AnkleTargetPosition[..., 1]
        horizontal_reach = max(self.AnkleBallDistance**2 - vertical_offset**2, 0.0)
        self.BallTargetPosition = self.AnkleTargetPosition + (
            horizontal_reach**0.5 * direction
        )
        self.BallTargetPosition[..., 1] = grounded_height

        self.BallTargetRotation = Rotation.Interpolate(
            self.BallIK.LastBone().GetRotation(),
            self.BallTargetRotation,
            0.5 * weight,
        )

        self.BallIK.Solve(
            self.BallTargetPosition,
            self.BallTargetRotation,
            maxIterations,
            maxAccuracy,
        )
