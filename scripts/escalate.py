#!/usr/bin/env python3
"""fable escalate — autonomous escalation ladder (never stuck on a human).

Inspired by community feedback (conductor/orchestrator pattern): workers hit
blockers; asking a human first makes the human the bottleneck. This tool
codifies the ladder so an agent can keep moving with DOCUMENTED, reversible
decisions — and only escalates to a human for truly irreversible/high-stakes
calls. Even then it emits a best-effort "continue meanwhile" plan.

Ladder:
  L0 SELF      — corpus + prior precedents (search.js)
  L1 LAYA      — one local model pass scores the options (macOS; skipped elsewhere)
  L2 PRECEDENT — (opt-in --with-external) external fable sessions
  L3 SMART     — recommendation to run the smart ledger loop
  L4 HUMAN     — only if --irreversible (or laya flags irreversibility):
                 emits a crisp adjudication package + a meanwhile plan

Usage:
  python3 escalate.py --blocker "what is blocking" [--options "a|b|c"]
        [--irreversible] [--with-external] [--json]

Every run is logged to ~/.fable/escalations.jsonl (audit trail: who decided
what, on which evidence). Exit 0 when the verdict is PROCEED/SMART (keep
working), 4 when it is ESCALATE_TO_HUMAN.
"""

import argparse
import datetime
import json
import os
import subprocess
import sys

PLUGIN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SEARCH = os.path.join(PLUGIN_ROOT, "scripts", "search.js")
ESCALATIONS = os.path.expanduser("~/.fable/escalations.jsonl")

_LAYA_PY_CANDIDATES = [
    os.environ.get("FABLE_LAYA_PY"),
    os.path.expanduser("~/.fable/venvs/laya-mlx/bin/python"),
    os.path.expanduser("~/.venvs/laya-mlx/bin/python"),
]
_LAYA_CWD_CANDIDATES = [
    os.environ.get("FABLE_LAYA_CWD"),
    os.path.join(PLUGIN_ROOT, "vendor", "laya"),
    "/Users/d/Documents/Projects/Default Project/laya-mcp",
]

IRREVERSIBLE_HINTS = [
    "delete", "drop ", "rm -rf", "overwrite", "production", "billing",
    "payment", "credential", "password", "secret", "deploy to prod",
    "irreversible", "migration", "gdpr", "personal data", "send email to client",
]


def detect_laya():
    py = next((p for p in _LAYA_PY_CANDIDATES if p and os.path.exists(p)), None)
    cwd = next((c for c in _LAYA_CWD_CANDIDATES if c and os.path.isdir(c)), None)
    return (py, cwd) if py and cwd else None


def laya_verdict(blocker, options):
    """One model pass: is proceeding without a human safe? + best option score.
    Returns dict or None when Laya unavailable/failed."""
    laya = detect_laya()
    if laya is None:
        return None
    py_bin, cwd = laya
    tmp = write_temp({"blocker": blocker[:400], "options": options[:5]})
    runner = """
import json, os, sys, asyncio
sys.path.insert(0, os.getcwd())
payload = json.load(open(sys.argv[1]))
import laya_mcp_server as lm

async def run():
    q = {"safe": {"type": "noul",
         "instructions": ("Is it SAFE to proceed on this blocker without human approval? "
                          "false if the action could be irreversible, touch production, "
                          "money, credentials, or other people's data. Blocker: "
                          + repr(payload["blocker"])),
         "criteria": {"false": "not safe", "true": "safe"}}}
    result, _ms = await lm._run_predict(text=payload["blocker"][:400], questions=q,
            model="aac6fef/laya-mlx", device="gpu", dtype="float16")
    safe = float(next(iter(result["answers"].values()))["noul"])
    options = {}
    for i, opt in enumerate(payload["options"]):
        q2 = {f"opt{i}": {"type": "noul",
             "instructions": "Would choosing this option reasonably unblock the task? Option: " + repr(opt)[:200],
             "criteria": {"false": "no", "true": "yes"}}}
        r2, _ = await lm._run_predict(text=payload["blocker"][:300], questions=q2,
                model="aac6fef/laya-mlx", device="gpu", dtype="float16")
        options[opt] = round(float(next(iter(r2["answers"].values()))["noul"]), 4)
    print(json.dumps({"safe_without_human": round(safe, 4), "options": options}))

asyncio.run(run())
"""
    rp = write_temp_text(runner)
    try:
        try:
            r = subprocess.run([py_bin, rp, tmp], cwd=cwd, capture_output=True,
                               text=True, timeout=300)
        except subprocess.TimeoutExpired:
            return None
    finally:
        for p in (tmp, rp):
            try:
                os.unlink(p)
            except OSError:
                pass
    if r.returncode != 0 or not r.stdout.strip():
        return None
    try:
        out = json.loads(r.stdout)
        return {"safe_without_human": round(float(out["safe_without_human"]), 4),
                "options": {str(k): round(float(v), 4) for k, v in out["options"].items()}}
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        return None


