# fable — test architecture

Every layer below is wired into CI (`.github/workflows/ci.yml`) and every
assertion is backed by real execution: no check passes on a log line alone,
and no check invents the result it claims to verify.

## Layers

| Layer | Entry point | What it proves | CI job |
|---|---|---|---|
| Unit / engine tests | `npm test` → `tsx --test packages/*/test/*.test.ts` | Each package's engine obeys its contract (risk math, real-git numstat, heal-then-verify tiers, NOT_RUN semantics, xRouteLM scorer chain, …) | `tests` |
| Behavioral proofs | `npm test` → `tsx tests/qa-architect-mcp-args.ts` | The real `validateMcpArgs` in `QAArchitectTab.tsx` rejects hostile MCP payloads (`__proto__` pollution, oversized/deep/primitive args) before any `tools/call` request is issued | `tests` |
| E2E system audit | `npm test` → `tsx tests/e2e-system-audit.ts` | All 15 engine contracts end to end, on the real repo, with proof payloads; exits 1 on any DEFECTS_FOUND | `tests` (down-branch) + `api-health-check` (up-branch) |
| Live API audit | `npm run test:api` → `node tests/api-health-check.mjs` | Every studio endpoint answers as its contract says (200+JSON, or honest 400 `NOT_RUN` refusal); critical endpoints (`/api/qa/doctor`, `/api/qa/risk`, `/api/qa/graph`) strictly 200 | `api-health-check` (strict mode) |
| Anti-fabrication audit | grep over `packages/` + `server.ts` | The removed fake-result patterns (`simulatedVulnerable`, `passed: targets.length`, `flakeScore: 78`, …) never return in executable code | `anti-fabrication-audit` |
| Build | `npm run build` | The studio UI bundles (vite) — catches import/bundling regressions that runtime tests skip | `typecheck` |

## Live API audit modes (`tests/api-health-check.mjs`)

The audit targets a live server and refuses to fake an outcome when none is
reachable. Four observable modes:

| Scenario | Behavior | Exit code |
|---|---|---|
| Server up, all endpoints healthy | per-endpoint entries + `ALL CHECKS PASSED` | 0 |
| Server up, an endpoint violates its contract | failure collected + `FAILED CHECKS` list | **1** |
| Server down (local dev / CI without the studio) | loud `SKIPPED — no server reachable`; nothing was audited, no false failures reported | 0 |
| Server down + `FABLE_REQUIRE_SERVER=1` | the missing server is treated as a failure | **1** |

Environment:

- `FABLE_BASE_URL` — target base URL (default `http://localhost:3000`)
- `FABLE_REQUIRE_SERVER=1` — strict mode for jobs that MUST have the server

Start the studio first: `npm run dev`.

## E2E system audit reachability branches (`tests/e2e-system-audit.ts`)

The network-facing engines (Strix DAST, Cloudflare security audit) are
asserted against the honest contract of whichever world the audit runs in:

- **Target reachable** (CI `api-health-check` job boots the studio): real
  probes are sent (≥ 4) and findings come only from observed responses.
- **Target unreachable** (bare `npm test`): zero probes, zero invented
  findings, and an explicit unreachable detail is required in the report.

Both branches must pass; neither is allowed to fabricate the other's result.
