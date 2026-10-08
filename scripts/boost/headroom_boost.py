#!/usr/bin/env python3
"""fable boost: compress retrieved fable transcripts before they enter a brief.

Engine resolution (in order):
  1. headroom tool venv   ~/.local/share/uv/tools/headroom-ai/bin/python
     (install: `uv tool install --python 3.13 "headroom-ai[ml]"`, or run
      `python3 vendor/headroom/integrate.py`)
  2. any importable `headroom` on the current interpreter
  3. built-in **light dedupe** — deterministic local compression (collapse
     duplicate lines / repeated boilerplate) that saves real tokens without
     the headroom package

Output JSON: {engine: "headroom"|"light-dedupe", candidates: [...],
totals: {tokens_before, tokens_after}}. Per candidate: tokens_before,
tokens_after, ratio, compressed_messages (headroom) or compressed_text
(light-dedupe). Invalid input produces {"error": ...}, never a traceback.

Usage:
  node retrieve.js "<task>" --json --top 6 --include-full-text > /tmp/ret.json
  python3 scripts/boost/headroom_boost.py --input /tmp/ret.json
  #   ...or pipe: node retrieve.js ... | python3 scripts/boost/headroom_boost.py
"""

import glob
import json
import os
import subprocess
import sys
import tempfile


# --- engine resolution -------------------------------------------------------

def detect_headroom_python():
    env = os.environ.get("FABLE_HEADROOM_PY")
    if env and os.path.exists(env):
        return env
    hits = glob.glob(os.path.expanduser(
        "~/.local/share/uv/tools/headroom-ai/bin/python"))
    return hits[0] if hits else None


# --- light dedupe fallback ---------------------------------------------------

def light_compress(text: str) -> str:
    """Deterministic local compression: drop exact-duplicate lines, squeeze
    runs of near-identical lines (keep first + count), normalize whitespace.
    Safe by construction: only removes redundancy, never reorders content."""
    lines = text.splitlines()
    out, seen, run_sig, run_count = [], set(), None, 0
    for ln in lines:
        sig = ln.strip()
        if not sig:
            if out and out[-1] != "":
                out.append("")
            continue
        if sig in seen:
            continue
        if run_sig is not None and sig == run_sig:
            run_count += 1
            continue
        if run_sig is not None and run_count:
            out.append(f"{run_sig}  [repeated x{run_count + 1}]")
        run_sig, run_count = sig, 0
        seen.add(sig)
        out.append(ln)
    if run_sig is not None and run_count:
        out.append(f"{run_sig}  [repeated x{run_count + 1}]")
    return "\n".join(out)


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


# --- headroom engine ---------------------------------------------------------

def compress_with_headroom(py, prompt_text, text, model, limit):
    messages = [{"role": "user", "content": prompt_text},
                {"role": "assistant", "content": text}]
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
        json.dump({"messages": messages, "model": model, "limit": limit}, tf)
        tmp = tf.name
    runner = (
        "import json, sys\n"
        "d = json.load(open(sys.argv[1]))\n"
        "from headroom import compress\n"
        "r = compress(d['messages'], model=d['model'], model_limit=d['limit'])\n"
        "print(json.dumps({'ok': True, 'before': r.tokens_before, 'after': r.tokens_after,\n"
        " 'ratio': r.compression_ratio, 'transformed': r.messages}))\n"
    )
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as pf:
        pf.write(runner)
        rpath = pf.name
    try:
        r = subprocess.run([py, rpath, tmp], capture_output=True, text=True, timeout=180)
    finally:
        os.unlink(tmp)
        os.unlink(rpath)
    if r.returncode == 0:
        return json.loads(r.stdout)
    raise RuntimeError((r.stderr or "headroom failed").strip()[:200])


# --- main --------------------------------------------------------------------

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

    if "input" in kv:
        try:
            payload = json.load(open(kv["input"]))
        except Exception as e:
            print(json.dumps({"error": f"cannot read --input: {e}", "candidates": []}))
            return
    else:
        raw = sys.stdin.read()
        try:
            payload = json.loads(raw)
        except Exception as e:
            print(json.dumps({"error": f"invalid JSON on stdin: {e}", "candidates": []}))
            return

    candidates = payload.get("candidates") or payload.get("results") or []
    model = kv.get("model", "claude-sonnet-4-5-20250929")
    try:
        limit = int(kv.get("model-limit", 200000))
    except ValueError:
        limit = 200000

    hr_py = detect_headroom_python()
    engine = "headroom" if hr_py else "light-dedupe"

    compressed, total_before, total_after = [], 0, 0
    for cand in candidates:
        if not isinstance(cand, dict):
            continue
        # Prefer the fullest transcript available; preview is last resort.
        text = cand.get("full_text") or cand.get("transcript") or cand.get("full_text_preview")
        item = dict(cand)
        if not text:
            item["engine"] = engine
            item["headroom"] = "skipped (no transcript field)"
            compressed.append(item)
            continue

        prompt_text = cand.get("prompt") or text[:2000]
        if engine == "headroom":
            try:
                out = compress_with_headroom(hr_py, prompt_text, text, model, limit)
                item["headroom"] = "ok"
                item["tokens_before"] = out["before"]
                item["tokens_after"] = out["after"]
                item["ratio"] = out["ratio"]
                item["compressed_messages"] = out["transformed"]
                total_before += out["before"]
                total_after += out["after"]
            except Exception as e:
                item["headroom"] = f"error: {e}"
                item["engine"] = "light-dedupe"
                item = {**_light_path(item, prompt_text, text)}
        else:
            item = {**item, **_light_path(item, prompt_text, text)}
        compressed.append(item)

    print(json.dumps({
        "engine": engine,
        "model": model if engine == "headroom" else None,
        "candidates": compressed,
        "totals": {
            "candidates_compressed": sum(1 for c in compressed
                                         if c.get("headroom") == "ok" or c.get("engine") == "light-dedupe"),
            "tokens_before": total_before,
            "tokens_after": total_after,
            "note": ("Kompress ML compression requires the headroom-ai[ml] extra and its "
                     "first-run model download; light-dedupe is the deterministic fallback."
                     if engine == "light-dedupe" else None),
        },
    }))


def _light_path(item, prompt_text, text):
    """Apply the light-dedupe fallback to one candidate; returns updated fields."""
    deduped = light_compress(text)
    before, after = estimate_tokens(text), estimate_tokens(deduped)
    item["headroom"] = "fallback: light-dedupe"
    item["engine"] = "light-dedupe"
    item["tokens_before"] = before
    item["tokens_after"] = after
    item["ratio"] = round(after / before, 3) if before else 1.0
    item["compressed_text"] = deduped
    return item


if __name__ == "__main__":
    main()
