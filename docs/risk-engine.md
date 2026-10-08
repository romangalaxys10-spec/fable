# 8-Factor Quantitative Risk Engine (`packages/core/src/risk.ts`)

The risk engine computes a normalized 0–100 score governed by the formula:

$$\text{Risk} = \text{Norm}\left(\prod_{i=1}^8 \text{Factor}_i\right)$$

Weighted dimensions:
1. **Business Criticality** (22% weight) — Payment, checkout, core revenue paths.
2. **Change Surface** (16% weight) — Number of lines and files modified.
3. **Security Sensitivity** (18% weight) — Authentication, tokens, RBAC, PII.
4. **Data Sensitivity** (14% weight) — Database mutations, transactions, schema changes.
5. **Code Complexity** (10% weight) — Concurrency, async queues, algorithms.
6. **User Impact** (10% weight) — End-user footprint.
7. **Defect History** (5% weight) — Past bug density.
8. **Integration Depth** (5% weight) — Downstream third-party APIs.

Tiers:
- **Critical (≥ 80)**: Blocks merge. Full 4-quadrant decomposition, security, and E2E regression.
- **High (60–79)**: Targeted regression and schema validation.
- **Medium (35–59)**: Fast unit invariants and smoke tests.
- **Low (< 35)**: Isolated unit verification.
