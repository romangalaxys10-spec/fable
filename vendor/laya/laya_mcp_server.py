#!/usr/bin/env python3
'''
MCP server exposing Laya native MLX typed decision models to LLM agents.

Laya answers *typed questions* about a piece of text (emails, tickets, requests)
in 7-14 ms fully locally on Apple silicon -- no text generation, no cloud.
This server loads one Laya checkpoint and exposes decision tools over MCP
(stdio by default; streamable HTTP possible).

Question schema (native laya format) for laya_decide:
    {"qid": {
        "type": "choice",                      # "choice" | "score" | "noul"
        "instructions": "What should this route to?",   # required
        "criteria": ["billing", "technical", "sales"],  # nonempty list; for noul: {"false": "...", "true": "..."}
    }}

Every answer contains: type, confidence (0..1), action.act_probability, and a
per-question value:
    choice -> choice + probabilities{label: p}
    score  -> score (float) + legend{index: label}
    noul   -> noul (probability of "true") + confidence

Run:
    /Users/d/.venvs/laya-mlx/bin/python laya_mcp_server.py
Environment:
    LAYA_MODEL   checkpoint id (default aac6fef/laya-mlx; both official ones cached locally)
    LAYA_DEVICE  gpu|cpu (default gpu)
    LAYA_DTYPE   float16|bfloat16|float32 (default float16)
'''

from __future__ import annotations

import asyncio
import json
import os
import threading
import time
import warnings
from typing import Any, Dict, List, Optional

from mcp.server.fastmcp import FastMCP
from pydantic import Field

warnings.filterwarnings("ignore", message=".*temperatures outside.*", category=RuntimeWarning)

DEFAULT_MODEL = os.environ.get("LAYA_MODEL", "aac6fef/laya-mlx")
DEFAULT_DEVICE = os.environ.get("LAYA_DEVICE", "gpu")
DEFAULT_DTYPE = os.environ.get("LAYA_DTYPE", "float16")

mcp = FastMCP("laya_mcp")

# ---------------------------------------------------------------------------
# Shared model singleton + lock (laya inference is not thread-safe for writes;
# on Apple silicon predictions are sub-20ms so serializing is cheap).
# ---------------------------------------------------------------------------
_agent = None
_model_lock = threading.Lock()
_infer_lock = asyncio.Lock()


def _get_agent(model: str, device: str, dtype: str):
    global _agent
    if _agent is not None and _agent.model_id == model:
        return _agent
    with _model_lock:
        try:
            import laya_mlx as laya  # imported lazily so '--help' works without the venv
        except ImportError as e:
            raise RuntimeError(
                "laya_mlx not importable. Run this server with the laya venv: "
                "/Users/d/.venvs/laya-mlx/bin/python laya_mcp_server.py"
            ) from e
        _agent = laya.load(model, device=device, dtype=dtype, cache_prompts=True)
    return _agent


async def _run_predict(text: str, questions: Dict[str, Any], model: str, device: str, dtype: str):
    loop = asyncio.get_running_loop()
    agent = await loop.run_in_executor(None, lambda: _get_agent(model, device, dtype))
    t0 = time.perf_counter()

    def _predict():
        try:
            return agent.predict(text, questions)
        except Exception as e:
            if "float32" in str(e):
                return {"__error__": str(e)}
            raise RuntimeError(str(e)) from e

    async with _infer_lock:
        result = await loop.run_in_executor(None, _predict)
    elapsed_ms = (time.perf_counter() - t0) * 1000
    if isinstance(result, dict) and result.get("__error__"):
        raise RuntimeError(
            result["__error__"] + " Set LAYA_DTYPE=float32 or dtype='float32' and retry."
        )
    return result, elapsed_ms


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _val(v):
    from pydantic.fields import FieldInfo
    return v.default if isinstance(v, FieldInfo) else v


def _validate_typed_questions(questions):
    if isinstance(questions, str):
        questions = json.loads(questions)
    if not isinstance(questions, list) or not questions:
        raise ValueError("questions must be a nonempty list")
    if len(questions) > 20:
        raise ValueError("at most 20 questions per call")
    for item in questions:
        if not isinstance(item, dict):
            raise ValueError("each question must be an object")
        qid = str(item.get("id") or item.get("name") or "").strip()
        if not qid:
            raise ValueError("each question needs an 'id'")
        qtype = item.get("type")
        if qtype not in ("choice", "score", "noul"):
            raise ValueError(f"question '{qid}': type must be 'choice', 'score', or 'noul'")
        instructions = str(item.get("instructions") or "").strip()
        if not instructions:
            raise ValueError(f"question '{qid}': 'instructions' is required")
        criteria = item.get("criteria")
        if qtype == "noul":
            if not isinstance(criteria, dict):
                raise ValueError(f"question '{qid}': noul needs criteria={{'false':..., 'true':...}}")
        else:
            if isinstance(criteria, str):
                try:
                    criteria = json.loads(criteria)
                except Exception:
                    criteria = [c.strip() for c in criteria.split(",") if c.strip()]
            if isinstance(criteria, list):
                if len(criteria) < 2:
                    raise ValueError(f"question '{qid}': need at least 2 criteria")
                criteria = [str(c) for c in criteria]
            elif isinstance(criteria, dict):
                criteria = {str(k): v for k, v in criteria.items()}
            else:
                raise ValueError(f"question '{qid}': criteria must be a list or dict")
    return questions
