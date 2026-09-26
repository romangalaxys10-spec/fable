#!/usr/bin/env python3
"""fable secmonitor — continuous scanning platform (local, key-free).

Turns sec-scan from a one-shot tool into a continuous service:

  record   run secscan against a target and store findings with stable IDs
  status   current open findings + trend vs previous runs + fix tracking
  diff     what changed since the previous run (new / resolved / still-open)
  history  list stored runs for a target

Finding identity: (finding_id + normalized evidence hash) so a finding that
moves between paths still tracks, while genuinely new findings are "new".
Resolved findings are marked fixed automatically on the next clean run —
that is the remediation tracker (AegisScan-style, file-based).

Storage: ~/.fable/secmon/<target-slug>/run-<ts>.json + state.json

Usage:
  python3 secmonitor.py record <target> [--repo path] [--vps ip] [--port-sweep top1000] [--compliance]
  python3 secmonitor.py status <target>
  python3 secmonitor.py diff <target>
  python3 secmonitor.py history <target>
  python3 secmonitor.py notify-setup <target> [--webhook URL]   # Slack/Discord/Telegram generic POST
"""

import datetime
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.request

PLUGIN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SECSCAN = os.path.join(PLUGIN_ROOT, "vendor", "sec-scan", "secscan.py")
BASE = os.path.expanduser("~/.fable/secmon")

NOW = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()


def slug(target):
    return re.sub(r"[^a-z0-9.-]+", "-", target.lower().replace("https://", "").replace("http://", "")).strip("-")


def tdir(target):
    d = os.path.join(BASE, slug(target))
    os.makedirs(d, exist_ok=True)
    return d


def parse_secscan_output(text):
    """Parse the console summary lines into structured findings."""
    findings = []
    for m in re.finditer(r"\[\s*(CRITICAL|HIGH|MEDIUM|LOW|INFO)\s*\]\s*([\w.-]+):\s*(.+)", text):
        sev, fid, title = m.group(1).lower(), m.group(2), m.group(3).strip()
        findings.append({"severity": sev, "id": fid, "title": title})
    summary = {}
    ms = re.search(r"summary:\s*(.+)", text)
    if ms:
        for kv in re.findall(r"(\w+)=(\d+)", ms.group(1)):
            summary[kv[0]] = int(kv[1])
    compliance = {}
    cm = re.search(r"compliance mapping \(finding .+?\):\n((?:  .+\n?)+)", text)
    if cm:
        for line in cm.group(1).strip().splitlines():
            mm = re.match(r"\s*([\w.-]+):\s*(.+)", line)
            if mm:
                compliance[mm.group(1)] = [x.strip() for x in mm.group(2).split(",")]
    return {"findings": findings, "summary": summary, "compliance": compliance}


def run_secscan(target, extra):
    cmd = [sys.executable, SECSCAN, target] + extra
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    return r.returncode, r.stdout + "\n" + r.stderr


