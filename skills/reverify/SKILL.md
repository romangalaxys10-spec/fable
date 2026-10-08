---
name: reverify
title: Ground Truth Verification Harness & Anti-Hallucination Protocol
source: https://github.com/2akouwu/reverify.git
category: AI Safety & Ground Truth Engineering
version: 1.0.0
license: MIT
---

# reverify — Ground Truth Verification Harness

Inspired by and derived from [`2akouwu/reverify`](https://github.com/2akouwu/reverify.git).

> **Core Axiom**: The AI is NEVER allowed to assert a fact independently.
> Every claim regarding codebase state, function signatures, struct fields, bug causes, or test outcomes must be submitted as a structured hypothesis and verified against ground truth by deterministic tools.

---

## 1. Purpose
Prevents coding agents from:
- Hallucinating nonexistent functions, APIs, or parameters.
- Falsely claiming a bug is fixed without reproducing the failure before the fix and verifying the pass after the fix.
- Re-proposing previously refuted claims across successive turns.

---

## 2. When to Activate
- When an agent claims a bug exists at a specific file/line.
- When an agent proposes a bug fix or refactoring.
- When an agent references external libraries, symbols, or exports.
- When verifying test outcomes (double-blind verification).

---

## 3. The 4-Step Verification Workflow

```
[Agent Claims Fact] ──▶ [Deterministic Tool Judge] ──▶ [Ground Truth Comparison]
                                                             │
                              ┌──────────────────────────────┴──────────────────────────────┐
                              ▼                                                             ▼
                         [VERIFIED]                                                    [REFUTED]
              Accepted into Working Context                              Stored in KNOWN_FALSE Memory
                                                                        (Agent prohibited from retrying)
```

1. **PROPOSE CLAIM**: Formulate claim in structured format:
   `CLAIM: { target: string, assertion: string, expectedEvidence: string }`
2. **EXECUTE DETERMINISTIC PROBE**: Run grep, AST query, compiler check, or unit test.
3. **EVALUATE EVIDENCE**: Compare actual output with expected evidence.
4. **RECORD OUTCOME**:
   - If match $\rightarrow$ label `VERIFIED` with file/line evidence.
   - If mismatch $\rightarrow$ label `REFUTED`, log to `KNOWN_FALSE` registry, and force the agent to abandon the hypothesis.

---

## 4. Double-Blind Bug Fix Protocol ("Verify Before Fix, Verify After Fix")

When fixing a reported defect:
1. **Pre-Fix Reproduction (Mandatory)**:
   - Run reproduction test against unchanged code.
   - Test **MUST FAIL** with the exact reported defect signature.
   - If test passes on unchanged code, the bug is `NOT REPRODUCED` — do NOT modify code!
2. **Apply Scoped Fix**:
   - Make minimal contiguous code edit.
3. **Post-Fix Verification (Mandatory)**:
   - Run reproduction test $\rightarrow$ **MUST PASS**.
   - Run full regression suite $\rightarrow$ **ZERO REGRESSIONS**.

---

## 5. Output Contract

```json
{
  "claimId": "claim_042",
  "statement": "PaymentService.processTransaction accepts idempotencyKey as string parameter",
  "status": "VERIFIED",
  "evidence": "src/services/payment.ts:48: 'processTransaction(amount: number, idempotencyKey: string): Promise<Result>'",
  "timestamp": "2026-10-07T13:20:00Z"
}
```
