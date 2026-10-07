---
name: qa-test-strategy
title: Test Strategy & Pyramid Allocation Engine
category: Strategy
author: Principal QA Architect & Systems Staff Engineer
---

# qa-test-strategy — Test Strategy & Pyramid Optimization

Balances test distribution across the Test Pyramid (Unit 60%, Integration 30%, E2E 10%) to maximize defect detection while minimizing runtime cost and flakiness.

## 1. Purpose
Penalizes the inverted pyramid antipattern (excessive slow E2E tests). Directs business invariant verification into fast unit tests, API contracts into integration tests, and reserves E2E for critical revenue user journeys.

## 2. Decision Rules
- Pure calculation / state transition ➔ Unit test (Vitest/Jest).
- HTTP status codes, schema validation, DB transaction ➔ API/Integration test.
- Cross-page navigation, payment form submission ➔ E2E test (Playwright).

## 3. Output Contract
Test architecture plan detailing test count allocation, runtime estimates, and execution parallelization.