def record(target, extra):
    rc, output = run_secscan(target, extra)
    parsed = parse_secscan_output(output)
    run = {
        "ts": NOW(),
        "target": target,
        "exit": rc,
        "summary": parsed["summary"],
        "findings": parsed["findings"],
        "compliance": parsed["compliance"],
        "raw_tail": output[-1500:],
    }
    # stable identity: id + hash of title+detail-ish
    for f in run["findings"]:
        f["uid"] = hashlib.sha1(f"{f['id']}|{f['title']}".encode()).hexdigest()[:12]
    d = tdir(target)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d-%H%M%S")
    with open(os.path.join(d, f"run-{stamp}.json"), "w") as fh:
        json.dump(run, fh, indent=1)
    # state: track uids across runs
    state_path = os.path.join(d, "state.json")
    state = {}
    if os.path.exists(state_path):
        try:
            state = json.load(open(state_path))
        except Exception:
            state = {}
    prev_uids = set(state.get("open_uids", []))
    cur_uids = {f["uid"] for f in run["findings"]}
    new = cur_uids - prev_uids
    fixed = prev_uids - cur_uids
    state.update({"open_uids": sorted(cur_uids), "last_run": run["ts"],
                  "new_uids": sorted(new), "fixed_uids": sorted(fixed)})
    json.dump(state, open(state_path, "w"), indent=1)

    out = {"target": target, "run_file": f"run-{stamp}.json", "exit": rc,
           "summary": run["summary"], "total_findings": len(run["findings"]),
           "new_since_last": len(new), "fixed_since_last": len(fixed)}
    new_high = [f for f in run["findings"]
                if f["uid"] in new and f.get("severity") in ("critical", "high")]
    if new and (os.environ.get("SECNOTIFY_WEBHOOK") or state.get("webhook")):
        try:
            out["notify"] = notify(state.get("webhook") or os.environ["SECNOTIFY_WEBHOOK"],
                                   target, run, new)
        except Exception as e:
            out["notify"] = f"webhook channel failed (non-fatal): {str(e)[:120]}"
    # third channel: Telegram/Discord via scripts/notify.py (best-effort)
    if new_high:
        try:
            nr = run_cmd_notify(
                f"{target}: {len(new_high)} new critical/high finding(s): "
                + "; ".join(f['id'] for f in new_high[:5]),
                "high")
            out["notify_rich"] = nr
        except Exception:
            out["notify_rich"] = "skipped"
    print(json.dumps(out, indent=2))
    return 0 if rc == 0 else 1


def run_cmd_notify(message, severity):
    here = os.path.dirname(os.path.abspath(__file__))
    r = subprocess.run([sys.executable, os.path.join(here, "notify.py"),
                        "--message", message, "--severity", severity],
                       capture_output=True, text=True, timeout=60)
    payload = None
    if r.returncode == 0 and r.stdout.strip():
        try:
            payload = json.loads(r.stdout)
        except json.JSONDecodeError:
            payload = None
    if payload is None or not payload.get("sent"):
        return {"sent": False, "note": (payload or {}).get("reason")
                or (r.stderr or "no channel")[:120]}
    return payload


