# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Threaded data sampler for asynchronous batch loading during training."""

import os
import threading
from collections import deque, OrderedDict
from concurrent.futures import as_completed, ThreadPoolExecutor

import numpy as np
from ai4animation import Utility
from tqdm import tqdm


class LRUCache:
    def __init__(self, capacity, function):
        self._capacity = capacity
        self._function = function
        self._cache = OrderedDict()
        self._lock = threading.Lock()

    def Get(self, key):
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                return self._cache[key]
        value = self._function(key)
        with self._lock:
            self._cache[key] = value
            if len(self._cache) > self._capacity:
                self._cache.popitem(last=False)
        return value

    def Clear(self):
        with self._lock:
            self._cache.clear()


class DataSampler:
    def __init__(
        self,
        dataset,
        framerate,
        batch_size,
        function,
        start_padding=0.0,
        end_padding=0.0,
        coverage=1.0,
        cache=1.0,
    ):
        self.Dataset = dataset
        self.Framerate = framerate
        self.BatchSize = batch_size
        self.Function = function
        self.StartPadding = start_padding
        self.EndPadding = end_padding
        self.Coverage = coverage
        self.Cache = LRUCache(
            max(1, int(cache * len(self.Dataset))), self.Dataset.LoadMotion
        )

        self.NumWorkers = Utility.GetNumWorkers()
        print(
            f"Auto-detected num workers={self.NumWorkers} ({os.cpu_count()} CPU cores)"
        )

        print(
            "Generating data sampler for",
            len(self.Dataset),
            "files at",
            self.Framerate,
            "FPS",
        )

        self.Timestamps = [None] * len(self.Dataset)
        self.Locks = [threading.Lock() for _ in range(len(self.Dataset))]
        with ThreadPoolExecutor(max_workers=self.NumWorkers) as executor:
            # Submit all tasks with their indices
            future_to_index = {
                executor.submit(self.Dataset.LoadMotion, i): i
                for i in range(len(self.Dataset))
            }

            with tqdm(
                total=len(self.Dataset), desc="Loading motions", unit="file"
            ) as pbar:
                for future in as_completed(future_to_index):
                    index = future_to_index[future]
                    motion = future.result()
                    self.Timestamps[index] = motion.GetTimestamps(
                        self.Framerate, self.StartPadding, self.EndPadding
                    )
                    pbar.update(1)

        self.Samples = sum([len(t) for t in self.Timestamps])
        print(f"Per-Epoch Coverage: {self.Coverage}")
        print(f"Training Samples: {self.TrainingSamples} / {self.Samples}")
        print(f"Training Batches: {self.BatchCount} @ {self.BatchSize}")
        print(f"Motion Duration: {self.Duration(self.TrainingSamples)}")

    @property
    def BatchCount(self):
        return int(self.Coverage * self.Samples // self.BatchSize)

    @property
    def TrainingSamples(self):
        return self.BatchCount * self.BatchSize

    def Duration(self, samples):
        total_sec = float(samples) / float(self.Framerate)
        hrs = int(total_sec // 3600)
        mins = int((total_sec % 3600) // 60)
        secs = int(total_sec % 60)
        return f"{hrs}h {mins}m {secs}s"

    # Creates batch of tuples [(Motion=1, [Timestamps=N])]
    def SampleBatchesWithinMotions(self, current_epoch, total_epochs):
        indices = np.arange(len(self.Dataset))
        probabilities = [
            len(self.Timestamps[i]) / self.Samples for i in range(len(self.Dataset))
        ]
        batches = []
        for _ in range(self.BatchCount):
            index = np.random.choice(indices, 1, p=probabilities)[0]
            batches.append(
                self.DataBatch(
                    self,
                    index,
                    np.random.choice(self.Timestamps[index], self.BatchSize),
                )
            )
        return self._Iterator(batches, current_epoch, total_epochs)

    def _Iterator(self, batches, current_epoch=None, total_epochs=None):
        pbar = tqdm(
            total=len(batches),
            desc=f"Epoch {current_epoch}/{total_epochs}",
            unit="batch",
            ncols=140,
            bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}]",
        )

        try:
            with ThreadPoolExecutor(max_workers=self.NumWorkers) as executor:
                futures_queue = deque()

                batch_idx = 0

                for _ in range(len(batches)):
                    # Submit next batches while available
                    while len(futures_queue) < self.NumWorkers and batch_idx < len(
                        batches
                    ):
                        future = executor.submit(batches[batch_idx].Retrieve)
                        futures_queue.append((batch_idx, future))
                        batch_idx += 1

                    # Get the result from the oldest submitted batch
                    _, future = futures_queue.popleft()

                    yield future.result()

                    pbar.update(1)
        finally:
            pbar.close()

    class DataBatch:
        def __init__(self, sampler, index, timestamps):
            self.Sampler = sampler
            self.Index = index
            self.Timestamps = timestamps

        def Retrieve(self):
            # if self.Sampler.Locks[self.Index].locked():
            #     print(f"Waiting for motion {self.Index} (locked by another thread)")
            with self.Sampler.Locks[self.Index]:
                motion = self.Sampler.Cache.Get(self.Index)
                timestamps = self.Timestamps
                return self.Sampler.Function((motion, timestamps))
