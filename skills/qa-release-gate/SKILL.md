---
name: qa-release-gate
title: Release Quality Gate & Merge Governance
category: Governance & CI
author: Principal QA Architect & Systems Staff Engineer
---

# qa-release-gate — Release Quality Gate

Evaluates pull requests, release branches, and deployment candidates against strict, explainable quality thresholds to emit authoritative release verdicts.

## 1. Release Verdicts
- `PASS`: All quality gates passed with 100% confidence. Release authorized.
- `PASS_WITH_WARNINGS`: Non-critical warnings detected (e.g. non-blocking flake quarantined).
- `BLOCKED`: Critical P0 regression, security breach, or accessibility blocker detected. Merge refused.
- `FAIL`: Core unit or contract test suites failed.

## 2. Invariants
Never declare success because a subset of tests passed. All targeted tests must be accounted for.