@mcp.tool(
    name="laya_decide",
    annotations={
        "title": "Laya typed decisions over text",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def laya_decide(
    text: str = Field(..., description="The input text to make decisions about (email, ticket, request, message...)."),
    questions: Any = Field(..., description='List of typed question objects, each {"id": str, "type": "choice"|"score"|"noul", "instructions": str, "criteria": list|dict}.'),
    model: str = Field(default=DEFAULT_MODEL, description="Laya checkpoint id or local path."),
    device: str = Field(default=DEFAULT_DEVICE, description="MLX device: gpu or cpu."),
    dtype: str = Field(default=DEFAULT_DTYPE, description="float16, bfloat16, or float32."),
) -> str:
    '''Answer typed questions about a text with the local Laya model.

    Use this when the agent needs FAST, calibrated decisions from unstructured
    text -- routing (department, severity, category), classification
    (language, intent, topic), or scaled ratings -- without text generation.
    Runs fully local in ~10ms on Apple silicon.

    Questions:
      - choice: {"id","type":"choice","instructions", "criteria":["a","b",...]}
      - score:  {"id","type":"score","instructions", "criteria":["poor","ok","great"]} -> 0..N-1 + legend
      - noul:   {"id","type":"noul","instructions", "criteria":{"false":..., "true":...}} -> P(true)

    Args:
        text: the input text being decided about
        questions: list of typed questions (validation errors returned as Error: ...)
        model/device/dtype: optional tuning

    Returns JSON: {"model", "answers", "usage", "latency_ms"}.
    '''
    try:
        qd = {}
        for item in _validate_typed_questions(questions):
            qid = str(item.get("id") or item.get("name")).strip()
            criteria = item["criteria"]
            if item["type"] != "noul":
                if isinstance(criteria, str):
                    criteria = [c.strip() for c in criteria.split(",") if c.strip()]
                qd[qid] = {"type": item["type"], "instructions": item["instructions"], "criteria": criteria}
            else:
                qd[qid] = {"type": item["type"], "instructions": item["instructions"], "criteria": {str(k): v for k, v in criteria.items()}}
        model, device, dtype = _val(model), _val(device), _val(dtype)
        result, elapsed_ms = await _run_predict(text, qd, model, device, dtype)
        result["latency_ms"] = round(elapsed_ms, 2)
        return json.dumps(result, ensure_ascii=False, indent=2)
    except Exception as e:
        return f"Error: {e}"


@mcp.tool(
    name="laya_choose",
    annotations={
        "title": "Pick one of several options",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def laya_choose(
    text: str = Field(..., description="The text to classify/route into one category."),
    options: List[str] = Field(..., description="Candidate labels to pick from (2-20), e.g. ['billing','technical','sales']."),
    instruction: str = Field(default="Which option fits best?", description="The decision instruction."),
    model: str = Field(default=DEFAULT_MODEL, description="Laya checkpoint id or local path."),
    device: str = Field(default=DEFAULT_DEVICE, description="MLX device: gpu or cpu."),
    dtype: str = Field(default=DEFAULT_DTYPE, description="float16, bfloat16, or float32."),
) -> str:
    '''Choose the single best option from a list for a piece of text.

    Convenience wrapper over laya_decide for the most common case: route or
    classify text into exactly one category. Local, ~10ms, returns confidence
    and the full probability distribution.

    Args:
        text: the text to classify
        options: candidate labels, e.g. ["billing","technical","sales"]
        instruction: what the choice represents
        model/device/dtype: optional tuning

    Returns JSON: {"choice", "confidence", "probabilities", "latency_ms"}.
    '''
    try:
        text, options, instruction = _val(text), _val(options), _val(instruction)
        model, device, dtype = _val(model), _val(device), _val(dtype)
        if not isinstance(options, list) or len(options) < 2:
            return "Error: options must be a list of at least 2 labels."
        qd = {"answer": {"type": "choice", "instructions": instruction or "Pick the best option.", "criteria": options}}
        result, elapsed_ms = await _run_predict(text, qd, model, device, dtype)
        ans = next(iter(result["answers"].values()))
        return json.dumps({
            "choice": ans["choice"],
            "confidence": ans["confidence"],
            "probabilities": ans["probabilities"],
            "latency_ms": round(elapsed_ms, 2),
        }, ensure_ascii=False, indent=2)
    except Exception as e:
        return f"Error: {e}"


@mcp.tool(
    name="laya_score",
    annotations={
        "title": "Rate text on an ordered scale",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def laya_score(
    text: str = Field(..., description="The text to rate."),
    scale: List[str] = Field(..., description="Ordered score labels, e.g. ['poor','ok','great'] (2-20)."),
    instruction: str = Field(default="How well does this match?", description="The rating instruction."),
    model: str = Field(default=DEFAULT_MODEL, description="Laya checkpoint id or local path."),
    device: str = Field(default=DEFAULT_DEVICE, description="MLX device: gpu or cpu."),
    dtype: str = Field(default=DEFAULT_DTYPE, description="float16, bfloat16, or float32."),
) -> str:
    '''Rate a piece of text on an ordered scale (0..N-1).

    Maps the text onto the provided ordered labels. The returned numeric score
    is the expectation over the scale; legend shows what each index means.

    Args:
        text: the text to rate
        scale: ordered labels, e.g. ["poor","ok","great"]
        instruction: the rating question
        model/device/dtype: optional tuning

    Returns JSON: {"score", "legend", "probabilities", "latency_ms"}.
    '''
    try:
        text, scale, instruction = _val(text), _val(scale), _val(instruction)
        model, device, dtype = _val(model), _val(device), _val(dtype)
        if not isinstance(scale, list) or len(scale) < 2:
            return "Error: scale must be a list of at least 2 ordered labels."
        qd = {"rating": {"type": "score", "instructions": instruction or "Score this.", "criteria": scale}}
        result, elapsed_ms = await _run_predict(text, qd, model, device, dtype)
        ans = next(iter(result["answers"].values()))
        return json.dumps({
            "score": ans["score"],
            "legend": ans["legend"],
            "probabilities": ans["probabilities"],
            "latency_ms": round(elapsed_ms, 2),
        }, ensure_ascii=False, indent=2)
    except Exception as e:
        return f"Error: {e}"


@mcp.tool(
    name="laya_bool",
    annotations={
        "title": "Yes/no judgement about text",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def laya_bool(
    text: str = Field(..., description="The text to judge as true/false."),
    instruction: str = Field(default="Is this true?", description="The yes/no question."),
    model: str = Field(default=DEFAULT_MODEL, description="Laya checkpoint id or local path."),
    device: str = Field(default=DEFAULT_DEVICE, description="MLX device: gpu or cpu."),
    dtype: str = Field(default=DEFAULT_DTYPE, description="float16, bfloat16, or float32."),
) -> str:
    '''Judge a piece of text true or false (binary decision).

    Returns the probability of "true" plus confidence. Use for check-style
    questions: is this urgent? does it need escalation? is this a security
    concern? local and instant.

    Args:
        text: the text to judge
        instruction: the yes/no question
        model/device/dtype: optional tuning

    Returns JSON: {"probability_true", "verdict", "confidence", "latency_ms"}.
    '''
    try:
        text, instruction = _val(text), _val(instruction)
        model, device, dtype = _val(model), _val(device), _val(dtype)
        qd = {"judgement": {"type": "noul", "instructions": instruction or "Is this true?", "criteria": {"false": "not supported", "true": "supported"}}}
        result, elapsed_ms = await _run_predict(text, qd, model, device, dtype)
        ans = next(iter(result["answers"].values()))
        p_true = ans["noul"]
        return json.dumps({
            "probability_true": round(p_true, 4),
            "verdict": bool(p_true >= 0.5),
            "confidence": ans["confidence"],
            "latency_ms": round(elapsed_ms, 2),
        }, ensure_ascii=False, indent=2)
    except Exception as e:
        return f"Error: {e}"


@mcp.resource("laya://info")
def laya_info() -> str:
    '''Server capabilities, default model, and usage tips for agents.'''
    return json.dumps(
        {
            "name": "laya_mcp",
            "description": "Native MLX typed decision models. Fast local decisions (7-14ms), zero text generation, no cloud.",
            "default_model": DEFAULT_MODEL,
            "cached_local_models": ["aac6fef/laya-mlx", "convaiinnovations/laya"],
            "tools": [
                {"name": "laya_decide", "desc": "Full control: any combination of choice/score/noul questions in one call."},
                {"name": "laya_choose", "desc": "Route/classify text into one of N categories."},
                {"name": "laya_score", "desc": "Rate text on an ordered scale."},
                {"name": "laya_bool", "desc": "Binary yes/no judgement."},
            ],
            "tips": [
                "Keep criteria labels short and mutually exclusive.",
                "Confidence is calibrated but some buckets are clamped; treat near-0.5 as uncertain.",
                "Use multiple questions in ONE laya_decide call to batch decisions on the same text.",
            ],
        },
        indent=2,
    )


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(description="laya_mcp server (stdio by default)")
    ap.add_argument("--http", nargs="?", const="", metavar="HOST[:PORT]", default=None,
                    help="run over streamable HTTP instead of stdio (e.g. 127.0.0.1:8765)")
    args = ap.parse_args()
    if args.http is not None:
        import uvicorn
        host, _, port = (args.http or "127.0.0.1").partition(":")
        port = int(port or 8765)
        uvicorn.run(mcp.streamable_http_app(), host=host, port=port, log_level="info")
    else:
        mcp.run()  # stdio transport by default