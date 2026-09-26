#!/usr/bin/env python3
"""fable auto-capture — draft lesson cards at session end (hook script).

Registered by hooks/hooks.json (SessionEnd). Reads the hook payload from
stdin (JSON with transcript_path when available), extracts light session
stats, and appends a DRAFT card to ~/.fable/drafts.jsonl — never the real
corpus. Draft cards are promoted via record.js after human/agent review,
so quality stays high with zero manual effort.

Defensive by design: any failure exits 0 silently — a hook must never break
a session.
"""

import datetime
import json
import os
import sys

DRAFTS = os.path.expanduser("~/.fable/drafts.jsonl")
NOW = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()


def main():
    try:
        raw = sys.stdin.read() if not sys.stdin.isatty() else ""
        payload = json.loads(raw) if raw.strip() else {}
        if not isinstance(payload, dict):
            payload = {}
    except Exception:
        payload = {}

    transcript = payload.get("transcript_path") or ""
    session_id = str(payload.get("session_id") or payload.get("sessionId") or "unknown")[:80]
    card = {
        "draft": True,
        "ts": NOW(),
        "session_id": session_id,
        # basename only: never record full local paths in the drafts file
        "transcript": os.path.basename(transcript)[:120] if transcript else "",
        "task": "Session draft — review and promote with record.js",
        "stats": {},
    }

    # light stats from the transcript when readable
    try:
        if transcript and os.path.exists(transcript):
            first_ts = last_ts = None
            n_entries = 0
            with open(transcript, encoding="utf-8", errors="ignore") as fh:
                for line in fh:
                    n_entries += 1
                    try:
                        rec = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    ts = rec.get("timestamp")
                    if ts:
                        first_ts = first_ts or ts
                        last_ts = ts
            card["stats"] = {"entries": n_entries,
                             "first_ts": first_ts, "last_ts": last_ts}
    except Exception:
        pass

    try:
        os.makedirs(os.path.dirname(DRAFTS), exist_ok=True)
        with open(DRAFTS, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(card) + "\n")
    except Exception:
        pass  # hooks must never break the session
    sys.exit(0)


if __name__ == "__main__":
    main()
