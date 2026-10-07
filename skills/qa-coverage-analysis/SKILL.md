---
name: qa-coverage-analysis
title: Business-Risk-Aware Coverage Analysis
category: Coverage
author: Principal QA Architect & Systems Staff Engineer
---

# qa-coverage-analysis — Business-Risk-Aware Coverage

Upgrades raw line coverage metrics into actionable, risk-weighted coverage analysis across business-critical workflows.

## 1. Key Metrics
- **Critical Path Coverage**: Coverage of revenue-generating transaction paths (payment, checkout, signup).
- **Security Boundary Coverage**: Coverage of auth, session tokens, and RBAC permissions.
- **Change Surface Coverage**: % of modified lines in the current PR verified by automated tests.
- **Uncovered High-Risk Files**: List of critical files modified without test coverage.
