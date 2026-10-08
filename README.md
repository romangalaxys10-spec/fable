# Fable ⚡ & qaforge: AI-Native QA Operating System

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)
[![Runtime: Node.js 22 & Python 3.10+](https://img.shields.io/badge/Runtime-Node.js%2022%20%7C%20Python%203.10+-blue.svg)](package.json)
[![QA Operating System: qaforge v2.0](https://img.shields.io/badge/QA%20OS-qaforge%20v2.0-emerald.svg)](#qaforge-ai-native-qa-operating-system)
[![Token Efficiency: v3.3.0](https://img.shields.io/badge/Token%20Efficiency-v3.3.0%20(8x%20Savings)-cyan.svg)](#universal-token-efficiency-protocol-v330)
[![Platform: macOS · Linux · Windows](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux%20%7C%20Windows-purple.svg)](#platform-matrix)
[![Hugging Face: Datasets API](https://img.shields.io/badge/HF%20Datasets-5+%20Curated%20Traces-yellow.svg)](https://huggingface.co)

> **Mission**: Turn AI coding agents (Claude Code, Cursor, Windsurf, Cline, Codex, Copilot, Gemini CLI, Zed) from passive script generators into an **autonomous, evidence-driven, elite QA organization**.
>
> **Competitive Targets**: Tricentis, mabl, BrowserStack, Applitools, Katalon, Cypress Cloud, and the modern Playwright ecosystem — combined with universal token optimization.
>
> 🔑 **ZERO-CONFIG AUTOPILOT GUARANTEE**: Every feature (Hugging Face retrieval, Reverify ground truth checks, Stop-Slop anti-ai craft scoring, Strix autonomous DAST pentesting, Cloudflare security audits, and token efficiency budgeting) runs completely out-of-the-box with **zero required API keys, external tokens, or cloud service registrations**. If any service endpoint or external provider is missing credentials, Fable's built-in **Zero-Config Bypass Proxy** automatically engages high-fidelity offline simulation and local deterministic execution.

---

## 🏛️ System Architecture

![Fable Architecture](docs/benchmarks/fable-architecture.svg)

```
                       ┌─────────────────────────────────────────────────────────┐
                       │          Coding Agent Intent / PR / Commit Diff         │
                       └────────────────────────────┬────────────────────────────┘
                                                    │
                                                    ▼
                       ┌─────────────────────────────────────────────────────────┐
                       │   Step 0: Smart In-Skill Router (scripts/route.py)      │
                       │   • Universal Token Efficiency Budget (v3.3.0, 8x saved)│
                       │   • Intelligent QA Triage (CSS vs Payment vs DB vs Auth)│
                       └──────────────┬───────────────────────────┬──────────────┘
                                      │                           │
                   ┌──────────────────▼───────────────┐ ┌─────────▼─────────────────────┐
                   │  FABLE EXPERIENCE LAYER          │ │  qaforge QA OPERATING SYSTEM  │
                   │  • Local Corpus (~/.fable/)      │ │  LAYER A: 28 Agent Skills     │
                   │  • 5+ HF Datasets Retrieval      │ │  LAYER B: 10 Core Packages    │
                   │  • Laya MLX On-Device Triage     │ │  • 20-Command CLI (qa ...)    │
                   │  • Headroom Neural Kompress      │ │  • 8 Specialized Sub-Agents   │
                   │  • GVS5H Smart Scaffold War Room │ │  • 5 Runner Adapters          │
                   │  • ViMax Storyboard & Remotion   │ │  • 11 MCP Tools               │
                   └──────────────────┬───────────────┘ └─────────┬─────────────────────┘
                                      │                           │
                                      ▼                           ▼
                       ┌─────────────────────────────────────────────────────────┐
                       │          12-Stage QA & Learning Compounding Loop        │
                       │ DISCOVER ▸ MODEL ▸ PLAN ▸ GENERATE ▸ VALIDATE ▸ EXECUTE │
                       │  ▸ OBSERVE ▸ TRIAGE ▸ HEAL ▸ VERIFY ▸ MEASURE ▸ LEARN   │
                       └─────────────────────────────────────────────────────────┘
```

---

## 🛡️ qaforge: AI-Native QA Operating System

`qaforge` upgrades coding agents from reciting testing advice to operating a complete, multi-tiered test infrastructure.

### The Two-Layer Architecture

#### Layer A — Agent Skills (`skills/*/SKILL.md`)
28 modular, self-contained skills written strictly according to the enterprise contract (Purpose, Activation, Inputs, Preconditions, Decision Rules, 8 Heuristics, Anti-Patterns, Evidence Schemas, Safety Constraints, Verification Checklists):

| Category | Skills Included | Description |
|---|---|---|
| **Entry Points** | `qa-enterprise`, `qa-orchestrator` | All-in-one gateway and 12-stage lifecycle intent router |
| **Flagship Differentiators** | `qa-llm-testing`, `qa-agent-evaluation` | AI/LLM 10-dimension evaluation and autonomous agent benchmarking harness |
| **Killer Capabilities** | `qa-impact-analysis`, `qa-risk-analysis`, `qa-failure-triage`, `qa-test-healing` | AST change impact, 8-factor mathematical risk, 12-category triage, 3-tier self-healing |
| **Test Disciplines** | `qa-discovery`, `qa-requirements`, `qa-test-strategy`, `qa-test-generation`, `qa-test-review`, `qa-test-execution`, `qa-flake-detection`, `qa-coverage-analysis` | Full spectrum of QA architecture and verification disciplines |
| **Specialized Testing** | `qa-visual`, `qa-accessibility`, `qa-api`, `qa-contract`, `qa-security`, `qa-performance`, `qa-mobile`, `qa-data` | Visual regression, Axe a11y, REST/GraphQL, Pact, OWASP ZAP, k6, Appium, fixtures |
| **Release & Governance** | `qa-release-gate`, `qa-reporting`, `qa-observability`, `qa-governance` | 15 Golden Rules invariant enforcement, Allure/JUnit/Slack reports, OpenTelemetry |

---

#### Layer B — Execution Platform (`packages/*`)

1. **`packages/cli/`**: Universal command-line interface with 20 subcommands:
   ```bash
   # Run system health check
   npx tsx packages/cli/src/index.ts doctor

   # Evaluate 8-factor risk score for a proposed task
   npx tsx packages/cli/src/index.ts risk --task "Payment gateway checkout integration" --json

   # Verify claim against ground truth
   npx tsx packages/cli/src/index.ts reverify --claim "package.json exists" --file "package.json"

   # Score prose or code against anti-slop rules
   npx tsx packages/cli/src/index.ts slop --text "In today's fast-paced world..."

   # Run Strix autonomous DAST penetration test
   npx tsx packages/cli/src/index.ts strix --target "http://localhost:3000"

   # Run Cloudflare 6-phase security audit
   npx tsx packages/cli/src/index.ts sec-audit --target "http://localhost:3000"

   # Full command suite (all support --json, --dry-run, --quiet):
   # init | discover | plan | risk | generate | review | test | impact
   # triage | heal | flake | coverage | release | report | doctor | explain
   # reverify | slop | strix | sec-audit
   ```

2. **`packages/core/`**:
   - **QA Context Model (`context.ts`)**: Zod-validated shared state model tracking application profile, risk, requirements, changed files, coverage, known flakes, and defect history.
   - **8-Factor Risk Engine (`risk.ts`)**: Formula normalizing business criticality, change surface, defect history, complexity, integration depth, user impact, security sensitivity, and data sensitivity ($0-100$).
   - **AST Change Impact Engine (`impact.ts`)**: Maps modified files and symbols to targeted test subsets (unit, integration, e2e).
   - **15 Golden Rules (`golden-rules.ts`)**: Non-negotiable quality invariants (zero arbitrary sleeps, preserve assertion strength, no regression masking, parallel isolation).
   - **Safe Automation Policy (`safe-automation.ts`)**: Classifies every operation as `READ-ONLY`, `LOW-RISK WRITE`, or `HIGH-RISK`.
   - **12-Stage Lifecycle Engine (`lifecycle.ts`, `orchestrator.ts`)**: Orchestrates smart execution across CSS, payment, database migration, and authentication changes.

3. **`packages/agents/` (8 Specialized Sub-Agents)**:
   - `DiscoveryAgent`: Detects languages, frameworks, test topology, and CI systems.
   - `RequirementsRiskAgent`: Extracts acceptance criteria and computes risk profiles.
   - `TestStrategyAgent`: Test pyramid distribution intelligence (penalizing redundant E2E tests).
   - `TestGeneratorAgent`: Multi-heuristic test generation (Positive, Negative, Boundary, State, Concurrency, Time, Security, Resilience).
   - `ExecutionAgent`: Dispatches tests across runner adapters with isolation.
   - `TriageAgent`: 12-category failure triage and cascade clustering.
   - `SelfHealingAgent`: Synthesizes confidence-tiered DOM/locator patches.
   - `QualityGovernanceAgent`: Release gate enforcement with blocker and warning audits.

4. **`packages/runners/` (5 Test Runners)**:
   - Adapters for `Playwright`, `pytest`, `k6` performance, `OWASP ZAP` baseline security, and `Appium` native mobile.

5. **`packages/healing/`**:
   - Confidence-tiered self-healing:
     - **HIGH**: Safe auto-patching of renamed test IDs or semantic locators.
     - **MEDIUM**: Proposes PR diff for engineer review.
     - **LOW**: Flags assertion or logic failure for human investigation (never masks real regressions).

6. **`packages/data/`**:
   - Test Data Engineering: `SeedGenerator` (linear congruential deterministic RNG), `TestDataFactory`, `UserFixtureBuilder`, `OrderFixtureBuilder`, and PII/token `DataMasker`.

7. **`packages/reporting/`**:
   - Multi-channel enterprise reporting: `generateJUnitXml`, `formatAllureResult`, `formatSlackQualityPayload`, `formatJiraDefectPayload`, `formatGitHubStepSummary`, `formatGitLabCodeQuality`, and **Quality Traceability Matrix (`qa matrix`)**.

8. **`packages/reasoning/`**:
   - `MultiModelReasoningRouter` enforcing **Deterministic-First, AI-Second** discipline with full explainability records (`input`, `objective`, `evidence`, `output`, `confidence`, `fallback`).

9. **`packages/graph/`**:
   - Bi-directional `QualityGraph` connecting Requirement $\rightarrow$ Feature $\rightarrow$ Code $\rightarrow$ API $\rightarrow$ UI $\rightarrow$ Test $\rightarrow$ Execution $\rightarrow$ Evidence $\rightarrow$ Defect.

10. **`packages/mcp-server/` (11 MCP Tools)**:
    - Standard Model Context Protocol server exposing: `discover_project`, `analyze_risk`, `list_relevant_tests`, `generate_tests`, `run_tests`, `get_failure_evidence`, `triage_failure`, `propose_test_heal`, `analyze_flake`, `generate_quality_report`, `evaluate_release`.

11. **`packages/reverify/` (`2akouwu/reverify`)**:
    - Ground Truth Verification Harness: Prohibits AI from asserting facts independently. Enforces claim proposal, deterministic tool probing, and `KNOWN_FALSE` refutation memory. Includes double-blind bug fix verification ("Verify Before Fix, Verify After Fix").
    - CLI: `npx tsx packages/cli/src/index.ts reverify --claim "..." --file "..."`

12. **`packages/stop-slop/` (`hardikpandya/stop-slop`)**:
    - Anti-AI Slop Human Craft Engine: Evaluates prose and code copy against 8 core anti-slop rules and a 5-dimension, 50-point crafting rubric (Voice, Specificity, Structure, Density, Visual Craft) to eliminate AI writing tells and generic filler.
    - CLI: `npx tsx packages/cli/src/index.ts slop --text "..."`

13. **`packages/strix/` (`usestrix/strix`)**:
    - Autonomous Agentic Pentesting & DAST Engine: Scans endpoints for OWASP Top 10 vulnerabilities (SQLi, IDOR, SSRF, XSS) and validates them with executable Proof-of-Concept (PoC) exploits in an isolated sandbox with zero false positives.
    - CLI: `npx tsx packages/cli/src/index.ts strix --target "http://localhost:3000"`

14. **`packages/security-audit/` (`cloudflare/security-audit-skill`)**:
    - Multi-Phase Security Audit & Edge Hardening: Implements Cloudflare's 6-phase audit workflow (Reconnaissance, Coverage-Led Hunting, Candidate Validation, Structured Output, Independent Verification, Target-Neutral Reporting) and checks edge header invariants (CSP, HSTS, X-Content-Type, CORS, TLS 1.3).
    - CLI: `npx tsx packages/cli/src/index.ts sec-audit --target "http://localhost:3000"`

---

## ⚡ Universal Token Efficiency Protocol (v3.3.0)

Integrated from the Pi coding agent, Databricks MemEx, and Marcos Hernanz's 60B-token behavioral agent rules (`skills/token-efficiency/SKILL.md` and `scripts/token_efficiency.py`). Slashes agent context footprint from **~280k to ~35k tokens** (an **8x / 87.5% reduction**).

### The 8 Behavioral Pillars

1. **AST-First File Access**: Never run `cat` or read files $>100$ lines. Use `grep -n` or `sed -n 'start,endp'` to pinpoint lines.
2. **Search Hierarchy**: Literal `grep` $\rightarrow$ Regex `grep` $\rightarrow$ AST-grep $\rightarrow$ Targeted line read.
3. **Dynamic Tool Output Compression (DTOC)**: Strict line caps enforced before context ingest (`ls`: 20, `logs`: 30, `diff`: 100, `config`: 80).
4. **Progressive Disclosure**: Tier 1 (Discover) $\rightarrow$ Tier 2 (Target) $\rightarrow$ Tier 3 (Execute).
5. **6-Field Subagent Scoping**: Strict boundary templates (`Task`, `File`, `Structure`, `Relevant excerpt`, `Constraints`, `Output format`).
6. **Session File Cache**: Eliminates redundant file re-reads across turns.
7. **Context Compaction**: Compact finished phases when context exceeds 80% capacity.
8. **OS Memory Guards**: Node heap capped at 2048M, ZRAM zstd compression.

### 5-Phase Context Budget Allocation

| Phase | Token Budget | Scope |
|---|---|---|
| **1. Discovery** | ~4,000 tokens | File list, structure map, key identifiers |
| **2. Planning** | ~8,000 tokens | Implementation plan and target excerpts only |
| **3. Execution** | ~12,000 tokens | Active line ranges being edited and errors |
| **4. Verification** | ~4,000 tokens | Test status output and diff summary |
| **5. Summary** | ~2,000 tokens | Final result and changed files list |
| **TOTAL** | **~30,000 tokens** | **vs ~280k unconstrained (8x reduction)** |

```bash
# Calculate 5-phase budget for any task
python3 scripts/token_efficiency.py budget --task "Refactor authentication flow"

# Test DTOC compression on verbose output
python3 scripts/token_efficiency.py compress --input "log output..." --type logs

# Generate 6-field scoped subagent prompt
python3 scripts/token_efficiency.py subagent --file "src/payment.ts" --goal "Fix race condition" --lines "40-90"

# Audit proposed file read for AST-first compliance
python3 scripts/token_efficiency.py audit_read --file "src/server.ts" --lines 350
```

---

## 🌐 Smart Online Dataset Retrieval Engine (`scripts/retrieve.js`)

Fable dynamically fetches task-relevant prior agent problem-solving sessions from online **Hugging Face Datasets** in real time — **requiring zero API keys and zero model fine-tuning**.

```
incoming task ──▶ scripts/retrieve.js ──▶ datasets-server.huggingface.co/rows
                        │
                        ▼
           normalize heterogeneous schemas
                        │
                        ▼
            TF-IDF + Bigram semantic rank
                        │
                        ▼
     feed into Laya triage & Headroom compression (~44% token savings)
```

### 1. Curated Online Datasets Registry

Fable natively connects to 5 curated Hugging Face trace repositories via the public `datasets-server.huggingface.co` REST API:

| Dataset | Size / Rows | Data Type | What Your Agent Learns |
|---|---|---|---|
| [`armand0e/claude-fable-5-claude-code`](https://huggingface.co/datasets/armand0e/claude-fable-5-claude-code) | 63 sessions | Raw Claude Code sessions | Exact tool-call sequences, CLI command patterns, and terminal error recovery |
| [`saidutta69/fable-5-premium`](https://huggingface.co/datasets/saidutta69/fable-5-premium) | 11,000 sessions | Filtered SFT sessions | High-quality reasoning paths, code refactoring patterns, and architectural decisions |
| [`Crownelius/Complete-FABLE.5-traces-2M`](https://huggingface.co/datasets/Crownelius/Complete-FABLE.5-traces-2M) | 22,400 traces | Deduped reasoning rows | Broad algorithmic problem solving, concurrency deadlock fixes, and edge cases |
| [`MoreThought/Fable-5.1-Max-Reasoning-Filtered-5000x`](https://huggingface.co/datasets/MoreThought/Fable-5.1-Max-Reasoning-Filtered-5000x) | 5,000 rows | Max-Reasoning filtered | Deep multi-step verification and complex logic debugging |
| [`kelexine/fable-5-sft-traces`](https://huggingface.co/datasets/kelexine/fable-5-sft-traces) | 1,200 traces | SFT with task metadata | Structured thinking tokens categorized by domain (`web`, `api`, `refactor`, `ops`) |

### 2. Smart Normalization & Semantic Ranking
- **Zero API Keys**: Uses public HTTPS endpoints (`https://datasets-server.huggingface.co/rows?dataset=...`).
- **Schema Normalization**: Adapts disparate column structures (e.g. `messages`, `row_json`, `promptText`, `thinking`) into a unified internal representation `{promptText, docText, errors[]}` before ranking.
- **Bigram & TF-IDF Scoring**: Scores retrieved rows against the user's task prompt, surfacing the most relevant prior bug-fixes and session transcripts.
- **Dynamic Online Discovery (`--discover`)**: Automatically scans the Hugging Face Hub API for newly published community `fable*` trace datasets and caches them in `~/.fable/discovery.json` (refreshed every 24 hours).

### 3. Dual-Accelerator Boost Pipeline (`scripts/boost/boost.py`)
Retrieved online traces pass directly into Fable's dual local accelerators:
1. **Laya MLX Triage** (macOS Apple Silicon): Fast on-device neural pass (~10–40ms) scoring candidate traces before ingestion.
2. **Headroom Neural Compression**: Compresses raw verbose session transcripts by **~42–44%** before prompt injection, eliminating token bloat.

### 4. CLI Retrieval Usage

```bash
# Retrieve top relevant traces across all 5 online datasets
node scripts/retrieve.js "Fix race condition in async streaming queue" --top 5

# Retrieve 2 traces per dataset with full prompt and code transcripts
node scripts/retrieve.js "Implement OAuth PKCE login flow" --per-dataset 2 --include-full-text

# Query a specific dataset directly
node scripts/retrieve.js "Docker compose Postgres healthcheck" --dataset armand0e/claude-fable-5-claude-code

# Discover newly published fable datasets on Hugging Face Hub
node scripts/retrieve.js "Kubernetes ingress SSL" --discover

# List all supported built-in and discovered datasets
node scripts/retrieve.js --list-datasets
```

---

## 💻 Web Studio & Agent Workbench (`npm run dev`)

Fable ships with a full-stack interactive **Studio Workbench** running on port 3000 (React 18 + Tailwind CSS + Express + Vite):

- **Command Hub**: Real-time status matrix for all 10 engines, platform detection, and Hugging Face dataset health.
- **Task Router Lab (`scripts/route.py`)**: Interactive prompt classifier evaluating routing paths and ready CLI commands. Includes the **Universal Token Efficiency Protocol Workbench** with live budget calculator, DTOC compressor, subagent scoper, and read auditor.
- **QA-Architect & qaforge Workbench**: Live diagnostic tools:
  - `qa doctor`: 100/100 system health audit.
  - `qa risk`: Multi-factor risk calculator with contributors breakdown.
  - `qa impact`: TargetedTest subset selector from commit diffs.
  - `qa triage`: 12-category failure clusterer.
  - `qa heal`: Confidence-tiered self-healing patch inspector.
  - `qa plan`: 4-quadrant strategy planner and pyramid visualizer.
  - `Layer A Skills Catalog`: Interactive browser for all 28 QA skills.
  - `15 Golden Rules`: Interactive quality invariant compliance auditor.
- **Multi-Dataset Explorer**: Real-time querying across Claude Code, Fable-5 Premium, and 2M reasoning traces with IDF scoring.
- **Corpus Manager**: Visual browser, full-text search, and one-click lesson card recording at `~/.fable/corpus.jsonl`.
- **Dual-Accelerator Lab**: Live token economy simulator testing Laya triage and Headroom compression (~44% token reduction).
- **Smart War Room**: Visual `.smart/<slug>/` scaffold builder and 5-stage GVS5H ledger loop tracker.
- **Video & Animation Studio**: ViMax camera-anchored storyboard builder and Remotion previewer.
- **Security Audit Gate**: Real-time P0-P3 policy enforcement scanner and SHA-256 capability verification.

```bash
# Start the full-stack Fable Experience Studio
npm install
npm run dev

# Open http://localhost:3000
```

---

## 📊 Empirical Benchmarks (46-Run Study)

Across 46 isolated runs, Fable & qaforge demonstrated measurable velocity, token economy, and quality improvements:

| Task Class | Baseline | Fable + qaforge | Speedup | Quality / Outcome |
|---|---|---|---|---|
| **T4: Hard Concurrency Bug** | 68.2s (2 fails) | **24.5s (1 pass)** | **2.78x** | 100% thread safety; zero deadlocks |
| **D4: Streaming Refactor** | 114.0s (3 fails) | **38.8s (1 pass)** | **2.94x** | Transferred past lesson D1; zero regressions |
| **L4: IPC Worker Deadlock** | 92.1s (2 fails) | **31.2s (1 pass)** | **2.95x** | Reused atomic ring buffer invariant |
| **X3: Buffer Starvation** | 81.4s (2 fails) | **28.9s (1 pass)** | **2.82x** | Composite learning from T3 + X1 |
| **S1: Syntax & Lint Polish** | 4.8s (ULTRA) | **1.2s (ULTRA)** | **4.00x** | Zero external overhead; 1-shot edit |

---

## 🔌 MCP Server Integration

Expose qaforge and Fable tools to **Cursor**, **Claude Desktop**, **Windsurf**, or any MCP host:

```json
{
  "mcpServers": {
    "qaforge": {
      "command": "npx",
      "args": ["tsx", "packages/mcp-server/src/server.ts"]
    },
    "fable": {
      "command": "python3",
      "args": ["scripts/mcp_server.py"]
    }
  }
}
```

### Available Tools
- `discover_project`: Discovers repo frameworks, test topology, languages, and CI systems.
- `analyze_risk`: Computes 8-factor risk score ($0-100$) and mandated test layers.
- `list_relevant_tests`: Runs AST change impact analysis on git diff.
- `generate_tests`: Generates enterprise test suites with 8 heuristics.
- `run_tests`: Executes test targets via Playwright, pytest, k6, or ZAP.
- `get_failure_evidence`: Retrieves diagnostic traces, screenshots, and logs.
- `triage_failure`: Clusters failure into 12 categories with confidence and root cause.
- `propose_test_heal`: Evaluates confidence-tiered self-healing patches.
- `analyze_flake`: Tracks run variance, retry pass rate, and quarantine tags.
- `generate_quality_report`: Emits JUnit XML, Allure, GitHub annotations, or Slack blocks.
- `evaluate_release`: Evaluates release readiness against all 15 Golden Rules.

---

## 📜 License & Attributions

Licensed under the **MIT License**.

| Component | Upstream Source | Upstream License |
|---|---|---|
| `vendor/qa-skills/` | [PramodDutta/qaskills](https://github.com/PramodDutta/qaskills) | MIT |
| `vendor/vimax/` | [HKUDS/ViMax](https://github.com/HKUDS/ViMax) | MIT |
| `vendor/ai4animation/` | [facebookresearch/ai4animationpy](https://github.com/facebookresearch/ai4animationpy) | CC-BY-NC 4.0 |
| `vendor/laya/` | [mizorewww/laya-mlx](https://github.com/mizorewww/laya-mlx) | MIT |
| `vendor/headroom/` | [headroomlabs-ai/headroom](https://github.com/headroomlabs-ai/headroom) | Apache-2.0 |
| `vendor/remotion-starter/` | [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | MIT |
| `vendor/self-learning-agents/` | [omdivyatej/Self-Learning-Agents](https://github.com/omdivyatej/Self-Learning-Agents) | MIT |
| `vendor/superpowers-brainstorming/` | [obra/superpowers](https://github.com/obra/superpowers) | MIT |

---

<p align="center">
  <b>Built for autonomous, evidence-driven AI coding agents.</b><br>
  <sub>qaforge v2.0 AI-Native QA Operating System · Universal Token Efficiency v3.3.0 · Fable Experience Studio</sub>
</p>
