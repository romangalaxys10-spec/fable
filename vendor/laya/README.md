# laya_mcp — Laya decision models for LLM agents

MCP server exposing [laya-mlx](https://github.com/mizorewww/laya-mlx) native
MLX typed-decision models to any LLM agent or harness. Laya answers *typed
questions* about a piece of text in ~10-40ms **fully locally** on Apple
silicon — no text generation, no cloud, no API key.

## What it does

- `laya_decide` — full control: any mix of `choice` / `score` / `noul`
  questions about one text in a single call (returns confidence + probabilities).
- `laya_choose` — route/classify text into one of N categories.
- `laya_score`  — rate text on an ordered scale (0..N-1 + legend).
- `laya_bool`   — yes/no judgement (probability of "true").
- resource `laya://info` — capabilities + tips for agents.

## Run it

```bash
# stdio (default — what agents connect to)
laya-mcp

# mcp-inspector / manual debug
laya-mcp --http 127.0.0.1:8765
```

Requires the laya venv at `/Users/d/.venvs/laya-mlx`. Checkpoints are cached
locally in `~/.cache/huggingface/hub/` (`aac6fef/laya-mlx` default;
`convaiinnovations/laya` also available). Env overrides:
`LAYA_MODEL`, `LAYA_DEVICE` (gpu/cpu), `LAYA_DTYPE` (float16/bfloat16/float32).

## Register with a harness

Point MCP config at the same interpreter so `laya_mlx` resolves:

```json
{
  "mcpServers": {
    "laya_mcp": {
      "command": "/Users/d/.venvs/laya-mlx/bin/python",
      "args": ["/Users/d/Documents/Projects/Default Project/laya-mcp/laya_mcp_server.py"]
    }
  }
}
```

`laya-mcp` (in `~/.local/bin`) is an equivalent shorthand if the client
supports running a command by name.

## Question schema (for laya_decide)

```json
[
  {
    "id": "dept",
    "type": "choice",
    "instructions": "Which team owns this request?",
    "criteria": ["billing", "technical", "sales"]
  },
  {
    "id": "severity",
    "type": "score",
    "instructions": "How severe is this?",
    "criteria": ["noise", "impact", "blocker"]
  },
  {
    "id": "blocks_release",
    "type": "noul",
    "instructions": "Does this block the release?",
    "criteria": {"false": "no", "true": "yes"}
  }
]
```

- `choice` and `score` need `criteria` = list of >= 2 labels.
- `noul` needs `criteria` = `{"false": ..., "true": ...}`.
- Responses include calibrated `confidence`; treat values near 0.5 as
  uncertain. `bool` question types are NOT supported (use `noul`).