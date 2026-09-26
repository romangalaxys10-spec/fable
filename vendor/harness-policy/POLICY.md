# fable harness — capability policy

Pattern credit: **"everything is a plugin"** — DeepSeek Harness
(github.com/deepseek-ai/deepseek-harness, MIT). See `SAFETY-upstream.md` for
their own risk notice; we ship their warning verbatim because it applies to
any plugin system, including this one.

fable implements the pattern as a small, dependency-free Python harness
(`scripts/harness/`) instead of embedding the dsh runtime (a developer-preview
TypeScript/Cordis monorepo whose docs state it "has not undergone a security
audit and must not be treated as secure").

## The loop

```
need ──▶ find.py      installed → built-ins → vetted registry → (opt-in) GitHub*
          │
          ├─ nothing fits? ──▶ produce.py   generate a stub locally (safest)
          │
          └──▶ audit.py     P0 policy ▸ P1 secrets ▸ P2 dangerous APIs ▸ P3 quarantine
                                 │
                     blocked ────┤──── ok / needs-review*
                                 ▼
                        install.py   copy to ~/.fable/capabilities/<name>/
                                     + pin sha256 in ~/.fable/approved.json
```

\* GitHub search is opt-in and its results are **untrusted by default**;
`needs-review` verdicts install only with the explicit human flag
`--i-have-reviewed`, recorded forever in the pin.

## The four audit phases

| Phase | What it checks | Blocked by |
|---|---|---|
| **P0 source & content policy** | host allowlist (github/hf/pypi/npm only), 25 MB size cap, forbidden file types (`.so .dylib .dll .exe .bin .whl …`), `hooks`/`postinstall` path segments, shipped credential files/dirs (`.env`, `.ssh`, `.aws`, …) | critical |
| **P1 secrets scan** | AWS/GitHub/Google/OpenAI/Slack key patterns, private-key blocks, generic credential literals | private-key blocks; others → needs-review |
| **P2 dangerous-API scan** | `eval`/`exec`, `curl … \| sh`, `rm -rf /`, credential-dir/env-secret harvesting, base64-decoded payloads, auto-run hooks, egress to **non-allowlisted hosts** | shell-pipes & root deletes; others → needs-review |
| **P3 sandboxed preview** | artifact quarantined to `~/.fable/quarantine/<digest>`; optional containerized inspection when docker exists (`--sandbox docker`, network disabled) | never blocks alone — honesty first: static analysis ≠ execution proof |

## Trust model (read this)

- The audit gate **raises the cost of attacks**; it does not make untrusted
  code safe. Nothing substitutes for reading what you install.
- `needs-review` capabilities run **only** after a human passes
  `--i-have-reviewed`; the flag and the verdict are recorded permanently.
- Every launch of an installed capability should be preceded by
  `install.py --verify` — a digest mismatch means the code changed after
  approval and it must be re-audited.
- Prefer `produce.py` (build a stub) over installing third-party code
  whenever feasible.
- Never point a capability at secrets: no tokens in env names it reads, no
  paths into credential stores. The P2 scan flags these at audit time.
