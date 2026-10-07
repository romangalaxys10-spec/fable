---
name: qa-test-healing
title: Confidence-Tiered Self-Healing Engine
category: Test Maintenance
author: Principal QA Architect & Systems Staff Engineer
---

# qa-test-healing — Confidence-Tiered Self-Healing

Repairs brittle test locators and minor schema drifts while strictly preserving assertion invariants and preventing the accidental masking of real product regressions.

---

## 1. Purpose
Eliminates test maintenance fatigue from routine frontend refactors without ever weakening test criteria or transforming real bugs into false passes.

---

## 2. When to Activate
- When tests fail with `SELECTOR_FAILURE` or minor accessible label updates.
- During test healing cycles in CI or development.

---

## 3. The 3 Confidence Tiers
| Tier | Criteria | Automated Action |
|---|---|---|
| **HIGH** (90–100%) | Deterministic locator upgrade (e.g. replacing brittle `.btn-pay` with accessible `page.getByRole('button', { name: 'Submit' })`). | **Safe Automatic Patch**: Applies patch immediately and re-runs test. |
| **MEDIUM** (70–89%) | Minor DOM attribute drift requiring verification. | **Propose Patch**: Generates diff and rationale; requests engineer approval. |
| **LOW** (< 70%) | Ambiguous failure, multiple matching elements, or logic change. | **Do Not Modify**: Emits explanation; leaves test intact for manual review. |

---

## 4. The 4 Non-Negotiable Invariants
1. **NEVER weaken assertions**: Transforming `toBe(100)` into `toBeTruthy()` or `toBeDefined()` is prohibited.
2. **NEVER heal a real regression**: If `qa-failure-triage` categorizes the failure as `REAL_REGRESSION`, healing is **strictly blocked**.
3. **NEVER increase timeouts as a first response**: Do not mask timing bugs with arbitrary delays.
4. **NEVER delete failing tests**: Deleting failing tests to force green builds is prohibited.

---

## 5. Workflow
```
1. TRIAGE    ──▶ Confirm failure is SELECTOR_FAILURE or safe structural drift
2. ANALYZE   ──▶ Inspect updated DOM structure or accessible tree
3. SYNTHESIZE──▶ Generate modern Playwright semantic locator replacement
4. AUDIT     ──▶ Programmatically verify the 4 Non-Negotiable Invariants
5. APPLY     ──▶ Apply patch if HIGH confidence; propose patch if MEDIUM
6. VERIFY    ──▶ Re-run patched test to confirm deterministic pass
```

---

## 6. Output Contract
```markdown
# Self-Healing Proposal: [HIGH CONFIDENCE - 95%]
- Target File: tests/e2e/checkout.spec.ts
- Original Locator: page.locator('.btn-pay-now')
- Healed Replacement: page.getByRole('button', { name: 'Pay Now' })
- Invariant Audit: [PASSED - Zero assertion weakening, Zero timeout increase]
- Status: Auto-applied and verified green.
```

---

## 7. Verification Checklist
- [ ] Invariant audit passed with zero violations.
- [ ] No assertions weakened or removed.
- [ ] Healed test re-run and confirmed passing.
