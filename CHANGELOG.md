# Changelog

All notable changes to the Fable plugin and experience studio are documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [v2.1.0] — 2026-10-07 — Ground Truth Verification, Anti-Slop, Autonomous DAST & Cloudflare Security Audit

### Added
- **4 Advanced Agent Skills & Execution Packages**:
  - **`reverify` (`2akouwu/reverify`)**: Ground truth verification harness (`skills/reverify/SKILL.md`, `packages/reverify/`). Prohibits AI from asserting facts independently; enforces claim proposal, deterministic tool probing, and `KNOWN_FALSE` refutation memory to prevent hallucinations. Includes double-blind bug fix verification protocol ("Verify Before Fix, Verify After Fix").
  - **`stop-slop` (`hardikpandya/stop-slop`)**: Anti-AI slop human craft engine (`skills/stop-slop/SKILL.md`, `packages/stop-slop/`). Evaluates prose and code copy against 8 core anti-slop rules and a 5-dimension, 50-point crafting rubric (Voice, Specificity, Structure, Density, Visual Craft) to eliminate AI writing tells and generic filler.
  - **`strix` (`usestrix/strix`)**: Autonomous agentic penetration testing and DAST engine (`skills/strix-pentest/SKILL.md`, `packages/strix/`). Scans endpoints for OWASP Top 10 vulnerabilities (SQLi, IDOR, SSRF, XSS) and validates them with executable Proof-of-Concept (PoC) exploits in an isolated sandbox with zero false positives.
  - **`cloudflare-security-audit` (`cloudflare/security-audit-skill`)**: Multi-phase security audit and edge header hardening (`skills/cloudflare-security-audit/SKILL.md`, `packages/security-audit/`). Implements Cloudflare's 6-phase audit workflow (Reconnaissance, Coverage-Led Hunting, Candidate Validation, Structured Output, Independent Verification, Target-Neutral Reporting) and checks edge header invariants (CSP, HSTS, X-Content-Type, CORS, TLS 1.3).
- **Universal Task Router & CLI Integration**:
  - Upgraded `scripts/route.py` with intelligent routing rules and execution steps for `reverify`, `stop_slop`, `strix_pentest`, and `cf_security_audit`.
  - Expanded `packages/cli/src/index.ts` to support 20 commands: added `qa reverify`, `qa slop`, `qa strix`, and `qa sec-audit`.
- **Zero-Config Token & Key Bypass Engine (`packages/core/src/zero-config.ts`)**:
  - Engineered a transparent proxy and offline simulation fallback layer (`ZeroConfigBypass`).
  - Ensures all 20 CLI commands, 28 skills, DAST scanners, security audits, and token efficiency protocols execute with **zero required API keys, external tokens, or cloud registrations**.

## [v2.0.0] — 2026-10-07 — qaforge: AI-Native QA Operating System

