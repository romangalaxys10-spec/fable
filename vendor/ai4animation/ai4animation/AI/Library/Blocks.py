# Copyright (c) Meta Platforms, Inc. and affiliates.
import torch
from ai4animation.AI.Library import Defaults
from ai4animation.AI.Library.Layers import FiLMLinearLayer, LinearLayer
from ai4animation.AI.Library.Statistics import RunningStatistics

# [..., X] -> [..., Y] via Feed Forward Network
class LinearBlock(torch.nn.Module):
    def __init__(
        self,
        input_size,
        output_size,
        hidden_size,
        dropout=Defaults.Dropout,
        activation=Defaults.Activation,
    ):
        super(LinearBlock, self).__init__()

        self.L1 = LinearLayer(input_size, hidden_size, dropout, activation)
        self.L2 = LinearLayer(hidden_size, hidden_size, dropout, activation)
        self.L3 = LinearLayer(hidden_size, output_size, dropout, None)

    def input_dim(self):
        return self.L1.input_dim()

    def output_dim(self):
        return self.L3.output_dim()

    def forward(self, z):
        z = self.L1(z)
        z = self.L2(z)
        z = self.L3(z)
        return z

# [..., X] -> [..., S, Y] via Time FiLM Embedding with Feed Forward Network
class SequentialBlock(torch.nn.Module):
    def __init__(
        self,
        sequence_length,
        input_size,
        output_size,
        hidden_size,
        dropout=Defaults.Dropout,
        activation=Defaults.Activation,
    ):
        super(SequentialBlock, self).__init__()

        self.SequenceLength = sequence_length
        self.SequenceStatistics = RunningStatistics(1)
        for _ in range(100):
            self.SequenceStatistics.Update(self.timing())

        self.L1 = FiLMLinearLayer(
            input_size, hidden_size, 1, dropout, activation
        )
        self.L2 = FiLMLinearLayer(
            hidden_size, hidden_size, 1, dropout, activation
        )
        self.L3 = FiLMLinearLayer(hidden_size, output_size, 1, dropout, None)

    def input_dim(self):
        return self.L1.input_dim()

    def output_dim(self):
        return self.L3.output_dim()

    def forward(self, z):
        z = z.unsqueeze(1).repeat(1, self.SequenceLength, 1)
        t = self.SequenceStatistics.Normalize(self.timing(z.device))
        t = t.reshape(1, -1, 1).repeat(z.shape[0], 1, 1)
        z = self.L1(z, t)
        z = self.L2(z, t)
        z = self.L3(z, t)
        return z

    def timing(self, device=None):
        if device is not None:
            t = torch.linspace(0.0, 1.0, self.SequenceLength, device=device)
        else:
            t = torch.linspace(0.0, 1.0, self.SequenceLength)
        return t.reshape(-1, 1)

# [..., Sx, X] -> [..., Sy, Y] via two consecutive Feed Forward Networks
class SpaceTimeBlock(torch.nn.Module):
    def __init__(
        self,
        input_dim,
        output_dim,
        hidden_dim,
        source_length,
        target_length,
        dropout,
    ):
        super(SpaceTimeBlock, self).__init__()
        self.Space = LinearBlock(input_dim, output_dim, hidden_dim, dropout)
        self.Time = LinearBlock(source_length, target_length, hidden_dim, dropout)

    def input_dim(self):
        return self.Space.input_dim()

    def output_dim(self):
        return self.Space.output_dim()

    def forward(self, z):
        z = self.Space(z)
        z = z.swapaxes(-1, -2)
        z = self.Time(z)
        z = z.swapaxes(-1, -2)
        return z


class FiLMLinearBlock(torch.nn.Module):
    def __init__(
        self,
        input_size,
        output_size,
        hidden_size,
        film_size,
        dropout=Defaults.Dropout,
        activation=Defaults.Activation,
    ):
        super(FiLMLinearBlock, self).__init__()

        self.L1 = FiLMLinearLayer(
            input_size, hidden_size, film_size, dropout, activation
        )
        self.L2 = FiLMLinearLayer(
            hidden_size, hidden_size, film_size, dropout, activation
        )
        self.L3 = FiLMLinearLayer(hidden_size, output_size, film_size, dropout, None)

    def input_dim(self):
        return self.L1.input_dim()

    def output_dim(self):
        return self.L3.output_dim()

    def film_dim(self):
        return self.L1.film_dim()

    def forward(self, z, film):
        z = self.L1(z, film)
        z = self.L2(z, film)
        z = self.L3(z, film)
        return z
