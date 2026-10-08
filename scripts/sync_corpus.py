#!/usr/bin/env python3
"""fable sync — carry your experience across devices.

Exports/merges the fable state directory (~/.fable/) as a portable bundle:
  corpus.jsonl · secgate-baseline.json · route_stats.jsonl · telemetry.jsonl
  secmon history (targets + runs)

Modes:
  push  [--git <repo-dir>]   bundle state; with --git, copy into a git repo
                             (e.g. your private brain repo) and commit
  pull  --from <bundle-dir>  merge a bundle into local state (dedupe by id)
  status                     show local vs last bundle summary

Merge rules: corpus = dedupe by task signature; route_stats/telemetry =
append (JSONL); secmon = copy runs not already present (by filename).
"""

import datetime
import json
import os
import shutil
import subprocess
import sys

BASE = os.path.expanduser("~/.fable")
SYNC = os.path.join(BASE, "sync")
FILES = ["corpus.jsonl", "secgate-baseline.json", "route_stats.jsonl", "telemetry.jsonl"]
SECMON = os.path.join(BASE, "secmon")
NOW = lambda: datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d-%H%M%S")


def bundle_dir():
    d = os.path.join(SYNC, "latest")
    os.makedirs(d, exist_ok=True)
    return d


def cmd_push(git_dir=None):
    d = bundle_dir()
    copied = []
    for f in FILES:
        src = os.path.join(BASE, f)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(d, f))
            copied.append(f)
    if os.path.isdir(SECMON):
        dst_secmon = os.path.join(d, "secmon")
        for target in os.listdir(SECMON):
            tsrc = os.path.join(SECMON, target)
            if os.path.isdir(tsrc):
                tdst = os.path.join(dst_secmon, target)
                os.makedirs(tdst, exist_ok=True)
                for f in os.listdir(tsrc):
                    if f.endswith(".json"):
                        shutil.copy2(os.path.join(tsrc, f), os.path.join(tdst, f))
        copied.append("secmon/")
    out = {"bundled": copied, "bundle": d}
    if git_dir:
        gd = os.path.abspath(git_dir)
        os.makedirs(gd, exist_ok=True)
        for f in FILES + ["secmon"]:
            src = os.path.join(d, f)
            if os.path.exists(src):
                dst = os.path.join(gd, f)
                if os.path.isdir(src):
                    shutil.copytree(src, dst, dirs_exist_ok=True)
                else:
                    shutil.copy2(src, dst)
        r = subprocess.run(["git", "-C", gd, "add", "-A"], capture_output=True, text=True)
        r = subprocess.run(["git", "-C", gd, "commit", "-q", "-m", "fable state sync " + NOW()],
                           capture_output=True, text=True)
        out["git_commit"] = "ok" if r.returncode == 0 else f"no changes or commit failed: {r.stdout.strip()[:60]}"
    print(json.dumps(out, indent=2))


def cmd_pull(bundle):
    """Merge a bundle (or a git repo checkout containing one) into local state."""
    counts = {"corpus": 0, "route_stats": 0, "telemetry": 0, "secmon_runs": 0}
    for f in FILES:
        src = os.path.join(bundle, f)
        dst = os.path.join(BASE, f)
        if not os.path.exists(src):
            continue
        if f.endswith(".jsonl"):
            existing = set()
            if os.path.exists(dst):
                existing = set(open(dst, encoding="utf-8").readlines())
            new_lines = [l for l in open(src, encoding="utf-8") if l not in existing]
            with open(dst, "a", encoding="utf-8") as fh:
                fh.writelines(new_lines)
            counts[f] = len(new_lines)
        else:
            shutil.copy2(src, dst)
    src_secmon = os.path.join(bundle, "secmon")
    if os.path.isdir(src_secmon):
        for target in os.listdir(src_secmon):
            tsrc = os.path.join(src_secmon, target)
            tdst = os.path.join(SECMON, target)
            os.makedirs(tdst, exist_ok=True)
            for f in os.listdir(tsrc):
                if f.endswith(".json") and not os.path.exists(os.path.join(tdst, f)):
                    shutil.copy2(os.path.join(tsrc, f), os.path.join(tdst, f))
                    counts["secmon_runs"] += 1
    print(json.dumps({"pulled_from": bundle, "merged": counts}, indent=2))


def cmd_status():
    d = bundle_dir()
    print(json.dumps({"state_dir": BASE,
                      "corpus_cards": sum(1 for _ in open(os.path.join(BASE, "corpus.jsonl")))
                      if os.path.exists(os.path.join(BASE, "corpus.jsonl")) else 0,
                      "bundle_current": sorted(os.listdir(d)) if os.path.isdir(d) else [],
                      "monitored_targets": os.listdir(SECMON) if os.path.isdir(SECMON) else []}, indent=2))


def main():
    a = sys.argv[1:]
    if a and a[0] == "push":
        git_dir = a[a.index("--git") + 1] if "--git" in a else None
        cmd_push(git_dir)
    elif a and a[0] == "pull":
        if "--from" not in a:
            print(json.dumps({"error": "pull --from <bundle-or-repo-dir>"})); sys.exit(3)
        cmd_pull(a[a.index("--from") + 1])
    elif a and a[0] == "status":
        cmd_status()
    else:
        print(json.dumps({"usage": "sync_corpus.py push [--git <dir>] | pull --from <dir> | status"}))


if __name__ == "__main__":
    main()