def notify(webhook, target, run, new_uids):
    """Generic JSON POST (works for Slack/Discord/Telegram relays/custom)."""
    new_f = [f for f in run["findings"] if f["uid"] in new_uids
             and f["severity"] in ("critical", "high")]
    if not new_f:
        return "no new critical/high findings — no notification sent"
    payload = {"text": f"[fable secmon] {target}: {len(new_f)} new critical/high finding(s): "
               + "; ".join(f['id'] + ' ' + f['title'] for f in new_f[:5])}
    try:
        req = urllib.request.Request(webhook, data=json.dumps(payload).encode(),
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            return f"notified ({resp.status})"
    except Exception as e:
        return f"notify failed: {e}"


def load_runs(target):
    d = tdir(target)
    runs = []
    for f in sorted(os.listdir(d)):
        if f.startswith("run-") and f.endswith(".json"):
            runs.append(json.load(open(os.path.join(d, f))))
    return runs


def status(target):
    runs = load_runs(target)
    if not runs:
        print(json.dumps({"error": "no runs recorded — use `record` first"}))
        return 1
    last = runs[-1]
    open_uids = {f["uid"]: f for f in last["findings"]}
    first_seen = {}
    for r in runs:
        for f in r["findings"]:
            first_seen.setdefault(f["uid"], r["ts"])
    items = []
    for uid, f in sorted(open_uids.items(), key=lambda kv: kv[0]):
        items.append({"severity": f["severity"], "id": f["id"], "title": f["title"],
                      "uid": uid, "open_since": first_seen.get(uid, last["ts"])})
    trend = []
    for r in runs[-5:]:
        s = r.get("summary", {})
        trend.append({"ts": r["ts"], "critical": s.get("critical", 0),
                      "high": s.get("high", 0), "medium": s.get("medium", 0)})
    state = {}
    sp = os.path.join(tdir(target), "state.json")
    if os.path.exists(sp):
        state = json.load(open(sp))
    print(json.dumps({"target": target, "last_run": last["ts"], "exit": last["exit"],
                      "open_findings": items, "trend": trend,
                      "new_last_run": len(state.get("new_uids", [])),
                      "fixed_last_run": len(state.get("fixed_uids", [])),
                      "webhook_set": bool(state.get("webhook"))}, indent=2))
    return 0


def diff(target):
    runs = load_runs(target)
    if len(runs) < 1:
        print(json.dumps({"error": "no runs yet"}))
        return 1
    sp = os.path.join(tdir(target), "state.json")
    new_ids, fixed_ids = [], []
    if os.path.exists(sp):
        st = json.load(open(sp))
        new_ids, fixed_ids = st.get("new_uids", []), st.get("fixed_uids", [])
    def titles(runs_, uids):
        out = []
        for r in runs_:
            for f in r["findings"]:
                if f["uid"] in uids:
                    out.append(f"{f['severity']}: {f['id']} — {f['title']}")
        return out
    print(json.dumps({
        "target": target,
        "new": titles([runs[-1]], new_ids) or "none",
        "fixed": titles(runs[:-1], fixed_ids) or "none",
        "still_open": len({f["uid"] for f in runs[-1]["findings"]}),
    }, indent=2))
    return 0


def history(target):
    runs = load_runs(target)
    print(json.dumps([{ "ts": r["ts"], "exit": r["exit"], "summary": r.get("summary", {})}
                      for r in runs], indent=2))


def schedule_help(target, every_hours):
    """Print ready-to-use recurring setups (host crontab; ZCode scheduler
    registers the same command via CronCreate)."""
    here = os.path.abspath(__file__)
    cmd = (f"python3 {here} record {target} --compliance "
           f">> ~/.fable/secmon/cron.log 2>&1")
    lines = [
        {"provider": "host crontab (runs even when ZCode is closed)",
         "install": f"crontab -l 2>/dev/null | cat - <(echo '0 */{every_hours} * * * {cmd}') | crontab -",
         "note": f"every {every_hours}h; logs to ~/.fable/secmon/cron.log"},
        {"provider": "ZCode scheduler (CronCreate)",
         "prompt": f"Run: python3 {here} record {target} --compliance — then if any NEW critical/high "
                   f"findings appeared (compare via: python3 {here} diff {target}), summarize them "
                   f"and record a lesson card with the fable skill.",
         "note": "runs while ZCode is open; the agent interprets results too"},
        {"provider": "notify",
         "setup": f"python3 {here} notify-setup {target} --webhook <YOUR_WEBHOOK_URL>",
         "note": "fires on new critical/high findings at record time"},
    ]
    print(json.dumps({"target": target, "every_hours": every_hours,
                      "options": lines}, indent=2))


def main():
    a = sys.argv[1:]
    if not a:
        print(json.dumps({"usage": "secmonitor.py record <target> [--repo …] | status <t> | diff <t> | history <t> | notify-setup <t> --webhook URL"}))
        sys.exit(3)
    cmd, rest = a[0], a[1:]
    def val(flag, dflt=None):
        return rest[rest.index(flag) + 1] if flag in rest else dflt
    if cmd == "record":
        target = rest[0]
        extra = []
        for flag, argv_flag in (("--repo", "--repo"), ("--vps", "--vps")):
            if argv_flag in rest:
                extra += [flag, val(argv_flag)]
        if "--compliance" in rest:
            extra.append("--compliance")
        if "--port-sweep" in rest:
            extra += ["--port-sweep", val("--port-sweep", "top1000")]
        sys.exit(record(target, extra))
    if cmd == "status":
        sys.exit(status(rest[0]))
    if cmd == "diff":
        sys.exit(diff(rest[0]))
    if cmd == "history":
        history(rest[0]); return
    if cmd == "notify-setup":
        d = tdir(rest[0])
        sp = os.path.join(d, "state.json")
        state = json.load(open(sp)) if os.path.exists(sp) else {}
        state["webhook"] = val("--webhook", "")
        json.dump(state, open(sp, "w"), indent=1)
        print(json.dumps({"webhook_saved": True, "target": rest[0],
                          "fires_on": "new critical/high findings at record time"}))
        return
    if cmd == "schedule-help":
        schedule_help(rest[0], int(val("--every-hours", "24")))
        return
    print(json.dumps({"error": f"unknown command {cmd}"})); sys.exit(3)


if __name__ == "__main__":
    main()
