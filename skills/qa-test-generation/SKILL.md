---
name: qa-test-generation
title: Multi-Heuristic Test Generation Pipeline
category: Test Generation
author: Principal QA Architect & Systems Staff Engineer
---

# qa-test-generation — Multi-Heuristic Test Generation

Generates production-grade, deterministically isolated test suites using an 8-heuristic design process rather than naive one-shot generation.

## 1. The 8 Design Heuristics
1. **Happy Path**: Core business flows with valid payloads.
2. **Negative Path**: Schema validation, missing fields, 4xx responses.
3. **Boundary**: Min, max, zero, null, undefined, empty collections, integer limits.
4. **State Transitions**: Valid and invalid lifecycle states (e.g. created ➔ paid ➔ shipped; refunded ➔ shipped rejected).
5. **Concurrency & Idempotency**: Double submits, lock contention, race conditions.
6. **Time**: Timezones, Daylight Savings, expiration tokens, clock drift.
7. **Security**: Auth bypass, token tampering, parameter injection, IDOR.
8. **Resilience**: Network dropouts, 502 gateway timeouts, service degradation.

## 2. Invariants
- Zero arbitrary sleeps (`waitForTimeout` prohibited).
- Web-first assertions only (`expect(locator).toBeVisible()`).
- Isolated state fixtures with clean teardown.
