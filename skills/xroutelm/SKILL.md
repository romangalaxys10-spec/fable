---
name: xroutelm
description: Portable System One decision engine for the Fable ecosystem — Jev-compatible question semantics (noul / choice / score) answered by a zero-dependency lexical scorer with a feature-detected Laya (MLX) bridge. Use when you need routing, gating, or triage decisions and Laya is unavailable (Linux, Windows, Intel macOS, no MLX runtime). No Jev required, no external API, no fabricated probabilities.
version: 1.0.0
---

# xRouteLM — System One, portably

xRouteLM does the job of Laya where Laya cannot run. It answers the same three
question kinds a Jev harness asks — `noul` (is this X?), `choice` (which of
these?), `score` (how much?) — against a portable scorer pipeline, then routes
or gates agent work with the answers. Every answer carries its evidence: the
tokens and anchors that produced it, a calibrated confidence, and the label
`INFERRED` (lexical similarity is never a measurement).

## When to use this skill

- You must route a task to one of the Fable/qaforge engines (`qa xroute "..."`).
- You must gate an agent loop on whether the state is actionable or on-topic.
- Laya (on-device MLX) is unavailable and you refuse to fabricate its output.
- You need an auditable decision journal (`stateHash`, evidence, fallback chain).

## The three question contracts

| Kind | Asks | Answer shape |
|------|------|--------------|
| `noul` | Is the state an instance of this? | `noul` ∈ [0.02, 0.98], confidence, matched anchors |
| `choice` | Which option fits best? | probability distribution (sums to 1), `selected`, margin |
| `score` | Where on this scale? | `score` ∈ [0,1], nearest `level`, distribution over levels |

Answers come from IDF-weighted lexical similarity between the state and the
question/options, plus anchored keyword overlap (positive anchors add,
negative anchors subtract). Calibration is logistic; the constants are bounds
against false certainty, not invented probabilities.

## Scorer chain (honest fallback)

1. `xroutelm/laya-bridge` — delegates noul questions to Laya when the platform
   can run it: macOS + Apple Silicon + `vendor/laya/laya_mcp_server.py` present
   + `python3 -c "import mlx"` succeeds. Any failed condition → explicit
   `unavailableReason`, never a silent skip.
2. `xroutelm/heuristic` — always available; zero dependencies, CPU-only.

`ScorerRegistry.resolve()` returns the first available scorer plus the full
fallback chain so every decision names its actual scorer.

## Integration points

| Surface | Where | Notes |
|---------|-------|-------|
| CLI | `qa xroute "<task>"` | routes to one of 14 engine targets; `--no-stats` skips learning reorder |
| Server | `POST /api/xroutelm/route` | returns decision + learning rates |
| Server | `POST /api/xroutelm/decide` | answers arbitrary question sets (harness mode) |
| Library | `packages/xroutelm/src/index.ts` | `DecisionEngine`, `ScorerRegistry`, `SystemOneHarness`, `RouteStats` |

## Learning loop

`RouteStats` appends one JSONL line per recorded outcome and reorders targets
by recent success rate (window 50): ≥ 70% promotes, < 30% demotes, in between
leaves order unchanged. With fewer than 5 samples for a target the rate is
ignored — the engine refuses to learn from anecdotes.

## Harness mode

`SystemOneHarness.gate(state, questions, { threshold })` blocks an agent loop
when any `noul` answer falls below threshold, returning the per-question
pass/block reasons. `routeModel()` picks a model from criteria and falls back
when confidence is under `minConfidence`. Use this to replace a Jev harness
inside agent loops that must run anywhere.

## What this skill refuses to do

- It never returns probabilities without evidence matches.
- It never marks a lexical answer as `VERIFIED` — the label is `INFERRED`.
- It never silently skips an unavailable scorer; the fallback chain records it.
- It never learns from fewer than 5 recorded outcomes per target.

## Verification checklist

- [ ] `npm run test:xroutelm` → 9 tests, all pass (scorers, registry fallback, journal, learning, harness).
- [ ] `qa xroute "heal the broken checkout test"` → target `qa-test-healing`, label `INFERRED`, evidence non-empty.
- [ ] `curl -s localhost:3000/api/health | jq .xroutelm` → `status: ready`.
- [ ] On Linux, `ScorerRegistry.withDefaults().resolve('xroutelm/laya-bridge')` → heuristic with fallback chain naming the unavailable bridge.
