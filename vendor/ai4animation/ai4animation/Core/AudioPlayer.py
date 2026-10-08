# Copyright (c) Meta Platforms, Inc. and affiliates.
import threading

import numpy as np
import torch
import sounddevice as sd

class AudioPlayer:
    def __init__(self):
        self._waveform = None  # float32 [samples, channels]
        self._sample_rate = 44100
        self._frame = 0
        self._playing = False
        self._lock = threading.Lock()
        self._stream = None

    @property
    def SampleRate(self) -> int:
        return self._sample_rate

    @property
    def Duration(self) -> float:
        if self._waveform is None or self._sample_rate <= 0:
            return 0.0
        return self._waveform.shape[0] / float(self._sample_rate)

    def SetWaveform(self, waveform: torch.Tensor | np.ndarray, sample_rate: int):
        """Set playback buffer. waveform: [channels, samples] or [samples]."""
        self.Stop()
        if isinstance(waveform, torch.Tensor):
            data = waveform.detach().cpu().numpy()
        else:
            data = np.asarray(waveform)
        if data.ndim == 1:
            data = data[:, None]
        elif data.ndim == 2 and data.shape[0] <= 8 and data.shape[0] < data.shape[1]:
            # [channels, samples] -> [samples, channels]
            data = data.T
        data = np.ascontiguousarray(data, dtype=np.float32)
        with self._lock:
            self._waveform = data
            self._sample_rate = int(sample_rate)
            self._frame = 0
            self._playing = False

    def Clear(self):
        self.Stop()
        with self._lock:
            self._waveform = None
            self._frame = 0

    def Seek(self, timestamp: float):
        with self._lock:
            if self._waveform is None:
                return
            frame = int(round(timestamp * self._sample_rate))
            self._frame = int(np.clip(frame, 0, self._waveform.shape[0]))

    def GetTime(self) -> float:
        with self._lock:
            if self._sample_rate <= 0:
                return 0.0
            return self._frame / float(self._sample_rate)

    def Play(self):
        with self._lock:
            if self._waveform is None:
                return
            self._playing = True
        self._ensure_stream()

    def Pause(self):
        with self._lock:
            self._playing = False

    def Stop(self):
        with self._lock:
            self._playing = False
            self._frame = 0
        self._close_stream()

    def IsPlaying(self) -> bool:
        with self._lock:
            return self._playing

    def _callback(self, outdata, frames, time_info, status):
        with self._lock:
            if (
                not self._playing
                or self._waveform is None
                or self._frame >= self._waveform.shape[0]
            ):
                outdata.fill(0)
                if self._waveform is not None and self._frame >= self._waveform.shape[0]:
                    self._playing = False
                return
            end = min(self._frame + frames, self._waveform.shape[0])
            chunk = self._waveform[self._frame : end]
            n = chunk.shape[0]
            channels = outdata.shape[1]
            if chunk.shape[1] == 1 and channels > 1:
                chunk = np.repeat(chunk, channels, axis=1)
            elif chunk.shape[1] > channels:
                chunk = chunk[:, :channels]
            outdata[:n] = chunk
            if n < frames:
                outdata[n:] = 0
                self._playing = False
            self._frame = end

    def _ensure_stream(self):
        if self._stream is not None:
            return

        channels = 1 if self._waveform is None else self._waveform.shape[1]
        self._stream = sd.OutputStream(
            samplerate=self._sample_rate,
            channels=channels,
            dtype="float32",
            callback=self._callback,
        )
        self._stream.start()

    def _close_stream(self):
        if self._stream is not None:
            try:
                self._stream.stop()
                self._stream.close()
            except Exception:
                pass
            self._stream = None
