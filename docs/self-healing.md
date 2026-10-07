# Confidence-Tiered Self-Healing Engine (`packages/healing/src/healer.ts`)

## The 3 Confidence Tiers
- **HIGH (90–100%)**: Safe automatic patch (e.g. upgrading fragile CSS selector to accessible `getByRole`). Automatically applied and re-run.
- **MEDIUM (70–89%)**: Propose patch with git diff and rationale for engineer approval.
- **LOW (< 70%)**: Do not modify; explain failure.

## The 4 Non-Negotiable Invariants
1. **Never weaken an assertion** (e.g. `toBe(200)` ➔ `toBeTruthy()` is blocked).
2. **Never heal a real regression** (if triaged as `REAL_REGRESSION`, healing is prohibited).
3. **Never increase timeouts as a first response**.
4. **Never delete failing tests**.
