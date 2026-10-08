---
name: qa-flake-detection
title: Flake Detection & Quarantine Registry
category: Reliability
author: Principal QA Architect & Systems Staff Engineer
---

# qa-flake-detection — Flake Intelligence & Quarantine

Identifies non-deterministic test behavior, calculates quantitative Flake Scores, isolates intermittent tests with `@quarantine`, and clusters failures into the 4 flake taxonomies.

## 1. The 4 Flake Taxonomies
- **Type A: Timing & Race Conditions**: Arbitrary sleeps, DOM race conditions.
- **Type B: Shared Mutable State**: Database state leakage across parallel workers.
- **Type C: Non-Deterministic Data**: Unseeded random numbers, timezone drift.
- **Type D: Resource Contention**: CPU or memory starvation in CI containers.

## 2. Invariants
Quarantined tests run in a separate non-blocking job while the main CI branch remains protected. Tests are never deleted, only deflaked and graduated.
