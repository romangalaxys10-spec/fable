#!/usr/bin/env python3
"""fable security gate — automatic pre-delivery audit for the plugin itself.

Every code/feature/delivery passes through here WITHOUT the user asking.
Reuses the harness audit engine (P0 policy ▸ P1 secrets ▸ P2 dangerous APIs)
on the plugin tree, with a BASELINE allowlist so known/accepted findings
(e.g. regex strings inside the security tools themselves) don't re-block —
but any NEW critical/high finding blocks delivery hard.

Modes:
  python3 security_gate.py                 # audit; block on NEW critical/high vs baseline
  python3 security_gate.py --accept-baseline --i-have-reviewed
                                           # one-time human bootstrap: save current
                                           # findings as the accepted baseline
  python3 security_gate.py --target <dir>  # audit a different tree (e.g. a delivery)

Exit: 0 pass · 1 blocked · 2 usage. Human approval is NEVER implied —
--i-have-reviewed must be explicit on the bootstrap run only.

Baseline: ~/.fable/secgate-baseline.json (digests per finding: file+kind+evidence).
"""

import hashlib
import json
import os
import sys

_PLUGIN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
HARNESS = os.path.join(_PLUGIN_ROOT, "scripts", "harness")
BASELINE = os.path.expanduser("~/.fable/secgate-baseline.json")

sys.path.insert(0, HARNESS)
from audit import audit  # noqa: E402 — same 4-phase engine the harness uses


def finding_key(f, rel_root):
    """Stable identity for a finding: kind + file + evidence digest."""
    ev = hashlib.sha1(f"{f.get('file','')}|{f.get('kind','')}|{f.get('detail','')}".encode()).hexdigest()[:12]
    return ev


def load_baseline():
    try:
        with open(BASELINE) as fh:
            return json.load(fh)
    except Exception:
        return {}


def save_baseline(keys, meta):
    os.makedirs(os.path.dirname(BASELINE), exist_ok=True)
    json.dump({"saved": meta, "accepted": keys}, open(BASELINE, "w"), indent=1)


def main():
    args = sys.argv[1:]
    target = os.path.abspath(_PLUGIN_ROOT)
    if "--target" in args:
        target = os.path.abspath(args[args.index("--target") + 1])
    accept = "--accept-baseline" in args
    human = "--i-have-reviewed" in args
    want_json = "--json" in args

    if accept and not human:
        msg = ("bootstrap requires --i-have-reviewed: accepting a baseline is a "
               "human decision (the agent must never self-approve findings)")
        print(json.dumps({"verdict": "blocked", "error": msg}) if want_json else msg)
        sys.exit(1)

    result = audit(target)
    all_f = [f for f in result["findings"] if f["severity"] != "info"]
    base = load_baseline()
    accepted = set(base.get("accepted", []))

    fresh, known = [], []
    for f in all_f:
        (known if finding_key(f, target) in accepted else fresh).append(f)

    fresh_bad = [f for f in fresh if f["severity"] in ("critical", "high")]
    if accept and human:
        # human reviewed the CURRENT full list: accept all of it
        keys = [finding_key(f, target) for f in all_f]
        save_baseline(keys, {"target": target})
        out = {"verdict": "baseline-accepted", "accepted_count": len(keys),
               "note": "future deliveries block only on findings outside this baseline"}
        print(json.dumps(out, indent=2) if want_json else json.dumps(out, indent=2))
        sys.exit(0)

    if fresh_bad:
        verdict = "blocked"
        exit_code = 1
        note = ("delivery BLOCKED — new critical/high findings exist. Fix them, or "
                "have a human review and run with --accept-baseline --i-have-reviewed.")
    elif fresh:
        verdict = "needs-review"
        exit_code = 2
        note = ("new medium findings exist — delivery proceeds, but review them "
                "at your convenience (add to baseline with the bootstrap flag if accepted).")
    else:
        verdict = "pass"
        exit_code = 0
        note = f"clean: {len(known)} known/accepted findings, 0 new"

    out = {"verdict": verdict, "target": target,
           "known_accepted": len(known),
           "new_findings": [{"severity": f["severity"], "kind": f["kind"],
                             "file": f.get("file"), "detail": f["detail"][:160]}
                            for f in fresh],
           "note": note}
    if want_json:
        print(json.dumps(out, indent=2))
    else:
        print(f"security gate: {verdict.upper()} — known {len(known)}, new {len(fresh)}")
        for f in fresh:
            print(f"  [{f['severity']}] {f['kind']}: {f['detail'][:110]} ({f.get('file','')})")
        print(note)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