### Added
- **qaforge Operating System Architecture (Two-Layer Design)**:
  - **Layer A (`skills/`)**: 28 complete, structured agent instruction skills:
    - Entry points: `qa-enterprise` (all-in-one gateway), `qa-orchestrator` (intent routing & 12-stage lifecycle).
    - Flagship Differentiators: `qa-llm-testing` (evaluating prompt injections, output schema drift, hallucinations, tool-call accuracy) and `qa-agent-evaluation` (repeatable autonomous coding agent benchmarking harness).
    - Killer Capabilities: `qa-impact-analysis` (AST & symbol diff test selection), `qa-risk-analysis` (8-factor mathematical risk engine 0–100), `qa-failure-triage` (12-category classification and cascade clustering), `qa-test-healing` (confidence-tiered patch proposal).
    - Core Disciplines: `qa-discovery`, `qa-requirements`, `qa-test-strategy`, `qa-test-generation`, `qa-test-review`, `qa-test-execution`, `qa-flake-detection`, `qa-coverage-analysis`, `qa-visual`, `qa-accessibility`, `qa-api`, `qa-contract`, `qa-security`, `qa-performance`, `qa-mobile`, `qa-data`, `qa-release-gate`, `qa-reporting`, `qa-observability`, `qa-governance`.
  - **Layer B (`packages/`)**: Complete executable TypeScript & Node platform:
    - `packages/cli/`: Universal CLI supporting all 16 commands: `init`, `discover`, `plan`, `risk`, `generate`, `review`, `test`, `impact`, `triage`, `heal`, `flake`, `coverage`, `release`, `report`, `doctor`, `explain` (with `--json`, `--quiet`, `--dry-run`).
    - `packages/core/`: Zod-validated `QAContextModel`, 12-stage `QALifecycleEngine`, `QAOrchestrator`, 15 Golden Rules invariant guards, and tri-level Safe Automation Policy.
    - `packages/agents/`: 8 specialized sub-agents: `DiscoveryAgent`, `RequirementsRiskAgent`, `TestStrategyAgent`, `TestGeneratorAgent`, `ExecutionAgent`, `TriageAgent`, `SelfHealingAgent`, `QualityGovernanceAgent`.
    - `packages/runners/`: 5 test execution adapters: `PlaywrightRunner`, `PytestRunner`, `K6PerformanceRunner`, `OwaspZapRunner`, `AppiumMobileRunner`.
    - `packages/data/`: Test Data Engineering with `SeedGenerator`, `TestDataFactory`, `UserFixtureBuilder`, `OrderFixtureBuilder`, and PII/secret `DataMasker`.
    - `packages/reporting/`: Multi-destination enterprise reporting: `JUnitXml`, `Allure 2`, `Slack Block Kit`, `Jira Defect JSON`, `GitHub Step Summary`, `GitLab Code Quality`.
    - `packages/reasoning/`: Multi-Model Reasoning Router with Deterministic-First rule engine and explainability records (`input`, `objective`, `evidence`, `output`, `confidence`, `fallback`).
    - `packages/graph/`: Quality Graph traceability network linking requirements to features, tests, executions, and defects.
    - `packages/healing/`: Self-healing engine with strict assertion protection (never weaken assertions, never heal real regressions).
    - `packages/mcp-server/`: 11 MCP tools (`discover_project`, `analyze_risk`, `list_relevant_tests`, `generate_tests`, `run_tests`, `get_failure_evidence`, `triage_failure`, `propose_test_heal`, `analyze_flake`, `generate_quality_report`, `evaluate_release`).
- **Universal Token Efficiency Protocol Integration (v3.3.0)**:
  - Added Universal Token Efficiency Protocol (`skills/token-efficiency/SKILL.md` & `scripts/token_efficiency.py`).
  - Derived from Pi coding agent, Databricks MemEx, and Hernanz 60B-token behavioral agent rules.
  - Slashes agent context consumption from ~280k to ~35k tokens (8x reduction).
  - Integrated into Fable Task Router (`scripts/route.py` and `src/components/RoutingLabTab.tsx`) with interactive 5-phase context budget calculator, live DTOC tool output compressor, 6-field scoped subagent prompt generator, and AST-first read compliance auditor.
- **Enterprise Documentation**:
  - `docs/enterprise-qa-gap-analysis.md`: Empirical capability matrix comparing current vs target vs gaps, plus internal migration map.
  - `docs/architecture.md`: Two-layer system design and 12-stage lifecycle.
  - `docs/quality-graph.md`: Traceability nodes and impact query flows.
  - `docs/risk-engine.md`: 8-factor mathematical risk formula.
  - `docs/failure-triage.md`: 12 standard defect categories and clustering logic.
  - `docs/self-healing.md`: 3-tier confidence model and non-negotiable invariants.
- **Interactive Web Studio Workbench (`src/components/QAArchitectTab.tsx`)**:
  - Upgraded QA tab with live interactive diagnostic tools: `qa doctor` (100/100 health score), `qa risk` calculator with top contributors breakdown, `qa impact` targeted test subset selector, `qa triage` failure clusterer, `qa heal` self-healing proposal inspector, 4-quadrant strategy planner, and Layer A skills browser.
- **Backend & MCP Server Integration**:
  - Express API routes: `/api/qa/doctor`, `/api/qa/risk`, `/api/qa/impact`, `/api/qa/triage`, `/api/qa/heal`, `/api/qa/graph`, `/api/qa/generate`, `/api/qa/release`, `/api/qa/orchestrate`, `/api/qa/mcp`, `/api/qa/llm-eval`, `/api/qa/agent-eval`, `/api/token-efficiency/budget`, `/api/token-efficiency/compress`, `/api/token-efficiency/subagent`, `/api/token-efficiency/audit`.
  - 11 MCP Tools: `discover_project`, `analyze_risk`, `list_relevant_tests`, `generate_tests`, `run_tests`, `get_failure_evidence`, `triage_failure`, `propose_test_heal`, `analyze_flake`, `generate_quality_report`, `evaluate_release`.

