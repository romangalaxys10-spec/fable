---
name: k6-performance
title: Grafana k6 Load & Performance Testing
category: Performance & Reliability
testingTypes:
  - Performance
  - Load
  - Stress
frameworks:
  - k6
languages:
  - JavaScript
  - TypeScript
author: Pramod Dutta (QASkills.sh)
---

# Grafana k6 Load & Performance Testing Patterns

Performance and load testing patterns for AI coding agents. Enforces quantitative SLA thresholds and progressive virtual user (VU) ramps.

## Core Mental Model

1. **Thresholds as Quality Gates**:
   - Every performance test must specify strict pass/fail SLA criteria.
   - Example: 95% of requests under 300ms, 99% under 600ms, error rate under 1%.

2. **Workload Modeling**:
   - Ramp-up: Progressively increase VUs to warm up caches and connections.
   - Steady-state: Hold target concurrency for sustained measurement.
   - Ramp-down: Gracefully tear down connections.

## Pattern Implementation

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp-up to 20 users
    { duration: '1m', target: 20 },   // Steady state
    { duration: '15s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<600'], // 95% < 300ms
    http_req_failed: ['rate<0.01'],                 // < 1% errors
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/status');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response under 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
```
