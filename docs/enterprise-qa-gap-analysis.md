# Enterprise QA Gap Analysis & Capability Matrix: qaforge vs Legacy Skill Libraries

**Target System**: `qaforge` — AI-Native QA Operating System  
**Evaluation Standard**: Enterprise QA Standards (Tricentis, mabl, BrowserStack, Applitools, Cypress Cloud, Playwright ecosystem)  
**Date**: October 2026  
**Auditor**: Principal QA Architect & Systems Staff Engineer  

---

## 1. Executive Summary

This audit assesses the transition from a passive QA prompt/skill library (`qaskills` / `qa-architect` v1.0) into **`qaforge`**: an executable, agent-native QA operating system.

### The Fundamental Paradigm Shift
| Metric | Legacy Skill Library | qaforge AI-Native QA OS |
|---|---|---|
| **Mode of Operation** | Recites advice & prompt templates | Executes deterministic analysis, runs tests, triages failures |
| **Reasoning Architecture** | AI-only one-shot test generation | **Deterministic First, AI Second** (diff, AST, graph, then semantic AI) |
| **Test Selection** | "Run everything" or random guesses | **Change Impact Analysis (`qa impact`)** based on commit symbol diffs |
| **Risk Modeling** | Qualitative labels ("high/medium/low") | **Quantitative 8-factor formula (0–100)** with explicit contributors |
| **Failure Response** | "Read the error message" | **12-Category Triage Engine** + Root Cause Clustering (Primary vs Cascade) |
| **Healing** | Prompts to modify tests (risks weakening) | **Confidence-Tiered Self-Healing** with strict invariant preservation |
| **AI Evaluation** | None | **Flagship LLM & Agent Evaluation Harness** (injections, tools, drift) |
| **Traceability** | None | **Quality Graph** (Requirement → Feature → Code → API → UI → Test → Defect) |

---

## 2. Enterprise Capability Matrix (Current vs Target vs Gap)

| Domain | Current Implementation (Legacy) | Target Architecture (`qaforge`) | Gap Status | Action Plan |
|---|---|---|---|---|
| **1. Change Impact Analysis** | None. Agent runs entire test suite or asks user. | AST & git diff parser identifying affected features, routes, and minimal test sets (`qa impact HEAD~1..HEAD`). | **CRITICAL GAP** | Build `packages/core/src/impact.ts` + git symbol diff engine. |
| **2. Risk Engine** | Heuristic keyword matching in prompt text. | 8-Factor quantitative risk algorithm normalized 0–100 with top 5 contributors breakdown. | **HIGH GAP** | Implement `packages/core/src/risk.ts` with business & surface weights. |
| **3. Quality Graph** | Flat directory of tests. No requirement linkage. | Bi-directional graph: Requirement ↔ Acceptance Criterion ↔ Feature ↔ Test ↔ Defect. | **CRITICAL GAP** | Build `packages/graph/` for graph modeling & queries. |
| **4. Test Generation Pipeline** | One-shot code generation template. | 12-stage lifecycle: Requirements → Criteria → 8 Heuristics (Happy, Negative, Boundary, Concurrency, etc.) → Tests. | **HIGH GAP** | Implement `packages/agents/src/generator-agent.ts`. |
| **5. Failure Triage** | Raw stdout dump. | 12 Category classification (Real Regression, Flake, Selector, Env, etc.) + primary vs cascade clustering. | **CRITICAL GAP** | Implement `packages/agents/src/triage-agent.ts`. |
| **6. Self-Healing** | None. Manual re-prompting. | 3-Tier confidence engine (HIGH: auto-patch, MEDIUM: propose, LOW: explain) with 4 Golden Invariants. | **CRITICAL GAP** | Build `packages/healing/` with strict assertion protection. |
| **7. Flake Intelligence** | Basic quarantine advisory. | Quantitative Flake Score, 4-taxonomy root cause analysis, automated `@quarantine` management. | **MEDIUM GAP** | Formalize `packages/core/src/flake.ts`. |
| **8. System Diagnostics** | Manual bash commands. | `qa doctor` with health score 0–100 across runtimes, drivers, ports, and configs. | **HIGH GAP** | Implement `packages/cli/src/doctor.ts`. |
| **9. LLM & Agent Testing** | None. | Flagship evaluation skills: prompt injection, schema drift, hallucination, tool-call accuracy. | **FLAGSHIP GAP** | Implement `skills/qa-llm-testing/` and `skills/qa-agent-evaluation/`. |
| **10. Safe Automation Policy** | Unconstrained tool execution. | Tri-level safety governance: READ-ONLY, LOW-RISK WRITE, HIGH-RISK (explicit confirmation required). | **CRITICAL GAP** | Implement `packages/core/src/safe-automation.ts`. |

---

## 3. Internal Backward-Compatibility Migration Map

Existing skills and assets from `vendor/qa-skills/seed-skills/` are strictly **preserved** and mapped to new modular skills:

| Legacy Skill (`seed-skills/`) | New qaforge Skill (`skills/`) | Execution Package (`packages/`) | Migration & Enhancement |
|---|---|---|---|
| `playwright-e2e` | `skills/qa-test-generation/SKILL.md`<br>`skills/qa-test-execution/SKILL.md` | `packages/runners/`<br>`packages/healing/` | Upgraded to Component Object Model, semantic locators, traces, and self-healing. |
| `api-testing-rest` | `skills/qa-api/SKILL.md`<br>`skills/qa-contract/SKILL.md` | `packages/runners/` | Upgraded to 7-tier status matrix, Zod/JSON schema guards, and contract testing. |
| `jest-vitest-unit` | `skills/qa-test-generation/SKILL.md` | `packages/runners/` | Upgraded with mutation-aware testing and deterministic isolation. |
| `axe-accessibility` | `skills/qa-accessibility/SKILL.md` | `packages/runners/` | Upgraded with focus trapping, ARIA roles, and WCAG 2.1 AA automated auditing. |
| `k6-performance` | `skills/qa-performance/SKILL.md` | `packages/runners/` | Upgraded with percentile thresholds ($p_{95} < 300\text{ms}$) and stage ramping. |
| `flaky-test-quarantine` | `skills/qa-flake-detection/SKILL.md` | `packages/core/` | Upgraded with 4-taxonomy classification and automated quarantine registry. |
| `test-case-decomposition` | `skills/qa-requirements/SKILL.md`<br>`skills/qa-test-strategy/SKILL.md` | `packages/agents/` | Expanded from 4 quadrants into full 8-heuristic enterprise decomposition. |

---

## 4. Architectural Invariants (The 15 Golden Rules)

Every tool, agent, and runner in `qaforge` programmatically enforces these invariants:

1. **Never weaken an assertion** to make a test pass.
2. **Never hide a regression** behind retries.
3. **Never use arbitrary sleeps** (`waitForTimeout`) as a first fix.
4. **Never claim verification** without execution evidence.
5. **Never generate massive redundant E2E suites** (penalize inverted pyramid).
6. **Never destroy test isolation** for speed.
7. **Never auto-delete tests** without strong evidence.
8. **Never expose secrets** in test artifacts or evidence bundles.
9. **Never perform destructive production actions** without explicit confirmation.
10. **Always distinguish product defects** from test defects.
11. **Prefer the smallest test** that catches the defect.
12. **Preserve reproducibility** with deterministic seeds and state.
13. **Preserve evidence bundles** (traces, screenshots, console logs, network diffs).
14. **Explain every AI decision** (input, objective, evidence, confidence, fallback).
15. **Optimize for signal**, not test count.
