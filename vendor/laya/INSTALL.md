# laya — vendored decision server (fable)

This is the Laya MCP decision server (Apple Silicon / macOS **only** — it runs
on native MLX), vendored here so fable is self-contained: no need to hunt for
a separate laya-mcp checkout.

- `laya_mcp_server.py` — stdio MCP server exposing `laya_decide` / `laya_choose`
  / `laya_score` / `laya_bool` (typed verdicts, ~10–40 ms, fully local, no cloud).
- `test_client.py` — minimal smoke client.
- `requirements.txt` — pinned deps; the decision model itself comes from
  [mizorewww/laya-mlx](https://github.com/mizorewww/laya-mlx) (pinned commit)
  and the checkpoint `aac6fef/laya-mlx` downloads from Hugging Face on first use.

## One-command setup (recommended)

From the repo root:

```bash
python3 scripts/setup.py            # installs Laya venv (Mac), headroom, verifies tooling
python3 scripts/setup.py --all      # + self-learning deps, remotion npm install
python3 scripts/setup.py --with-laya-model   # also pre-pull the ~small HF checkpoint
```

Manual equivalent:

```bash
python3 -m venv ~/.fable/venvs/laya-mlx
~/.fable/venvs/laya-mlx/bin/pip install -r vendor/laya/requirements.txt
~/.fable/venvs/laya-mlx/bin/pip install \
  "git+https://github.com/mizorewww/laya-mlx.git@0a859518634112655cb97c745dbf04f5191aaf13#egg=laya_mlx"
```

`scripts/boost/laya_boost.py` auto-resolves this venv and the vendored server
directory — no environment variables needed on a standard setup.
(`FABLE_LAYA_PY` / `FABLE_LAYA_CWD` still override if you have your own install.)

On **Linux/Windows** the boost pipeline skips Laya automatically and runs the
Headroom compression stage alone (see the platform matrix in the root README).

License: MIT (c) 2026 romangalaxys10-spec — same as the fable repo. The
upstream model package and checkpoint carry their own terms.
