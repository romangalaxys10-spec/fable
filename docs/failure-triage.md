# 12-Category Failure Triage & Root Cause Clustering (`packages/agents/src/triage-agent.ts`)

## The 12 Standard Categories
1. `REAL_REGRESSION`: Application code produced unexpected output or violated business invariants.
2. `TEST_DEFECT`: Test assertion logic bug.
3. `TEST_DATA_DEFECT`: DB collision, duplicate key error.
4. `ENVIRONMENT_FAILURE`: Host runner or docker failure.
5. `NETWORK_FAILURE`: HTTP 502/503, connection dropped.
6. `DEPENDENCY_FAILURE`: Third-party outage.
7. `FLAKE`: Failed first attempt, passed on retry with zero code changes.
8. `TIMING_FAILURE`: Element readiness race condition.
9. `SELECTOR_FAILURE`: DOM attribute or class rename.
10. `ASSERTION_FAILURE`: Generic unclassified assertion failure.
11. `CONFIGURATION_FAILURE`: Missing env var or invalid config.
12. `UNKNOWN`: Unclassified anomaly.

## Clustering Algorithm
Normalizes error stack traces and endpoint targets. Groups 87 failures into 1 primary root cause and 86 cascading dependencies.
