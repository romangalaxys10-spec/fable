#!/usr/bin/env python3
"""fable boost — one-command accelerator pipeline.

Chains the three local boosters onto Fable retrieval so a /fable task
runs faster and cheaper:

  retrieve.js --json --include-full-text
      |
  laya_boost.py      (local MLX: batched relevance verdicts, ~10-40ms each)
      |
  headroom_boost.py  (Headroom: compress transcripts, save tokens)
      |
  final JSON pack    (drop-in material for /smart PLAN + IDEATE briefs)

Usage:
  python3 scripts/boost/boost.py --task "<task description>" \
      [--retrieve-top N] [--laya-top N] [--failures M] [--headroom-model m]

Output: JSON {task, laya: {...}, headroom: {...}, final_candidates: [...]}.
Every stage degrades gracefully: if Laya or Headroom is unavailable that
stage is skipped and the pipeline continues, so /fable never hard-blocks.
"""

import json
import time
import os
import subprocess
import sys

PLUGIN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RETRIEVE = os.path.join(PLUGIN_ROOT, "scripts", "retrieve.js")
SEARCH = os.path.join(PLUGIN_ROOT, "scripts", "search.js")
LAYA = os.path.join(PLUGIN_ROOT, "scripts", "boost", "laya_boost.py")
HEADROOM = os.path.join(PLUGIN_ROOT, "scripts", "boost", "headroom_boost.py")


def parse_args(argv):
    kv, task = {}, ""
    i = 1
    while i < len(argv):
        a = argv[i]
        if a.startswith("--") and i + 1 < len(argv) and not argv[i + 1].startswith("--"):
            key, val = a[2:], argv[i + 1]
            if key == "task":
                task = val
            else:
                kv[key] = val
            i += 2
        elif a in ("--task",):
            i += 2
        else:
            i += 1
    if not task:
        print(json.dumps({"error": "--task \"<task description>\" is required"}))
        sys.exit(1)
    return task, kv


def run(cmd, timeout=600, stdin_text=None):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout,
                       input=stdin_text)
    return r.returncode, r.stdout, r.stderr


def main():
    t0 = time.time()
    task, kv = parse_args(sys.argv)
    fast = "--fast" in sys.argv
    local_only = "--local-only" in sys.argv
    retrieve_top = 3 if fast else int(kv.get("retrieve-top", 8))
    laya_top = int(kv.get("laya-top", 4))
    failures = int(kv.get("failures", 2))

    if local_only:
        # zero-network fast lane: local corpus search only, no laya/headroom/retrieve.
        # This is the ULTRA/speed-task path — total wall time ~1-2s.
        rc, out, err = run(["node", SEARCH, task], timeout=30)
        corpus_text = out.strip() if rc == 0 else ""
        duration = round(time.time() - t0, 2)
        print(json.dumps({
            "task": task, "mode": "local-only",
            "boost_duration_s": duration,
            "corpus_text": corpus_text,
            "note": "zero-network fast lane — local corpus only, no HF retrieval",
            "final_candidates": [],
        }, indent=2))
        return

    # 1. retrieve across all fable datasets, with full text so headroom has
    #    something to compress. --fast: lighter retrieval (speed tasks).
    rc, out, err = run(
        ["node", RETRIEVE, task, "--json",
         "--top", str(retrieve_top), "--include-full-text"],
        timeout=600,
    )
    if rc != 0 or not out.strip():
        print(json.dumps({"error": f"retrieve failed: {err.strip()[:400]}"}))
        sys.exit(1)
    retrieve_payload = json.loads(out)

    # 2. Laya verdicts (payload passed via stdin; task comes from the
    #    retrieve payload's "query" field).
    rc, out, err = run(
        [sys.executable, LAYA,
         "--top", str(laya_top), "--failures", str(failures)],
        timeout=300,
        stdin_text=out,
    )
    if rc == 0 and out.strip():
        laya_payload = json.loads(out)
    else:
        laya_payload = {"laya": False, "candidates": retrieve_payload.get("results", []),
                        "note": f"laya stage skipped: {(err or 'empty output').strip()[:200]}"}

    # 3. Headroom compression of the surviving candidates (stdin again).
    rc, out, err = run(
        [sys.executable, HEADROOM],
        timeout=300,
        stdin_text=json.dumps(laya_payload),
    )
    if rc == 0 and out.strip():
        laya_payload["headroom"] = json.loads(out)
    else:
        laya_payload["headroom"] = {"headroom": False,
                                     "candidates": laya_payload.get("candidates", []),
                                     "note": f"headroom stage skipped: {(err or 'empty output').strip()[:200]}"}

    final = laya_payload.get("candidates") or []

    # telemetry: accumulate the value + duration delivered (best-effort)
    try:
        tele = os.path.join(PLUGIN_ROOT, "scripts", "telemetry.py")
        hr = laya_payload.get("headroom", {})
        subprocess.run([sys.executable, tele, "record", "--kind", "boost",
                        "--data", json.dumps({
                            "laya_useful": laya_payload.get("useful", 0),
                            "tokens_before": hr.get("totals", {}).get("tokens_before", 0),
                            "tokens_after": hr.get("totals", {}).get("tokens_after", 0),
                            "fast": fast,
                            "duration_s": round(time.time() - t0, 1)})],
                       capture_output=True, timeout=30)
    except Exception:
        pass

    print(json.dumps({
        "task": task,
        "mode": "fast" if fast else "full",
        "boost_duration_s": round(time.time() - t0, 1),
        "laya": {k: laya_payload.get(k) for k in
                 ("laya", "total_input", "useful", "rejected", "note", "candidates")},
        "headroom": laya_payload.get("headroom", {}),
        "final_candidates": final,
    }))


if __name__ == "__main__":
    main()
