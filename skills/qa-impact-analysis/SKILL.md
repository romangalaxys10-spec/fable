---
name: qa-impact-analysis
title: Change Impact Analysis & Targeted Test Selection
category: Execution Optimization
author: Principal QA Architect & Systems Staff Engineer
---

# qa-impact-analysis — Change Impact Analysis

Analyzes repository commits, git diffs, and AST symbol changes to calculate the minimal high-confidence test set required to verify a pull request.

---

## 1. Purpose
Replaces brute-force "run everything" approaches with intelligent, deterministic test selection based on AST dependency graphs, route mappings, and database models.

---

## 2. When to Activate
- Triggered automatically on every pull request (`qa impact HEAD~1..HEAD`).
- Before test execution to establish test scope.

---

## 3. Inputs
- Git commit range (`HEAD~1..HEAD` or specific SHA).
- Changed file list and unified diffs.
- Repository dependency graph and test map.

---

## 4. Preconditions
- Git working directory initialized with clean status or staged commits.

---

## 5. Decision Rules
1. If only documentation or asset files are touched, select zero backend tests.
2. If an API route handler is modified, select the route's contract tests and integration suite.
3. If shared utility or core types are changed, expand selection to all dependent services.

---

## 6. Workflow
```
1. DIFF      ──▶ git diff --name-status HEAD~1..HEAD
2. SYMBOLS   ──▶ Extract touched exports, functions, and classes
3. GRAPH     ──▶ Query Quality Graph for features verified by those symbols
4. SELECT    ──▶ Output targeted unit, integration, and E2E test files
5. EXPLAIN   ──▶ Provide clear justification for included and excluded tests
```

---

## 7. Anti-Patterns
- 🚫 Running all 5,000 legacy tests on a single markdown typo.
- 🚫 Excluding integration tests when modifying a public API payload schema.

---

## 8. Failure Handling
If git diff is ambiguous or unable to resolve symbols, fall back to conservative module-level test execution.

---

## 9. Evidence Requirements
`artifacts/impact-<runId>/impact-report.json`.

---

## 10. Safety Constraints
Strictly `READ-ONLY`. Does not modify source code or commit history.

---

## 11. Output Contract
```json
{
  "commitRange": "HEAD~1..HEAD",
  "filesChanged": 3,
  "affectedFeatures": ["Checkout", "Order Processing"],
  "targetedTests": {
    "unit": ["tests/unit/pricing.test.ts"],
    "integration": ["tests/integration/orders-api.test.ts"],
    "e2e": ["tests/e2e/checkout.spec.ts"]
  },
  "rationale": "src/services/payment.ts modified calculateTax(); selected pricing unit tests and checkout E2E journey."
}
```

---

## 12. Verification Checklist
- [ ] Change impact correctly identified touched symbols.
- [ ] Minimal test subset covers 100% of affected functional paths.
