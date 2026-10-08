#!/usr/bin/env python3
"""fable boost: batched Laya relevance verdicts over retrieval candidates.

Reads `retrieve.js --json` output and for each candidate asks Laya a single
binary noul question — "is this a useful lesson for the task?" — one model
pass per candidate, all local MLX (~10-40ms each). Emits the candidate
list with `laya_relevance` / `laya_useful` attached, so the agent can skip
deep-reading candidates Laya rejected.

Usage:
  node retrieve.js "<task>" --json --top 10 > /tmp/ret.json
  python3 scripts/boost/laya_boost.py --input /tmp/ret.json --task "<task>" \
      [--top N] [--failures M]

Or piped:
  node retrieve.js "<task>" --json --top 10 | \
    python3 scripts/boost/laya_boost.py --task "<task>"

Env overrides: FABLE_LAYA_PY (python bin), FABLE_LAYA_MODULE, FABLE_LAYA_CWD.
Falls back to no-op (exit 0, candidates untouched) when Laya is unavailable,
so the boost pipeline never blocks a task on a missing accelerator.
"""

import json
import os
import subprocess
import sys
import tempfile

_PLUGIN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# Resolution order (first hit wins):
#   python: FABLE_LAYA_PY → ~/.fable/venvs/laya-mlx (setup.py) → legacy ~/.venvs/laya-mlx
#   cwd:    FABLE_LAYA_CWD → vendored vendor/laya → legacy "Default Project/laya-mcp"
_LAYA_PY_CANDIDATES = [
    os.environ.get("FABLE_LAYA_PY"),
    os.path.expanduser("~/.fable/venvs/laya-mlx/bin/python"),
    os.path.expanduser("~/.venvs/laya-mlx/bin/python"),
]
_LAYA_CWD_CANDIDATES = [
    os.environ.get("FABLE_LAYA_CWD"),
    os.path.join(_PLUGIN_ROOT, "vendor", "laya"),
    "/Users/d/Documents/Projects/Default Project/laya-mcp",
]


def detect_laya():
    """Return (python_bin, module, cwd) or None when Laya is unavailable."""
    py = next((p for p in _LAYA_PY_CANDIDATES if p and os.path.exists(p)), None)
    cwd = next((c for c in _LAYA_CWD_CANDIDATES if c and os.path.isdir(c)), None)
    if py and cwd:
        return py, os.environ.get("FABLE_LAYA_MODULE", "laya_mcp_server"), cwd
    return None


def main():
    kv = {}
    i = 1
    while i < len(sys.argv):
        a = sys.argv[i]
        if a.startswith("--") and i + 1 < len(sys.argv) and not sys.argv[i + 1].startswith("--"):
            kv[a[2:]] = sys.argv[i + 1]
            i += 2
        else:
            i += 1

    # Gather the retrieve.js --json payload
    if "input" in kv:
        payload = json.load(open(kv["input"]))
    elif os.environ.get("FABLE_RETRIEVE_JSON"):
        src = os.environ["FABLE_RETRIEVE_JSON"]
        payload = json.load(sys.stdin if src == "-" else open(src))
    else:
        payload = json.load(sys.stdin)

    task = kv.get("task") or payload.get("query", "")
    candidates = payload.get("results", [])

    laya = detect_laya()
    if laya is None:
        print(json.dumps({"task": task, "laya": False, "candidates": candidates,
                           "note": "laya unavailable — skipped, using retrieve ranking only"}))
        return

    py_bin, module, cwd = laya
    top_n = int(kv.get("top", 6))
    fail_n = int(kv.get("failures", 3))

    payload_in = {"task": task, "candidates": candidates}

    # Run a small script inside the Laya venv with cwd = LAYA_CWD so
    # `import <module>` resolves; payload passed via a temp file to avoid
    # shell-quoting pitfalls.
    runner = """
import json, os, sys, asyncio
sys.path.insert(0, os.getcwd())
# The wrapper invokes: python <this script> <payload.json>  → sys.argv[1]
payload = json.load(open(sys.argv[1]))
import %s as lm

async def run():
    out = []
    for cand in payload["candidates"]:
        text = ((cand.get("prompt") or "")[:400] + " " +
                " ".join((cand.get("errors_lessons") or [])[:3])[:400])
        question = {"u_rel": {"type": "noul",
                 "instructions": ("Useful, actionable lesson for task: "
                                   + repr(payload["task"])[:300] +
                                   "? true only if a concrete working pattern or shared failure."),
                 "criteria": {"false": "not useful", "true": "useful"}}}
        result, _ms = await lm._run_predict(text=text, questions=question,
                model="aac6fef/laya-mlx", device="gpu", dtype="float16")
        ans = next(iter(result["answers"].values()))
        p = float(ans.get("noul", 0.5))
        cand2 = dict(cand)
        cand2["laya_relevance"] = round(p, 4)
        cand2["laya_useful"] = p >= 0.5
        out.append(cand2)
    useful = [c for c in out if c["laya_useful"]]
    rest = [c for c in out if not c["laya_useful"]]
    useful.sort(key=lambda c: c["laya_relevance"], reverse=True)
    rest.sort(key=lambda c: c["laya_relevance"], reverse=True)
    keep = useful[:__TOP_N__] + rest[:__FAIL_N__]
    keep.sort(key=lambda c: c["laya_relevance"], reverse=True)
    print(json.dumps({"task": payload["task"], "laya": True, "candidates": keep,
                        "total_input": len(payload["candidates"]),
                        "useful": len(useful), "rejected": len(rest)}))

try:
    asyncio.run(run())
except Exception as e:
    print(json.dumps({"error": repr(e), "candidates": [], "laya": True,
                       "note": "laya errored — falling back to retrieve-only ranking"}))
    sys.exit(0)
""".replace("__TOP_N__", str(top_n)).replace("__FAIL_N__", str(fail_n)) % module

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
        json.dump(payload_in, tf)
        tmp_payload = tf.name
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as pf:
        pf.write(runner)
        tmp_script = pf.name

    try:
        r = subprocess.run([py_bin, tmp_script, tmp_payload], cwd=cwd,
                           capture_output=True, text=True, timeout=300)
    finally:
        os.unlink(tmp_payload)
        os.unlink(tmp_script)

    if r.returncode == 0 and r.stdout.strip():
        print(r.stdout)
    else:
        print(json.dumps({"error": (r.stderr or "empty output")[:500],
                           "candidates": candidates, "laya": True,
                           "note": "laya errored — falling back to retrieve-only ranking"}))


if __name__ == "__main__":
    main()
