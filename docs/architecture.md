# qaforge — AI-Native QA Operating System Architecture

## Overview
`qaforge` is an executable, agent-native QA operating system designed to enable AI coding agents to perform as an elite QA engineering organization.

```
┌────────────────────────────────────────────────────────────────────────┐
│                                 LAYER A                                │
│                          skills/ (Agent Skills)                        │
│                                                                        │
│   qa-enterprise ──▶ qa-orchestrator ──▶ qa-discovery ──▶ qa-risk       │
│         │                                                  │           │
│         ▼                                                  ▼           │
│   qa-impact ──▶ qa-test-generation ──▶ qa-triage ──▶ qa-healing        │
│         │                                                  │           │
│         ▼                                                  ▼           │
│   qa-release-gate ──▶ qa-reporting ──▶ qa-llm-testing ──▶ qa-agent-eval│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Calls via CLI & APIs
┌───────────────────────────────────▼────────────────────────────────────┐
│                                 LAYER B                                │
│                        packages/ (Execution Engine)                    │
│                                                                        │
│   packages/cli/       ── CLI (qa init|discover|risk|impact|triage|heal)│
│   packages/core/      ── Zod QAContext, 12-Stage Lifecycle, Invariants │
│   packages/agents/    ── 8 Specialized Agents (Generator, Triage, etc.)│
│   packages/graph/     ── Quality Graph (Traceability Network)          │
│   packages/healing/   ── Confidence-Tiered Self-Healing Engine         │
│   packages/runners/   ── Runner Adapters (Playwright, Vitest, k6)      │
│   packages/data/      ── Data Factories, Builders, Dynamic Seeds       │
│   packages/reporting/ ── Multi-Audience Reporting (JUnit, Allure)      │
└────────────────────────────────────────────────────────────────────────┘
```

## The 12-Stage QA Lifecycle
`DISCOVER → MODEL → PLAN → GENERATE → VALIDATE → EXECUTE → OBSERVE → TRIAGE → HEAL/FIX → VERIFY → MEASURE → LEARN`
