---
name: qa-risk-analysis
title: 8-Factor Quantitative Risk Engine
category: Risk Architecture
author: Principal QA Architect & Systems Staff Engineer
---

# qa-risk-analysis — Quantitative Risk Engine

Computes a deterministic, explainable risk score (0–100) across 8 enterprise dimensions to govern CI test coverage and deployment quality gates.

---

## 1. Purpose
Replaces vague qualitative guesses with a mathematical risk model. Identifies top risk contributors so teams focus rigorous adversarial testing where failures cause the highest business and security damage.

---

## 2. When to Activate
- Prior to creating test plans or generating tests for a feature.
- During CI pull request evaluation to establish release thresholds.

---

## 3. The 8 Risk Dimensions
1. **Business Criticality** (1–5): Revenue or core mission impact (e.g. payment = 5, landing page = 1).
2. **Change Surface** (1–5): Breadth of code touched (files, lines, public interfaces).
3. **Defect History** (1–5): Frequency of prior bugs in the modified module.
4. **Code Complexity** (1–5): Cyclomatic complexity, concurrency, asynchronous state machines.
5. **Integration Depth** (1–5): External API dependencies, database interactions.
6. **User Impact** (1–5): Proportion of active users interacting with the touched flow.
7. **Security Sensitivity** (1–5): Authentication, authorization, session tokens, PII.
8. **Data Sensitivity** (1–5): Persistent database writes, transactions, immutable ledgers.

---

## 4. Decision Rules
- **Score ≥ 80 (CRITICAL)**: Mandatory 4-quadrant decomposition, security audit, and targeted E2E tests. Blocks automated merge.
- **Score 60–79 (HIGH)**: Requires unit, integration, and contract tests.
- **Score 35–59 (MEDIUM)**: Standard PR gate; fast unit and changed-file smoke tests.
- **Score < 35 (LOW)**: Fast-path unit test verification sufficient.

---

## 5. Workflow
```
1. PARSE     ──▶ Extract task description, touched files, and commit diffs
2. COMPUTE   ──▶ Evaluate 8 factor weights and calculate normalized 0-100 score
3. ATTRIBUTE ──▶ Identify top 3-5 contributors driving the risk score
4. PRESCRIBE ──▶ Output required test layers and quality gate requirements
```

---

## 6. Anti-Patterns
- 🚫 Treating all pull requests with the same flat testing requirement.
- 🚫 Silently downplaying security-sensitive auth changes.

---

## 7. Safety Constraints
Strictly `READ-ONLY`.

---

## 8. Output Contract
```markdown
# Risk Score: 87/100 (CRITICAL)
Top Contributors:
+ Payment logic changed in src/services/payment.ts
+ Database schema mutation on orders table
+ External Stripe webhook integration surface touched
Required Layers: Unit Invariants (60%), API Contracts (30%), E2E Checkout Flow (10%)
```

---

## 9. Verification Checklist
- [ ] Top contributors clearly explained with file-level attribution.
- [ ] Risk tier correctly prescribes required test pyramid depth.
