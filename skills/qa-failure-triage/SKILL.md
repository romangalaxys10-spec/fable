---
name: qa-failure-triage
title: 12-Category Failure Triage & Root-Cause Clustering
category: Failure Analysis
author: Principal QA Architect & Systems Staff Engineer
---

# qa-failure-triage — Failure Triage & Root Cause Clustering

Categorizes test failures into 12 standardized defect buckets and clusters cascading failures down to their single root cause.

---

## 1. Purpose
Turns overwhelming failure logs (e.g. "87 tests failed") into clear, actionable intelligence by distinguishing product regressions from flaky tests, locator drifts, and environment outages.

---

## 2. When to Activate
- When CI or local test executions report failing test runs.
- When an engineer or agent needs to triage a broken build.

---

## 3. The 12 Standard Failure Categories
1. `REAL_REGRESSION`: Application code produced unexpected output or broke business invariants.
2. `TEST_DEFECT`: The test itself has flawed assertions, logic bugs, or invalid assumptions.
3. `TEST_DATA_DEFECT`: Database unique constraint collisions or expired test credentials.
4. `ENVIRONMENT_FAILURE`: Test container, runner VM, or cloud infrastructure crashed.
5. `NETWORK_FAILURE`: Socket timeouts, connection resets, or 502/503 gateway drops.
6. `DEPENDENCY_FAILURE`: Unhealthy external third-party service or downstream microservice.
7. `FLAKE`: Non-deterministic failure that passed on immediate retry without code changes.
8. `TIMING_FAILURE`: Race conditions or actions occurring before element readiness.
9. `SELECTOR_FAILURE`: DOM structure or class rename broke a brittle CSS/XPath locator.
10. `ASSERTION_FAILURE`: Generic assertion error requiring manual code inspection.
11. `CONFIGURATION_FAILURE`: Missing environment variables or malformed config files.
12. `UNKNOWN`: Unclassified failure requiring human debugging.

---

## 4. Root-Cause Clustering
Normalizes failure signatures (error type + normalized stack + target route + browser):
- **Example**: 87 failures across multiple pages are clustered into **1 broken `/api/auth/token` endpoint**.
- Reports **1 Primary Failure** and **86 Cascading Failures**.

---

## 5. Workflow
```
1. INGEST    ──▶ Collect runner logs, error messages, and retry results
2. PARSE     ──▶ Extract error codes, HTTP status, and stack traces
3. CLASSIFY  ──▶ Map each failure to one of the 12 standardized categories
4. CLUSTER   ──▶ Group shared root-cause signatures; identify primary vs cascade
5. PRESCRIBE ──▶ Output actionable fix recommendations for primary defects
```

---

## 6. Output Contract
```json
{
  "totalFailures": 87,
  "primaryDefectsCount": 1,
  "cascadingFailuresCount": 86,
  "clusters": [
    {
      "clusterId": "cluster-auth-gateway-502",
      "category": "NETWORK_FAILURE",
      "rootCause": "Auth service offline returning HTTP 502",
      "affectedCount": 87,
      "recommendedAction": "Restart authentication service container in CI environment."
    }
  ]
}
```

---

## 7. Verification Checklist
- [ ] Failures mapped to exact standardized categories.
- [ ] Cascading failures successfully clustered to primary root cause.
