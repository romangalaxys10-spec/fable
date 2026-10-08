---
name: qa-agent-evaluation
title: Autonomous Coding Agent Evaluation & Benchmarking Harness
category: Flagship Differentiator
author: Principal QA Architect & Systems Staff Engineer
---

# qa-agent-evaluation — Coding Agent Evaluation Harness

A repeatable meta-evaluation system designed to benchmark and evaluate autonomous AI coding agents (Claude Code, Cursor, Copilot Workspace, Codex, Windsurf, Cline, Gemini CLI).

---

## 1. Purpose
Determines whether an AI coding agent acts like an elite software engineer: does it inspect before writing, edit targeted files cleanly, obey repository conventions, introduce tests that fail for the right reasons, resist overfitting, and recover from failures with evidence?

---

## 2. When to Activate
- When evaluating agent performance on repository tasks or pull requests.
- When benchmarking coding agent models against golden test suites.
- When grading an agent's compliance with testing invariants and security boundaries.

---

## 3. Inputs
- Target task prompt and golden repository baseline.
- Agent tool-call logs, git commits, diff traces, and terminal interactions.
- Test execution output and verification artifacts.

---

## 4. Preconditions
- Clean sandbox environment with repeatable checkout capability.
- Golden verification suite with hidden regression tests.
- Baseline measurements recorded for wall-clock duration and token usage.

---

## 5. Decision Rules
1. **Inspection Precedes Execution**: Agents must inspect existing project patterns (`git status`, directory tree, package configs) before executing writes.
2. **Right-Reason Verification**: When an agent introduces a test, it must fail before the fix and pass after the fix. Tests that pass unconditionally are disqualified as false positives.
3. **No Overfitting**: The agent must solve the generalized invariant, not hardcode the literal test fixture string into the application code.
4. **Clean Git Hygiene**: Zero extraneous debug logs, commented-out dead code, or temporary scratchpad files committed to the branch.

---

## 6. The 9 Evaluation Dimensions
1. **Repository Inspection Discipline**: Did the agent read relevant files before modifying them?
2. **Change Precision**: Did the agent touch only the necessary files without polluting the codebase?
3. **Convention Adherence**: Did the agent follow existing TypeScript/Python styles and naming patterns?
4. **Negative Case Coverage**: Did the agent test invalid inputs, or only the happy path?
5. **Flake Resistance**: Did the generated test avoid arbitrary sleeps and race conditions?
6. **Self-Correction & Recovery**: When a test failed, did the agent analyze the stack trace and fix root cause, or flail?
7. **Unsupported Claim Detection**: Did the agent claim "all tests pass" without actually running the test suite?
8. **Token & Step Efficiency**: Did the agent complete the task in minimal tool round-trips?
9. **Security Hygiene**: Did the agent avoid introducing vulnerabilities (SQLi, hardcoded tokens, insecure evals)?

---

## 7. Workflow
```
1. SANDBOX      ──▶ Provision clean git checkout with known bug fixture
2. TASK         ──▶ Deliver task prompt to the agent
3. TRACE        ──▶ Log every tool call, file read, write, and command
4. EXECUTE      ──▶ Run golden verification harness
5. GRADE        ──▶ Score agent across the 9 evaluation dimensions
6. AUDIT        ──▶ Check for hardcoded fixture cheats and assertion weakening
7. SCORECARD    ──▶ Emit comprehensive Agent Engineering Scorecard (0-100)
```

---

## 8. Anti-Patterns
- 🚫 **The "Cheat" Fix**: Hardcoding `if (input === 'test-case-1') return expected;`.
- 🚫 **The Hallucinated Pass**: Claiming "verified green" when zero tests were executed.
- 🚫 **Assertion Weakening**: Deleting an assertion that failed rather than fixing the code.

---

## 9. Failure Handling
- If agent deletes test files to force green CI: Score **0/100 (Disqualified - P0 Invariant Violation)**.
- If agent creates arbitrary sleeps: Deduct 25 points from Flake Resistance score.
- If agent loops without progress: Terminate turn and score recovery capabilities.

---

## 10. Evidence Requirements
`artifacts/agent-eval-<runId>/{tool-trace.json, git-diff.patch, agent-scorecard.json}`.

---

## 11. Output Contract
```markdown
# Agent Evaluation Scorecard: [SCORE]/100
- Inspection Discipline: [PASS | FAIL]
- Test Validity (Failed First): [CONFIRMED]
- Generalization (No Overfitting): [CONFIRMED]
- Assertion Integrity: [PRESERVED]
- Flake Discipline: [ZERO SLEEPS DETECTED]
- Overall Verdict: [ELITE | COMPETENT | OVERFITTING | UNVERIFIED]
```

---

## 12. Verification Checklist
- [ ] Golden verification tests executed in clean sandbox.
- [ ] Agent inspected codebase prior to code modification.
- [ ] No hardcoded cheat logic detected in diff inspection.
- [ ] Generated test proved failing baseline before passing fix.