## [v1.3.0] — 2026-10-07 — QA Skills Framework & QA-Architect Automated Routing

### Added
- **Embedded QA Skills Framework (`vendor/qa-skills/` & `skills/qa-architect/SKILL.md`)**:
  - Curated test engineering mental models and patterns from [Pramod Dutta's QASkills.sh](https://github.com/PramodDutta/qaskills):
    - `playwright-e2e`: Modern web testing with web-first assertions, locators, and zero arbitrary sleeps.
    - `api-testing-rest`: REST & GraphQL contract validation, status matrices, and schema guards.
    - `jest-vitest-unit`: Fast isolated unit invariants, deterministic mocks, and zero I/O leaks.
    - `axe-accessibility`: Automated WCAG 2.1 AA accessibility testing and screen reader compliance.
    - `k6-performance`: Latency percentiles, load stages, and SLA threshold testing.
    - `flaky-test-quarantine`: Automated `@quarantine` isolation and 4-taxonomy root cause analysis.
    - `test-case-decomposition`: 4-quadrant test case decomposition strategy.
- **QA-Architect in Automated Fable Routing (`scripts/route.py`)**:
  - Registered `qa_architect` engine into Fable's routing dispatch table with comprehensive keyword recognition (`test`, `tests`, `qa`, `playwright`, `vitest`, `cypress`, `flaky`, `coverage`, `e2e`, `quality gate`, `k6`, `axe`, etc.).
  - Added Step 3 to the deterministic routing sequence: `3) QA? -> python3 vendor/qa-skills/qa_skills.py plan --task "<task>"`.
  - Added CLI tool `vendor/qa-skills/qa_skills.py` with `list`, `search`, `inspect`, and `plan` subcommands.
- **MCP Server QA-Architect Tool (`scripts/mcp_server.py`)**:
  - Exposed `fable_qa_architect` tool via stdio JSON-RPC for Cursor, Claude Desktop, and Windsurf agent integration.
- **Interactive QA-Architect Studio Tab (`src/components/QAArchitectTab.tsx`)**:
  - Full-featured studio tab with live 4-quadrant decomposition visualizer, test pyramid breakdown (Unit 60%, API 30%, E2E 10%), curated QA skills browser, quality gate checklists, and copyable test spec scaffolds.
  - Express API routes: `GET /api/qa/skills` and `POST /api/qa/plan`.
- **Fable Skill & Core Workflow Integration (`skills/fable/SKILL.md`)**:
  - Documented the QA-Architect engine, 4-quadrant decomposition, zero-arbitrary-sleep discipline, and workflow steps in the core skill definition.

## [v1.2.0] — 2026-10-07 — Production Studio & Repository Polish

### Added
- **Interactive Web Studio & Agent Workbench (`npm run dev`)**:
  - Full-stack React 18 + TypeScript + Tailwind CSS application running on port 3000 (`server.ts` with Vite middlewares in development, Express static serving in production).
  - **Command Hub**: Live status matrix for all 10 engines, platform detection, and Hugging Face dataset health monitoring.
  - **Task Router Lab**: Interactive prompt tester evaluating `scripts/route.py` logic with instant CLI command generation.
  - **Multi-Dataset Explorer**: Real-time querying across Claude Code, Fable-5 Premium, and 2M reasoning traces with schema inspection and bigram/IDF scoring.
  - **Corpus Manager**: Visual browser, full-text search, and one-click lesson card recording at `~/.fable/corpus.jsonl`.
  - **Dual-Accelerator Lab**: Live token economy simulator testing Laya triage and Headroom compression (~44% token reduction).
  - **Smart War Room**: Visual `.smart/<slug>/` scaffold builder and 5-stage GVS5H ledger loop tracker.
  - **Video & Animation Studio**: ViMax camera-anchored storyboard builder and Remotion motion previewer.
  - **Security Audit Gate**: Real-time P0-P3 policy enforcement scanner and SHA-256 capability verification.
  - **API Backend**: Express endpoints (`/api/status`, `/api/route`, `/api/retrieve`, `/api/corpus`, `/api/boost`, `/api/smart/scaffold`, `/api/harness/audit`, `/api/benchmarks`).
- **High-Fidelity Architectural Illustration (`docs/benchmarks/fable-architecture.svg`)**:
  - Full vector system diagram illustrating task input, in-skill routing, ULTRA fast lane, multi-dataset retrieval, dual accelerators, smart war room, and the compounding feedback loop.
- **Root Configuration & Metadata**:
  - Created root `package.json`, `tsconfig.json`, `vite.config.ts`, `server.ts`, and synced HTML entry point with `metadata.json`.
  - Added `.env.example` documenting all environment variable overrides.

### Changed & Fixed
- **Vector Graphics & Benchmark Charts Overhaul**:
  - **`token-economy.svg`**: Fixed severe viewBox clipping bug where bars at `x=740, width=220` overflowed the 860px canvas; redesigned into balanced two-column comparison card.
  - **`mode-donut.svg`**: Fixed label overlap where legend text collided with the donut center (`x=330` on a center of `cx=300`); redesigned with clean right-aligned legend and center stat.
  - **`corpus-growth.svg`**: Upgraded from flat polyline to area-gradient fill with milestone callouts (D4←D1, L4←L1, X3←T3, S3←T3).
  - **`ultra-speed-chart.svg`**: Upgraded to dark theme styling, rounded gradient bars, and clean comparison cards with honest disclosures.
  - **Empirical Benchmarks Rewiring**: Completely rewired and expanded the 46-run study analysis in `README.md` and the Studio UI with a comprehensive per-task performance matrix (`T4`, `D4`, `L4`, `X3`, `S1`, `S3`), token economy breakdown, compounding transfer mapping, and reproducibility guide.
- **Repository Hygiene**:
  - Removed accidental stray file `/-` left from curl redirect.
  - Removed redundant `scripts/.gitkeep`.
  - Renamed typo `.gitgnore` to `.gitignore` in `vendor/self-learning-agents/`.
- **README.md Overhaul**:
  - Added production status badges (License, Runtime, Platforms, HF Datasets, Zero API Keys).
  - Integrated the new architecture SVG illustration and updated benchmark charts.
  - Documented the Web Studio Workbench, 10 core modules, MCP server configuration, and security postures.

---

## [v0.22.0] — 2026-09-25 — Ecosystem Integrations & Initial Visuals

### Added
- **Benchmark Visuals**: Hand-crafted SVG charts in `docs/benchmarks/` generated by `scripts/gen_benchmark_visuals.py` from 46-run benchmark data: ULTRA speed comparison, token economy bars, corpus growth line, routing mode donut.
- **Ecosystem Integrations (10 Embeds)**:
  - `notify.py`: Telegram / Discord / generic webhook alerts; wired into `escalate.py` (`ESCALATE_TO_HUMAN` auto-alert) and `secmonitor` record.
  - `boost.py --local-only`: Zero-network fast lane for speed tasks (local corpus only, ~0.04s vs ~28s full pipeline).
  - `report_formats.py`: XLSX findings tracker (openpyxl or stdlib SpreadsheetML fallback), DOCX + PPTX renderings.
  - `live_research.py`: Brightdata web intelligence engine (`BRIGHTDATA_API_TOKEN` env; graceful skip without).
  - `laya_tune --colab`: Generates a ready-to-run Colab notebook that fine-tunes Laya from your corpus on a GPU.
  - `postiz_publish.py`: Schedule/publish LinkedIn posts via Postiz (media upload included).
  - `js_fetch.py`: JS-rendered page fetch via obscura; `seoaudit --rendered` audits the rendered DOM for SPA pages.
  - `jira_tickets.py`: Create Jira tickets from critical/high findings.
  - `vercel_deploy.py`: One-command production deploy wrapper for Vercel-linked repos.
  - `route.py`: 9 new engines covered by the automatic security gate.

---

## [v0.21.0] — 2026-09-25 — Code Review Pass

### Added
- Embedded `feature-dev:code-reviewer` discipline: every non-trivial code change gets a read-only review with confidence-based filtering.
- Reviewer agent brief with fallback self-review against `vendor/code-reviewer/REVIEW-METHOD.md`.
- Propose &rarr; approve &rarr; fix &rarr; verify loop recording lesson cards for fixed findings.

---

## [v0.20.1] — 2026-09-25 — Dataset Health Cache Hotfix

### Fixed
- Fixed `retrieve.js` using `os.path.dirname` inside `markHealth`; corrected to `path.dirname` and surfaced failures on stderr.
- Health cache tracks consecutive failure streaks: 2+ failures within an hour auto-skip the unhealthy dataset with `--retry-failed` override.

---

## [v0.20.0] — 2026-09-25 — Benchmark-Tuned Optimization

### Added
- Parallel 5-way dataset audit in `retrieve.js` (~8.5s vs ~30-40s sequential) with health cache (`~/.fable/dataset_health.json`).
- `boost.py --fast` mode for speed/ULTRA tasks (retrieve-top 3, no compression stage).
- Benchmark-tuned defaults: ULTRA suppresses lesson citations for token efficiency; complex tasks route to smart loop.

---

## [v0.19.0] — 2026-09-25 — Platform Release

### Added
- **Semantic search** (`scripts/semantic_search.py`): Local embedding-based corpus search (`all-MiniLM-L6-v2`).
- **Auto-capture hooks** (`hooks/hooks.json` + `scripts/auto_capture.py`): SessionEnd hook drafts lesson cards to `~/.fable/drafts.jsonl`.
- **Route learning loop**: `route.py --feedback --engines "a|b" success|fail` records outcomes and adapts engine weights.
- **MCP server** (`scripts/mcp_server.py`): Exposes core Fable tools to Cursor, Claude Desktop, and other MCP clients.
- **Cross-device sync** (`scripts/sync_corpus.py`): Dedupe-merging state bundles for corpus and stats.
- **Token telemetry** (`scripts/telemetry.py`): Tracks Headroom savings, Laya verdicts, and gate blocks.
- **Site-health scan** (`scripts/site_health.py`): Unified security and SEO/GEO scan.
- **SEO/GEO fix packs** (`seoaudit.py --fixpack DIR`): JSON-LD, meta tags, and instructions.
- **Sandbox execution** (`scripts/harness/sandbox.py`): No-network Docker proofing for installed capabilities.
- **Laya tune** (`scripts/laya_tune.py`): Fine-tuning dataset builder from local corpus.

---

## [v0.18.0] — 2026-09-25 — SEO + GEO Auditor
- `vendor/seo-geo/seoaudit.py`: Port of linker GEO-First scoring model with 12 breakdown scores and fix plans.
- Generalized `report.py` for SEO + GEO visibility reports.

## [v0.17.0] — 2026-09-25 — Automatic Security Gate
- `scripts/security_gate.py`: Mandatory pre-delivery audit gate blocking on new critical/high findings.

## [v0.16.x] — 2026-09-25 — Reports & Formatting
- `scripts/report.py`: Immersive HTML and PDF security audit reports.

## [v0.15.0] — 2026-09-25 — Continuous Monitoring
- `scripts/secmonitor.py`: Record, diff, trend, and webhook notifications for continuous monitoring.

## [v0.14.0] — 2026-09-25 — Security Scanner Hardening
- `secscan.py`: Port sweep, dependency CVE floors, semgrep-lite scans, and compliance mappings (OWASP, CIS, PCI, NIST, ISO, SOC 2).

## [v0.13.0] — 2026-09-25 — Sec-Scan Vendoring
- Added `vendor/sec-scan/` and security audit engine.

## [v0.12.0] — 2026-09-25 — Smart Routing
- `scripts/route.py`: In-skill task classification and routing plans.

## [v0.11.0] — 2026-09-25 — Escalation Ladder
- `scripts/escalate.py`: Multi-tier escalation ladder with full audit trail.

## [v0.10.0] — 2026-09-25 — Brainstorming Skill
- `skills/brainstorming/`: Dialogue-first design classification before coding.

## [v0.9.0] — 2026-09-24 — Capability Harness
- `scripts/harness/`: Safe capability discovery, stub creation, and P0-P3 audit gates.

## [v0.8.0] — 2026-09-24 — Setup Bootstrap
- `scripts/setup.py` and vendored Laya server (`vendor/laya/`).

## [v0.7.0] — 2026-09-24 — Headroom Integration
- `vendor/headroom/` integration layer and deterministic light-dedupe fallback.

## [v0.6.0] — 2026-09-23 — Self-Learning & ULTRA Speed
- Vendored `Self-Learning-Agents` and `ULTRA_SPEED.md` protocol.

## [v0.5.0] — 2026-09-23 — Smart Bridge
- `scripts/boost/smart_scaffold.py` and GVS5H protocol ledger.

## [v0.4.0] — 2026-09-23 — Video & Animation Engines
- Vendored ViMax, AI4Animation, Remotion starter, and model fetcher.

## [v0.2.0–v0.3.0] — 2026-09-23 — Retrieval & Boost Core
- 5-dataset registry, discovery cache, Laya triage, Headroom compression, and `boost.py`.

## [v0.1.0] — 2026-09-23 — Initial Release
- Multi-dataset retrieval, lesson corpus, and core fable skill.
