---
name: qa-requirements
title: 4-Quadrant Requirements & Acceptance Criteria Decomposition
category: Requirements Engineering
author: Principal QA Architect & Systems Staff Engineer
---

# qa-requirements — Requirements Decomposition

Decomposes raw user stories, feature requests, or PR descriptions into structured acceptance criteria across the 4 core testing quadrants.

## 1. Purpose
Ensures that test coverage is planned systematically before code generation begins, avoiding omission of negative and boundary edge cases.

## 2. The 4 Quadrants
- **Q1: Positive (Happy Path)** — Valid inputs, core business workflows, nominal contract responses.
- **Q2: Negative & Error** — Schema validation errors, missing parameters, 4xx/5xx responses.
- **Q3: Boundary & Resilience** — Min, max, zero, null, boundary thresholds, latency injection.
- **Q4: Security & Accessibility** — Auth bypass, token tampering, XSS/SQLi sanitization, WCAG 2.1 AA.

## 3. Output Contract
Structured list of testable acceptance criteria linked to Quality Graph requirement nodes.
