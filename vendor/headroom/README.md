# headroom — integration layer (fable)

[Headroom](https://github.com/headroomlabs-ai/headroom) (Apache-2.0) compresses
tool outputs, logs, files, and RAG chunks before they reach an LLM — ~20%
fewer tokens for coding agents, 60–95% for repetitive JSON, same answer
quality, fully local.

## Why this is an integration, not a vendored source copy

Upstream is a **maturin (Rust + Python) package**: the importable `headroom`
module requires a compiled Rust core (`_core.abi3.so`) that exists only in
built wheels. Vendoring raw source here would add tens of megabytes of code
that cannot run without a Rust toolchain build. Instead, fable integrates
headroom as an engine:

1. **`scripts/boost/headroom_boost.py`** resolves headroom at runtime:
   uv-tool venv (`~/.local/share/uv/tools/headroom-ai`) → any importable
   `headroom` on `PYTHONPATH` → built-in **light dedupe** fallback so the
   stage still saves tokens.
2. **`integrate.py`** (this folder) installs and verifies headroom in one
   command.

## Install / verify

```bash
python3 vendor/headroom/integrate.py          # detect or install + verify
python3 vendor/headroom/integrate.py --force  # reinstall
```

The installer prefers `uv tool install --python 3.13 "headroom-ai[ml]"`
(ML extra enables the Kompress neural compressor; first Kompress use
downloads its model from Hugging Face) and falls back to
`pip install "headroom-ai[ml]"`. Package downloads go to PyPI over HTTPS;
no credentials are needed or stored.

## Platform matrix (boost pipeline)

| Accelerator | Platform | Behavior elsewhere |
|---|---|---|
| **Laya** triage | **macOS / Apple Silicon only** (MLX) | skipped automatically — the boost pipeline runs the **Headroom compression stage without Laya** and relies on lexical ranking |
| **Headroom** compression | macOS / Linux / Windows | engine: `headroom` (ML) → `light-dedupe` fallback → `passthrough` |

Both stages are optional by design: `boost.py` never hard-fails because one
is missing.
