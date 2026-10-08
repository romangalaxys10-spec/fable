# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Synthetic data generators for testing generative models."""

import torch
from sklearn.datasets import make_moons


def SquareFunctions(samples, resolution, min=0.0, max=1.0):
    X = (max - min) * torch.rand(samples).reshape(-1, 1) + min
    Y = X * torch.pow(torch.linspace(-1, 1, steps=resolution), 2.0)
    return X, Y


def GradientSquareFunctions(samples, resolution, min=0.0, max=1.0):
    X = (max - min) * torch.rand(samples).reshape(-1, 1) + min
    Y = X * torch.pow(torch.linspace(-1, 1, steps=resolution), 2.0)
    G = X * 2 * torch.linspace(-1, 1, steps=resolution)
    Y = torch.stack((Y, G), -1)
    return X, Y


def SineFunctions(samples, resolution, min=0.0, max=1.0):
    X = (max - min) * torch.rand(int(samples / 2)).reshape(-1, 1) + min
    Y = X * torch.sin(torch.pi * torch.linspace(-1, 1, steps=resolution))
    return X, Y


def GradientSineFunctions(samples, resolution, min=0.0, max=1.0):
    X = (max - min) * torch.rand(int(samples / 2)).reshape(-1, 1) + min
    Y = X * torch.sin(torch.pi * torch.linspace(-1, 1, steps=resolution))
    G = X * torch.cos(torch.pi * torch.linspace(-1, 1, steps=resolution))
    Y = torch.stack((Y, G), -1)
    return X, Y


def AmbiguousSquareFunctions(samples, resolution, min=0.0, max=1.0):
    if samples % 2 != 0:
        print("Samples must be even!")
        return None
    X = (max - min) * torch.rand(int(samples / 2)).reshape(-1, 1) + min
    Y = X * torch.pow(torch.linspace(-1, 1, steps=resolution), 2.0)
    X = torch.cat((X, X), dim=0)
    Y = torch.cat((Y, -Y), dim=0)
    return X, Y


def GradientAmbiguousSquareFunctions(samples, resolution, min=0.0, max=1.0):
    if samples % 2 != 0:
        print("Samples must be even!")
        return None
    X = (max - min) * torch.rand(int(samples / 2)).reshape(-1, 1) + min
    Y = X * torch.pow(torch.linspace(-1, 1, steps=resolution), 2.0)
    G = X * 2 * torch.linspace(-1, 1, steps=resolution)
    X = torch.cat((X, X), dim=0)
    Y = torch.cat((Y, -Y), dim=0)
    G = torch.cat((G, -G), dim=0)
    Y = torch.stack((Y, G), -1)
    return X, Y


def AmbiguousSineFunctions(samples, resolution, min=0.0, max=1.0):
    if samples % 2 != 0:
        print("Samples must be even!")
        return None
    X = (max - min) * torch.rand(int(samples / 2)).reshape(-1, 1) + min
    Y = X * torch.sin(torch.pi * torch.linspace(-1, 1, steps=resolution))
    X = torch.cat((X, X), dim=0)
    Y = torch.cat((Y, -Y), dim=0)
    return X, Y


def GradientAmbiguousSineFunctions(samples, resolution, min=0.0, max=1.0):
    if samples % 2 != 0:
        print("Samples must be even!")
        return None
    X = (max - min) * torch.rand(int(samples / 2)).reshape(-1, 1) + min
    Y = X * torch.sin(torch.pi * torch.linspace(-1, 1, steps=resolution))
    G = X * torch.cos(torch.pi * torch.linspace(-1, 1, steps=resolution))
    X = torch.cat((X, X), dim=0)
    Y = torch.cat((Y, -Y), dim=0)
    G = torch.cat((G, -G), dim=0)
    Y = torch.stack((Y, G), -1)
    return X, Y


def TwoMoons(samples, noise):
    X, Y = make_moons(n_samples=samples, noise=noise)
    X = torch.from_numpy(X).to(torch.float32)
    Y = torch.from_numpy(Y).to(torch.float32)
    return X, Y

def FourMoons(samples, noise):
    X1, Y1 = make_moons(n_samples=int(samples/2), noise=noise)
    X2, Y2 = make_moons(n_samples=int(samples/2), noise=noise)
    v = X2.copy()
    X2[..., 0] = v[..., 1] + 0.25
    X2[..., 1] = v[..., 0]
    Y2 += 2
    X1 = torch.from_numpy(X1).to(torch.float32)
    Y1 = torch.from_numpy(Y1).to(torch.float32)
    X2 = torch.from_numpy(X2).to(torch.float32)
    Y2 = torch.from_numpy(Y2).to(torch.float32)
    X = torch.cat((X1, X2), axis=0)
    Y = torch.cat((Y1, Y2), axis=0)
    return X, Y
