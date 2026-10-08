---
name: qa-test-review
title: 17-Dimension Test Quality Review & Mutation Scoring
category: Quality Review
author: Principal QA Architect & Systems Staff Engineer
---

# qa-test-review — 17-Dimension Test Quality Review

Audits proposed or existing test code against 17 distinct quality dimensions to guarantee tests catch genuine bugs and do not produce false passes.

## 1. The 17 Evaluation Dimensions
1. Correctness
2. Determinism (Zero flakes)
3. State Isolation
4. Assertion Strength (No truthy cop-outs)
5. Behavior Coverage
6. Negative Coverage
7. Boundary Coverage
8. Maintainability
9. Readability
10. Execution Runtime SLA
11. Test Duplication
12. Mock Quality
13. Data Engineering (Factories vs hardcoded)
14. Security Hygiene (Zero leaked secrets)
15. Accessibility
16. Observability (Trace metadata)
17. Mutation Score (Does the test kill injected mutants?)

## 2. Output Contract
Test Review Scorecard (0–100) with line-by-line improvement recommendations.
