#!/usr/bin/env python3
"""fable telemetry — accumulate and show the value Fable delivers.

boost.py and other engines append events; `dashboard` aggregates:
  tokens saved (Headroom), Laya verdicts, gate blocks, escalations.

Events file: ~/.fable/telemetry.jsonl (JSONL: {ts, kind, ...data}).

Usage:
  python3 telemetry.py dashboard
  python3 telemetry.py record --kind <boost|gate|escalation|seo> --data '{"json":"here"}'
"""

import argparse
import collections
import datetime
import json
import os
import sys

EVENTS = os.path.expanduser("~/.fable/telemetry.jsonl")


def append_event(kind, data):
    if not isinstance(data, dict):
        data = {}
    # ts/kind are authoritative from the caller — payload cannot forge them
    ev = {"ts": datetime.datetime.now(datetime.timezone.utc).isoformat(), "kind": kind}
    for k, v in data.items():
        if k in ("ts", "kind"):
            continue
        if isinstance(v, (int, float, str, bool)) or v is None:
            ev[k] = v
    os.makedirs(os.path.dirname(EVENTS), exist_ok=True)
    with open(EVENTS, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(ev) + "\n")
    return ev


def dashboard():
    events = []
    if os.path.exists(EVENTS):
        with open(EVENTS, encoding="utf-8") as fh:
            for line in fh:
                try:
                    ev = json.loads(line)
                    if isinstance(ev, dict):
                        events.append(ev)
                except json.JSONDecodeError:
                    continue

    def num(e, key):
        v = e.get(key, 0)
        return v if isinstance(v, (int, float)) else 0

    tokens_before = sum(num(e, "tokens_before") for e in events if e.get("kind") == "headroom")
    tokens_after = sum(num(e, "tokens_after") for e in events if e.get("kind") == "headroom")
    laya = [e for e in events if e.get("kind") == "laya"]
    gate_blocks = sum(1 for e in events if e.get("kind") == "gate" and e.get("verdict") == "blocked")
    escalations = collections.Counter(str(e.get("verdict")) for e in events if e.get("kind") == "escalation")
    seo_runs = sum(1 for e in events if e.get("kind") == "seo")

    print(json.dumps({
        "events_total": len(events),
        "headroom_tokens_before": tokens_before,
        "headroom_tokens_after": tokens_after,
        "headroom_tokens_saved": tokens_before - tokens_after,
        "laya_verdicts": len(laya),
        "laya_useful": sum(1 for e in laya if e.get("useful")),
        "gate_blocks": gate_blocks,
        "escalations": dict(escalations),
        "seo_audits": seo_runs,
    }, indent=2))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["dashboard", "record"])
    ap.add_argument("--kind", help="event kind: boost|headroom|laya|gate|escalation|seo")
    ap.add_argument("--data", help="event payload as JSON string")
    a = ap.parse_args()
    if a.cmd == "dashboard":
        dashboard()
        return
    try:
        data = json.loads(a.data) if a.data else {}
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"bad --data JSON: {e}"})); sys.exit(3)
    if not a.kind:
        print(json.dumps({"error": "--kind required"})); sys.exit(3)
    print(json.dumps(append_event(a.kind, data), indent=2))


if __name__ == "__main__":
    main()
