---
name: qa-orchestrator
title: QA Intent Routing & Lifecycle Orchestration Engine
category: Orchestration
author: Principal QA Architect & Systems Staff Engineer
---

# qa-orchestrator — QA Intent Routing & Lifecycle Engine

Directs intent classification and coordinates specialized QA sub-agents through the 12-stage enterprise quality lifecycle.

---

## 1. Purpose
Determines exactly which QA engines and test layers must engage for any given code change or user request, avoiding wasted compute (e.g. CSS edits never trigger 4,000 API tests; payment updates trigger full adversarial verification).

---

## 2. When to Activate
- Initial step of any quality-related task or pull request review.
- When an agent needs to transition between testing lifecycle phases.

---

## 3. Inputs
- User prompt or PR description.
- Git commit range (`HEAD~1..HEAD`) and changed file paths.

---

## 4. Preconditions
- Target codebase accessible in working directory.
- `packages/core/src/context.ts` schema loaded.

---

## 5. Decision Rules
- **CSS / Documentation Change**: Route to visual smoke tests only; skip deep backend API suites.
- **Payment / Financial Logic Change**: Elevate risk to Critical (P0); route to unit pricing invariants, API contract tests, and Playwright checkout flows.
- **Database Migration**: Route to data-integrity and rollback tests.
- **Auth Boundary Modified**: Route to security fuzzing, session token tests, and access control matrices.

---

## 6. Workflow
```
1. CLASSIFY     ──▶ Parse commit diff and task keywords
2. CONTEXT      ──▶ Initialize Zod-validated QAContextModel
3. SELECT       ──▶ Select targeted sub-agent sequence
4. DISPATCH     ──▶ Execute sub-agents with shared context
5. SYNTHESIZE   ──▶ Compile unified Quality Scorecard
```

---

## 7. Anti-Patterns
- 🚫 Blind "run-all" execution on trivial cosmetic edits.
- 🚫 Skipping adversarial security reviews when modifying token or auth code.

---

## 8. Failure Handling
If any lifecycle phase detects a blocker, the orchestrator halts downstream deployment and emits structured failure diagnostics.

---

## 9. Evidence Requirements
`artifacts/orchestration-<runId>/routing-decision.json`.

---

## 10. Safety Constraints
The orchestrator operates in `READ-ONLY` mode during routing and planning.

---

## 11. Output Contract
```json
{
  "intent": "PR_QUALITY_AUDIT",
  "riskTier": "HIGH",
  "dispatchedSkills": ["qa-impact-analysis", "qa-test-generation", "qa-release-gate"],
  "skippedSkills": ["qa-mobile", "qa-visual"],
  "rationale": "Backend API change affecting checkout pricing; mobile and visual regression bypassed."
}
```

---

## 12. Verification Checklist
- [ ] Appropriate test layers selected based on changed files.
- [ ] Zero unnecessary full-suite executions on trivial commits.
