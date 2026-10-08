---
name: test-case-decomposition
title: 4-Quadrant Test Case Decomposition
category: Strategy & Mental Models
testingTypes:
  - Test Design
  - Architecture
  - Planning
frameworks:
  - Universal
languages:
  - Agnostic
author: Pramod Dutta (QASkills.sh)
---

# 4-Quadrant Test Case Decomposition

The core thinking instruction taught by Pramod Dutta for AI agents: before generating code, decompose the feature into four mutually exclusive, comprehensively exhaustive testing quadrants.

## The 4 Quadrants

```
         FUNCTIONAL                NON-FUNCTIONAL
   ┌──────────────────────────┬──────────────────────────┐
   │ Q1: Positive (Happy Path)│ Q3: Boundary & Resilience│
   │                          │                          │
   │ Valid inputs             │ Min / Max boundaries     │
   │ Expected workflows       │ Zero, Null, Overflow     │
   │ Core user expectations   │ Timeout & Disconnects    │
   ├──────────────────────────┼──────────────────────────┤
   │ Q2: Negative & Error     │ Q4: Security & a11y      │
   │                          │                          │
   │ Invalid formats          │ Auth bypass              │
   │ Missing required fields  │ Injection & Fuzzing      │
   │ Permission denials       │ Screen reader & WCAG     │
   └──────────────────────────┴──────────────────────────┘
```

### Quadrant Breakdown

1. **Q1 — Positive (Happy Path)**:
   - Valid inputs conform exactly to expected schemas.
   - Primary state transitions complete successfully.
   - Outputs match the specification contract.

2. **Q2 — Negative & Validation**:
   - Empty, malformed, or missing parameters trigger explicit error responses.
   - System returns correct HTTP 4xx or localized error envelopes without crashing.

3. **Q3 — Boundary & Resilience**:
   - Values at the exact edge thresholds (`0`, `max_length`, `max_integer`).
   - Network packet drops, slow responses (latency injection), aborted requests.

4. **Q4 — Security & Accessibility**:
   - Unauthorized access attempts with expired or tampered credentials.
   - SQLi/XSS payloads sanitized cleanly.
   - WCAG 2.1 AA keyboard focus order and screen reader announcements verified.
