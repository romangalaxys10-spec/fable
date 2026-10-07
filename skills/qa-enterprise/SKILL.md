---
name: qa-enterprise
title: qaforge Enterprise QA Operating System — All-in-One Gateway
category: Enterprise QA
author: Principal QA Architect & Systems Staff Engineer
---

# qa-enterprise — Enterprise QA Operating System

The primary entry point for **qaforge**: an AI-native quality engineering operating system that turns coding agents (Claude Code, Codex, Cursor, Copilot, Windsurf, Cline, Gemini CLI) into autonomous, evidence-driven QA organizations.

---

## 1. Purpose
Orchestrates end-to-end software quality across the 12-stage lifecycle:
`DISCOVER → MODEL → PLAN → GENERATE → VALIDATE → EXECUTE → OBSERVE → TRIAGE → HEAL/FIX → VERIFY → MEASURE → LEARN`.

Competitively targets and supersedes Tricentis, mabl, BrowserStack, Applitools, Cypress Cloud, and the standard Playwright ecosystem through **Deterministic First, AI Second** discipline and verifiable Quality Graph traceability.

---

## 2. When to Activate
- When the user requests comprehensive QA, PR review, or test strategy: `"QA this PR"`, `"Build test architecture for checkout"`, `"Run enterprise release gate"`.
- When pull requests touch high-risk boundaries (auth, payment, DB schema, public APIs).
- When test suites experience flakiness, regression drift, or unclustered failure cascades.

---

## 3. Inputs
- Target repository root path or branch range (`HEAD~1..HEAD`).
- Git diff, commit log, or feature requirements specification.
- Test artifacts: JUnit XML, Playwright traces, network HAR logs.

---

## 4. Preconditions
- Project repository contains accessible code or git history.
- Node.js ≥ 18 and Python 3.10+ installed.
- `qa doctor` returns a health score ≥ 90.

---

## 5. Decision Rules
1. **Deterministic Before AI**: Always run static git diffs, AST symbol parsers, and regex matchers before invoking LLM semantics.
2. **Pyramid Enforcement**: Explicitly penalize unnecessary E2E tests. Pricing calculations belong in unit invariants; high-value checkout journeys belong in Playwright E2E.
3. **Tri-Level Safety**: Classify every action as `READ-ONLY`, `LOW-RISK WRITE`, or `HIGH-RISK` (requires human confirmation).
4. **The 15 Golden Rules**: Never weaken assertions, never hide regressions behind retries, never use arbitrary sleeps (`waitForTimeout`).

---

## 6. Workflow
```
1. DISCOVER  ──▶ qa doctor & repository inspection
2. MODEL     ──▶ AST symbol diff & Quality Graph traceability
3. RISK      ──▶ 8-factor risk scoring (0-100) with top contributors
4. IMPACT    ──▶ Select minimal targeted test subset (qa impact)
5. GENERATE  ──▶ 8-heuristic test case enumeration
6. REVIEW    ──▶ 17-dimension test quality scoring
7. EXECUTE   ──▶ Run targeted suites with zero arbitrary sleeps
8. OBSERVE   ──▶ Collect evidence bundles (traces, logs, HAR)
9. TRIAGE    ──▶ 12-category classification & root-cause clustering
10. HEAL     ──▶ Confidence-tiered patch proposal (HIGH/MEDIUM/LOW)
11. GATE     ──▶ Release verdict: PASS / PASS_WITH_WARNINGS / BLOCKED
12. LEARN    ──▶ Record feedback & update flake/defect history
```

---

## 7. Anti-Patterns
- 🚫 **Inverted Pyramid**: Writing 500 E2E tests for internal pure functions.
- 🚫 **Arbitrary Sleeps**: Using `page.waitForTimeout(3000)` instead of auto-waiting.
- 🚫 **Assertion Weakening**: Changing `toBe(200)` to `toBeTruthy()` to force green tests.
- 🚫 **Flake Masking**: Retrying a test 5 times without diagnosing timing or shared state.

---

## 8. Failure Handling
- If environment fails (HTTP 502/503), classify as `ENVIRONMENT_FAILURE` and halt execution.
- If real product regression occurs, label `CONFIRMED DEFECT` and block release gate.
- If test is flaky, isolate immediately via `@quarantine` and log taxonomy bucket.

---

## 9. Evidence Requirements
Every verification claim requires an artifact bundle:
`artifacts/run-<date>/test-<id>/{metadata.json, trace.zip, screenshot.png, console.log, network.json}`.

---

## 10. Safety Constraints
- Read-only actions (diff, inspect, doctor) run autonomously.
- File creations in `tests/` run under `LOW-RISK WRITE`.
- Destructive DB drops or production testing require explicit confirmation.

---

## 11. Output Contract
```markdown
# QA REVIEW: [CRITICAL | HIGH | MEDIUM | LOW] RISK (Score: X/100)
- Changed Surface: [Files & Symbols]
- Risk Contributors: [+ Contributor 1, + Contributor 2]
- Targeted Tests: [Unit: X, Integration: Y, E2E: Z]
- Triage Clusters: [Real Regressions: A, Flakes: B, Cascade: C]
- Release Gate Verdict: [PASS | PASS_WITH_WARNINGS | BLOCKED]
```

---

## 12. Examples
```bash
# Full PR Quality Inspection
qa impact HEAD~1..HEAD
qa risk --task "Payment gateway migration"
qa triage
qa release
```

---

## 13. Verification Checklist
- [ ] `qa doctor` passed with 100% health score.
- [ ] Change impact identified minimal high-signal test set.
- [ ] Zero arbitrary timeouts in generated test files.
- [ ] Golden Rules validated against all proposed patches.
