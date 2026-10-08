---
name: flaky-test-quarantine
title: Flaky Test Quarantine & Deflaking Protocol
category: Strategy & Reliability
testingTypes:
  - Reliability
  - CI/CD
  - Flakiness
frameworks:
  - Universal
  - Playwright
  - Vitest
languages:
  - TypeScript
  - Python
author: Pramod Dutta (QASkills.sh)
---

# Flaky Test Quarantine & Deflaking Protocol

The standard protocol for identifying, quarantining, and systematically eliminating intermittent or flaky test failures in CI.

## The Quarantine Mental Model

1. **The Trunk Protection Invariant**:
   - A flaky test is worse than a broken test because it destroys team trust in CI.
   - When a test fails intermittently (&gt;1% failure rate without code changes), quarantine it immediately with a `@quarantine` tag.
   - Run quarantined tests on a separate non-blocking schedule while keeping the main pipeline green.

2. **Root Cause Taxonomy**:
   - **Type A: Timing & Race Conditions**: Relying on arbitrary timeouts instead of explicit event listeners or locator auto-waiting.
   - **Type B: Shared Mutable State**: Leaked database records, un-reset singleton caches, or shared browser sessions.
   - **Type C: Non-Deterministic Data**: Unseeded random numbers, floating-point rounding differences, or timezone daylight savings drift.
   - **Type D: Resource Contention**: CPU starvation in parallel CI containers leading to socket or process timeouts.

## Deflaking Checklist

- [ ] Replaced any `sleep()` or `waitForTimeout()` with `waitForSelector()` or web-first assertion.
- [ ] Swapped wall-clock timestamps for fixed frozen clock (`vi.setSystemTime`).
- [ ] Replaced shared database rows with unique UUID-tagged entity fixtures.
- [ ] Added network request mock interceptors for external third-party endpoints.
