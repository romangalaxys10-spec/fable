---
name: qa-performance
title: Performance & Load Testing with k6
category: Performance
author: Principal QA Architect & Systems Staff Engineer
---

# qa-performance — Performance & Load Testing

Executes automated load and stress testing using Grafana k6, enforcing quantitative latency SLAs ($p_{95} < 300\text{ms}$) and error rate thresholds.

## 1. Capabilities
- Workload modeling: Ramp-up, steady-state, and ramp-down stages.
- Automated threshold pass/fail quality gates.
- Latency percentiles tracking ($p_{50}, p_{90}, p_{95}, p_{99}$).
- Detection of memory leaks, socket saturation, and slow database queries.
