# Fable ⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)
[![Runtime: Node.js 22 & Python 3.10+](https://img.shields.io/badge/Runtime-Node.js%2022%20%7C%20Python%203.10+-blue.svg)](package.json)
[![Platform: macOS · Linux · Windows](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux%20%7C%20Windows-emerald.svg)](#platform-matrix)
[![Hugging Face: Datasets API](https://img.shields.io/badge/HF%20Datasets-5+%20Curated%20Traces-yellow.svg)](https://huggingface.co)
[![Core Loop: Zero API Keys](https://img.shields.io/badge/Core%20Loop-Zero%20API%20Keys-purple.svg)](#why-retrieval--distillation-instead-of-fine-tuning)

**A self-improving experience layer and studio workbench for AI coding agents.** Fable retrieves real-world agent session traces from the *fable-family* Hugging Face datasets, accelerates them with two local engines (on-device relevance triage + context compression), routes hard tasks into an adversarial multi-agent ledger loop, generates realistic video/animation, and distills every completed task into a local lesson corpus — so your agent gets measurably better at **your** work over time.

No API keys for the core loop. No model retraining. The only required network egress is the public Hugging Face datasets API.

---

## 🏛️ System Architecture

![Fable Architecture](docs/benchmarks/fable-architecture.svg)

```
task ──▶ search local corpus ──▶ retrieve fable datasets (5+ / --discover)
         │                              │
         │                              ▼
         │                     Laya triage (macOS/Apple Silicon, ~10-40ms)
         │                     (non-Mac: skipped → Headroom-only boost)
         │                              │
         │                              ▼
         │                     Headroom compression (tokens ↓)
         ▼                              ▼
   hard task? ──yes──▶ smart_scaffold.py ──▶ GVS5H ledger loop (plan ▸ ideate ▸
         │ no                (.smart/<slug>/)   test-spec ▸ work ▸ verify)
         ▼                              │
   do the work  ◀───────────────────────┘
         │
         ▼
   record lesson card (corpus) + SelfLearner.save_feedback (embeddings)
         │
         └──▶ next similar task starts smarter
```

---

## 💻 Web Studio & Agent Workbench (`npm run dev`)

Fable ships with a full-stack interactive **Studio Workbench** running on port 3000 (React + Express + Vite):

- **Command Hub**: Real-time status matrix for all 10 engines and Hugging Face datasets.
- **Task Router Lab**: Interactive prompt classifier evaluating `route.py` logic with live CLI command generation.
- **Multi-Dataset Explorer**: Real-time querying across Claude Code, Fable-5 Premium, and 2M reasoning traces with IDF scoring.
- **Corpus Manager**: Visual browser, full-text search, and one-click lesson card recording at `~/.fable/corpus.jsonl`.
- **Dual-Accelerator Lab**: Live token economy simulator testing Laya triage and Headroom compression (~44% token reduction).
- **Smart War Room**: Visual `.smart/<slug>/` scaffold builder and 5-stage GVS5H ledger loop tracker.
- **Video & Animation Studio**: ViMax storyboard generator with camera-anchored shot schemas and Remotion motion previews.
- **Security Audit Gate**: Real-time P0-P3 policy enforcement scanner and SHA-256 capability verification.

```bash
# Start the Fable Experience Studio
npm install
npm run dev
# Open http://localhost:3000
```

---

## 🖥️ Platform Matrix

| Accelerator | Platform | Linux / Windows Host |
|---|---|---|
| **Laya** Triage | **macOS / Apple Silicon only** (MLX) | Skipped automatically — pipeline runs **Headroom without Laya** on lexical ranking |
| **Headroom** Compression | macOS / Linux / Windows | Engine chain: headroom ML → built-in light-dedupe → passthrough |
| **Smart Scaffold, Corpus, Retrieval, Studio** | Any OS with Node ≥ 18 + Python 3 | Runs everywhere out-of-the-box |
| **Video Engine** (ViMax & Remotion) | Any OS with Node ≥ 18 + Python 3 | Runway backend optional (requires key) |

---

## 🎯 Why "retrieval + distillation" instead of fine-tuning?

Public agent trace datasets are small (tens to thousands of sessions). Fine-tuning on them teaches your model trivia; **retrieval teaches your agent judgment** — which approaches worked, where other agents got stuck, and which errors repeat. Fable closes the loop: external fables in, distilled lessons out, locally stored, instantly reusable.

---

## ⚡ Install — One Repo, One Command

Everything the skill uses is **vendored in this repo** — no hunting for third-party checkouts. One idempotent command installs every optional engine:

```bash
python3 scripts/setup.py          # Laya venv (Mac only) + Headroom + tooling check
python3 scripts/setup.py --all    # + self-learning deps + remotion npm install
python3 scripts/setup.py --with-laya-model --with-models   # + pre-pull checkpoints/weights
```

### Installation Targets

- **A. Web Studio (AI Studio / Browser):** Run `npm run dev` to launch the full-stack visual workbench on port 3000.
- **B. ZCode Plugin:** This repo is a standard plugin (`.zcode-plugin/plugin.json`, skills in `skills/`) — add the folder as a local plugin marketplace root.
- **C. Standalone Skill:** Copy `skills/fable/` + `vendor/` + `scripts/` anywhere; the user-level launcher (`extras/launcher/SKILL.md` → `~/.zcode/skills/fable/`) makes `/fable` resolve the plugin in **every** session.

---

## 🔬 Core Features & Modules

### 1. Multi-Dataset Retrieval (`scripts/retrieve.js`)
- Queries **all five curated fable-family datasets in one pass**:
  - [`armand0e/claude-fable-5-claude-code`](https://huggingface.co/datasets/armand0e/claude-fable-5-claude-code) (63 raw claude-code session traces)
  - [`saidutta69/fable-5-premium`](https://huggingface.co/datasets/saidutta69/fable-5-premium) (11k filtered SFT sessions)
  - [`Crownelius/Complete-FABLE.5-traces-2M`](https://huggingface.co/datasets/Crownelius/Complete-FABLE.5-traces-2M) (22k deduped trace rows)
  - [`MoreThought/Fable-5.1-Max-Reasoning-Filtered-5000x`](https://huggingface.co/datasets/MoreThought/Fable-5.1-Max-Reasoning-Filtered-5000x) (5k filtered reasoning rows)
  - [`kelexine/fable-5-sft-traces`](https://huggingface.co/datasets/kelexine/fable-5-sft-traces) (SFT traces with thinking & task_type)
- `--discover` scans the HF datasets API for more agent-trace datasets (non-LLM entries filtered out); cached 24h in `~/.fable/discovery.json`.
- Bigram + IDF scoring normalizes heterogeneous schemas into `{promptText, docText, errors[]}`.
- Round-robin allocation keeps results diverse; dataset fallbacks ensure train split 500s seamlessly fail over to validation splits.

```bash
node scripts/retrieve.js "implement websocket retry with jitter" --top 5
```

### 2. Local Lesson Corpus (`scripts/search.js` + `scripts/record.js`)
- `record.js` distills a finished task into a **deduped lesson card** (task / context / outcome / key steps / gotchas / learnings) stored at `~/.fable/corpus.jsonl`.
- `search.js` ranks the corpus against current tasks — your own experience is consulted **before** external datasets (~0.04s, zero network egress).

```bash
node scripts/search.js "race condition in async queue"
node scripts/record.js --task "..." --outcome "..." --learnings "a|b|c"
```

### 3. Boost Pipeline (`scripts/boost/boost.py`)
One-command accelerator chain: **retrieve** ➔ **Laya triage** ➔ **Headroom compression** ➔ **JSON pack**.

```bash
# Full accelerator boost
python3 scripts/boost/boost.py --task "build a web scraper with retry logic"

# Zero-network fast lane for instant local hits (~0.04s vs ~28s)
python3 scripts/boost/boost.py --local-only --task "quick fix temperature converter"
```

- **Laya** (`laya_boost.py`, server vendored at `vendor/laya/`) — Batched binary "is this a useful lesson for this task?" verdicts from an on-device MLX decision model (~10–40ms each).
- **Headroom** (`headroom_boost.py`, integration at `vendor/headroom/`) — Compresses transcripts before they enter context briefs. Resolution: headroom tool venv → importable `headroom` → built-in **light dedupe** fallback.

---

### 4. Smart-Mode Bridge (`scripts/boost/smart_scaffold.py`) — Your Agent's War Room

Some tasks aren't simple chores — they are *boss fights*: gnarly concurrency bugs, multi-file architectural refactors, or fixes that already failed twice. Fable assembles your agent's war room at `.smart/<slug>/`:

```bash
python3 scripts/boost/smart_scaffold.py --task "Refactor locks" --criteria "Zero stale writes; Pass 10k race tests"
```

1. **Mission Brief (`task.md`)**: Goal and acceptance criteria written down so nothing drifts.
2. **Intel From the Front Lines (`notes.md`)**: Distilled scouting reports from Laya-vetted past sessions and local lessons.
3. **The GVS5H Ledger Loop**: Plan ➔ Ideate 3+ distinct approaches ➔ Adversarial test-writer tries to break the design *before* code exists ➔ Fresh-context workers implement ➔ Hard verification runs deterministic tests.
4. **Adversarial Invariant**: Failed verification overrides any worker claim of "done".

---

### 5. Video & Motion Studio (`skills/video/SKILL.md`)

| Engine | Vendored At | Role |
|---|---|---|
| [ViMax](https://github.com/HKUDS/ViMax) (MIT) | `vendor/vimax/` | Idea / script / novel → cinematic film: storyboard → shots → keyframes → clips → final cut |
| [AI4Animation](https://github.com/facebookresearch/ai4animationpy) (CC-BY-NC 4.0) | `vendor/ai4animation/` | Realistic muscle-driven character motion & kinematics (weights fetched on demand via `fetch_models.py`) |
| [Remotion](https://github.com/remotion-dev/remotion) | `vendor/remotion-starter/` | Programmatic React video: mood-driven title cards, dynamic captions, canvas rendering |
| [Runway API](https://runwayml.com) | Via skill/MCP | Cloud realism boost for hero shots (key required, optional) |

---

### 6. Capability Harness & Security Gate (`scripts/harness/`)

DeepSeek Harness pattern ("everything is a plugin"). Enforces strict P0-P3 audit gates:

```bash
python3 scripts/harness/find.py "<needed capability>"          # installed → built-ins → vetted
python3 scripts/harness/produce.py --kind skill|mcp|tool --name <kebab> # Scaffold local stub (safest)
python3 scripts/harness/audit.py --target <dir>              # P0 policy ▸ P1 secrets ▸ P2 dangerous APIs ▸ P3 quarantine
python3 scripts/harness/install.py --from <dir|owner/repo>   # Refused unless gate passes; pins sha256
```

- **P0 Policy**: 25MB directory cap, host allowlist, forbids binary executables, shell wrappers, git hooks.
- **P1 Secrets**: Scans for private keys, AWS/GCP/OpenAI credentials, and sensitive tokens.
- **P2 Dangerous APIs**: Blocks unvalidated `eval()`, shell pipes, and unpinned curl scripts.
- **P3 Quarantine**: Verifies SHA-256 integrity in `~/.fable/approved.json` to detect tampering.

---

## 📊 Empirical Benchmarks (46-Run Study)

Data source: `benchmark_per_task.csv` (46 isolated runs with deterministic grading).

### 1. ⚡ ULTRA Speed Benchmark

![ULTRA Speed Benchmark](docs/benchmarks/ultra-speed-chart.svg)

> **Headline Win:** Complex file reorganization (T4) completed in **half the time (32s vs 65s, -51% wall clock)**. Trivial lookups (S1/S3) experienced reading overhead — which is why Fable routes speed queries to ULTRA or `--local-only` to skip external reading.

### 2. 💰 Token Economy — Awareness Costs vs Savings

![Token Economy](docs/benchmarks/token-economy.svg)

Prompt context increases by +25% when including external traces, but buys the triage that prevents dead-end loops. Output tokens increase by +54% due to mode notes and citations — which ULTRA automatically strips on speed tasks.

### 3. 📈 Compounding Self-Improvement Loop

![Corpus Growth](docs/benchmarks/corpus-growth.svg)

Empirical knowledge transfers measured: D4←D1 (design patterns), L4←L1 (deadlock prevention), X3←T3+X1, S3←T3 — later agent runs cited earlier lesson cards.

### 4. 🍩 Routing Accuracy & Distribution

![Routing Decisions](docs/benchmarks/mode-donut.svg)

Router picked correctly across all 46 runs: 52% BOOST, 38% ULTRA, 10% SMART.

---

## 🔌 MCP Server Integration (`scripts/mcp_server.py`)

Expose Fable's tools to **Cursor**, **Claude Desktop**, **Windsurf**, or any MCP host:

```json
{
  "mcpServers": {
    "fable": {
      "command": "python3",
      "args": ["<path-to-fable>/scripts/mcp_server.py"]
    }
  }
}
```

### Available MCP Tools

- `fable_route`: Emits routing plan and engine recommendations for a task.
- `fable_search`: Searches the local lesson corpus.
- `fable_retrieve`: Fetches agent traces across all 5 Hugging Face datasets.
- `fable_boost`: Runs the full retrieve ➔ Laya ➔ Headroom compression pipeline.
- `fable_escalate`: Climbs the escalation ladder for stubborn blockers.
- `fable_report`: Generates immersive dark-theme HTML and PDF audit reports.

---

## 🛡️ Security Posture

- **Allowlisted Egress**: `huggingface.co`, `datasets-server.huggingface.co`, `github.com`, `raw.githubusercontent.com`. HTTPS only; loopback/LAN and private addresses are rejected.
- **Credential Safety**: Zero hardcoded secrets; tokens are read from environment variables only.
- **Untrusted Code as Data**: External traces and vendor files are treated strictly as data, never executed as arbitrary instructions.

---

## 📜 License & Attributions

Fable core is licensed under the **MIT License**.

| Component | Upstream Source | Upstream License |
|---|---|---|
| `vendor/vimax/` | [HKUDS/ViMax](https://github.com/HKUDS/ViMax) | MIT |
| `vendor/ai4animation/` | [facebookresearch/ai4animationpy](https://github.com/facebookresearch/ai4animationpy) | CC-BY-NC 4.0 (Non-commercial) |
| `vendor/laya/` | [mizorewww/laya-mlx](https://github.com/mizorewww/laya-mlx) | MIT (Server) |
| `vendor/headroom/` | [headroomlabs-ai/headroom](https://github.com/headroomlabs-ai/headroom) | Apache-2.0 |
| `vendor/remotion-starter/` | [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | MIT (Starter) |
| `vendor/self-learning-agents/` | [omdivyatej/Self-Learning-Agents](https://github.com/omdivyatej/Self-Learning-Agents) | MIT |
| `vendor/superpowers-brainstorming/` | [obra/superpowers](https://github.com/obra/superpowers) | MIT |

---

<p align="center">
  <b>Built for resilient, self-improving coding agents.</b><br>
  <sub>Fable ⚡ v1.2 Studio · Zero API Keys Core Loop</sub>
</p>
