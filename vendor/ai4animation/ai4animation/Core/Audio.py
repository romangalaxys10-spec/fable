# Copyright (c) Meta Platforms, Inc. and affiliates.
import os

import torch
import torchaudio
import soundfile as sf
from pathlib import Path

def FindWavFile(motion_name: str, audio_directory: str) -> str | None:
    """Resolve WAV next to (or under) audio_directory."""
    directory = Path(audio_directory)
    candidates = [
        directory / f"{motion_name}.wav",
        directory / f"{motion_name}.WAV",
        directory.parent / f"{motion_name}.wav",
    ]
    for path in candidates:
        if path.is_file():
            return str(path)

    if directory.name.lower() == "npz":
        parent = directory.parent / f"{motion_name}.wav"
        if parent.is_file():
            return str(parent)
    for root, _dirs, files in os.walk(audio_directory):
        for name in files:
            if name.lower() == f"{motion_name}.wav".lower():
                return os.path.join(root, name)
    return None

def LoadWaveform(path: str, mono: bool = True):
    """Load an audio file. Returns (waveform [channels, samples], sample_rate)."""
    if not os.path.isfile(path):
        raise FileNotFoundError(f"Audio file not found: {path}")

    try:
        waveform, sample_rate = torchaudio.load(path)
    except Exception:
        data, sample_rate = sf.read(path, always_2d=True)
        # soundfile: [samples, channels] -> [channels, samples]
        waveform = torch.from_numpy(data.T.copy()).float()

    if mono and waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)
    return waveform, int(sample_rate)


def ResampleWaveform(waveform: torch.Tensor, orig_sr: int, target_sr: int):
    """Resample waveform to target_sr. Returns (waveform, target_sr)."""
    if orig_sr == target_sr:
        return waveform, target_sr
    waveform = torchaudio.functional.resample(waveform, orig_sr, target_sr)
    return waveform, target_sr
