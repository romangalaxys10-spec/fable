---
name: qa-test-execution
title: Test Execution & Runner Adapters
category: Execution
author: Principal QA Architect & Systems Staff Engineer
---

# qa-test-execution — Test Execution & Runner Adapters

Executes targeted test suites across multiple frameworks (Playwright, Vitest, Jest, Cypress, Pytest, k6) with automatic retry management, sharding, and artifact harvesting.

## 1. Capabilities
- Unified execution interface across Node.js, Python, and containerized test runners.
- Automated sharding across CI parallel runner instances.
- Zero-sleep enforcement in runner runtime hooks.
- Real-time emission of `TestEvent` telemetry streams.
