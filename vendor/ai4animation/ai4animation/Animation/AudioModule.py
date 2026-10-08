# Copyright (c) Meta Platforms, Inc. and affiliates.

from ai4animation.Animation.Module import Module
from ai4animation.Animation.Motion import Motion
from ai4animation.Core.Audio import FindWavFile, LoadWaveform
from ai4animation.Core.AudioPlayer import AudioPlayer

class AudioModule(Module):
    _SharedPlayer: AudioPlayer | None = None

    def __init__(
        self,
        motion: Motion,
        audio_directory: str
    ) -> None:
        self.AudioDirectory = audio_directory

        if AudioModule._SharedPlayer is None:
            AudioModule._SharedPlayer = AudioPlayer()
        self.Player = AudioModule._SharedPlayer
        self._last_seek_time = None
        self._was_playing = False

        super().__init__(motion)
        self.AudioPath = FindWavFile(self.Motion.Name, self.AudioDirectory)

    def GetName(self) -> str:
        return "Audio"

    def Initialize(self):
        if self.AudioPath is None:
            print(f"AudioModule: no WAV found for motion '{self.Motion.Name}' under {self.AudioDirectory}")
            return

        waveform, sample_rate = LoadWaveform(self.AudioPath, mono=True)
        self.Player.SetWaveform(waveform, sample_rate)

    def Shutdown(self):
        if self.Player is not None:
            self.Player.Stop()
        self._last_seek_time = None
        self._was_playing = False

    def Callback(self, editor):
        if self.Player is None:
            return
        if self.AudioPath is None:
            return

        playing = editor.IsPlaying()
        timestamp = float(editor.Timestamp)

        # Resync on scrub, clip change, or play edge
        needs_seek = (
            self._last_seek_time is None
            or abs(timestamp - self._last_seek_time) > 0.05
            or (playing and not self._was_playing)
            or (not playing)
        )
        if needs_seek:
            self.Player.Seek(timestamp)
            self._last_seek_time = timestamp

        if playing:
            if not self.Player.IsPlaying():
                self.Player.Play()
            # Correct drift while playing
            audio_t = self.Player.GetTime()
            if abs(audio_t - timestamp) > 0.15:
                self.Player.Seek(timestamp)
                self._last_seek_time = timestamp
            else:
                self._last_seek_time = audio_t
        else:
            if self.Player.IsPlaying():
                self.Player.Pause()

        self._was_playing = playing

    def Standalone(self):
        pass

    def GUI(self, editor):
        if not Module.Visualize[AudioModule]:
            return
        return

    def Draw(self, editor):
        pass