def write_temp(payload):
    import tempfile as tf
    fh = tf.NamedTemporaryFile("w", suffix=".json", delete=False)
    json.dump(payload, fh)
    fh.close()
    return fh.name


def write_temp_text(content, suffix=".py"):
    import tempfile as tf
    fh = tf.NamedTemporaryFile("w", suffix=suffix, delete=False)
    fh.write(content)
    fh.close()
    return fh.name


def corpus_hits(blocker):
    r = subprocess.run(["node", SEARCH, blocker], capture_output=True, text=True, timeout=60)
    text = (r.stdout or "").strip()
    return [] if (not text or "No matching" in text or "No local corpus" in text) \
        else text.splitlines()[:20]


def looks_irreversible(blocker):
    low = blocker.lower()
    return any(h in low for h in IRREVERSIBLE_HINTS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--blocker", required=True)
    ap.add_argument("--options", default="", help="pipe-separated candidate unblock options")
    ap.add_argument("--irreversible", action="store_true",
                    help="caller asserts this action is irreversible/high-stakes")
    ap.add_argument("--with-external", action="store_true", help="L2: also search external fables")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    options = [o.strip() for o in args.options.split("|") if o.strip()]
    result = {"blocker": args.blocker, "options": options, "ts": datetime.datetime.now(datetime.timezone.utc).isoformat()}

    # L0 SELF — corpus precedents
    result["L0_corpus"] = corpus_hits(args.blocker)[:3]

    # L1 LAYA — one-pass scoring (macOS only; skipped elsewhere)
    lv = laya_verdict(args.blocker, options)
    result["L1_laya"] = lv or "skipped (laya unavailable)"

    # L2 external precedents (opt-in; heavier)
    if args.with_external:
        try:
            r = subprocess.run(["node", os.path.join(PLUGIN_ROOT, "scripts", "retrieve.js"),
                                args.blocker, "--top", "2", "--per-dataset", "1",
                                "--max-rows-per-dataset", "16"],
                               capture_output=True, text=True, timeout=300)
            result["L2_external"] = (r.stdout or "")[:600]
        except Exception as e:
            result["L2_external"] = f"skipped: {e}"

    # L4 flag from caller or content or laya
    irreversible = args.irreversible or looks_irreversible(args.blocker) or \
        (isinstance(lv, dict) and lv.get("safe_without_human", 1.0) < 0.35)

    if irreversible:
        verdict = "ESCALATE_TO_HUMAN"
        result["escalation_package"] = {
            "context": args.blocker,
            "options": options,
            "recommendation": "prepare the safest reversible option and continue it meanwhile",
            "meanwhile": ("work continues on the reversible subset; the human answer is an "
                          "interrupt that upgrades the plan — the agent never idles"),
        }
    elif lv and isinstance(lv.get("options"), dict) and options:
        best = max(lv["options"], key=lv["options"].get)
        if lv["options"][best] >= 0.6:
            verdict = "PROCEED"
            result["decision"] = f"choose option: {best} (laya {lv['options'][best]}, documented assumption)"
        else:
            verdict = "RUN_SMART_LOOP"
    elif result["L0_corpus"]:
        verdict = "PROCEED"
        result["decision"] = "follow corpus precedent (L0 hit), documented assumption"
    else:
        verdict = "RUN_SMART_LOOP"
    result["verdict"] = verdict

    os.makedirs(os.path.dirname(ESCALATIONS), exist_ok=True)
    with open(ESCALATIONS, "a") as fh:
        fh.write(json.dumps(result, ensure_ascii=False) + "\n")

    # best-effort phone-home on human escalations (never fatal, never asked)
    if verdict == "ESCALATE_TO_HUMAN":
        try:
            import notify  # sibling script in this directory
            result["notify"] = notify.send(
                f"ESCALATION needs human: {args.blocker[:180]}", "high")
        except Exception:
            result["notify"] = "skipped"

    print(json.dumps(result, indent=2))
    sys.exit(4 if verdict == "ESCALATE_TO_HUMAN" else 0)


if __name__ == "__main__":
    main()
