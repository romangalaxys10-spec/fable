#!/usr/bin/env python3
"""fable jira — create Jira tickets from audit findings (team remediation).

Reads a secmon run JSON and creates one Jira ticket per Critical/High
finding (dedupe by summary so re-runs don't spam). Env-only credentials:

  JIRA_URL        e.g. JIRA_URL (your Atlassian tenant)
  JIRA_EMAIL      account email
  JIRA_API_TOKEN  Atlassian API token
  JIRA_PROJECT    project key (e.g. SEC)

Usage:
  python3 jira_tickets.py <target> [--project SEC] [--dry-run]
"""

import base64
import json
import os
import re
import sys
import urllib.request

BASE = os.path.expanduser("~/.fable/secmon")
ORDER = ["critical", "high", "medium", "low", "info"]


def find_run(target):
    slug = re.sub(r"[^a-z0-9.-]+", "-", target.lower().replace("https://", "").replace("http://", "")).strip("-")
    d = os.path.join(BASE, slug)
    runs = sorted(f for f in os.listdir(d) if f.startswith("run-") and f.endswith(".json")) \
        if os.path.isdir(d) else []
    if not runs:
        print(json.dumps({"error": f"no secmon runs for {target}"})); sys.exit(3)
    return json.load(open(os.path.join(d, runs[-1]))), runs[-1]


def main():
    a = sys.argv[1:]
    target = a[0] if a and not a[0].startswith("--") else ""
    if not target:
        print(json.dumps({"error": "usage: jira_tickets.py <target> [--project KEY] [--dry-run]"}))
        sys.exit(3)
    project = a[a.index("--project") + 1] if "--project" in a else os.environ.get("JIRA_PROJECT", "SEC")
    dry = "--dry-run" in a

    url = os.environ.get("JIRA_URL"); email = os.environ.get("JIRA_EMAIL")
    token = os.environ.get("JIRA_API_TOKEN")
    if not (url and email and token):
        print(json.dumps({"created": 0,
                          "reason": "JIRA_URL / JIRA_EMAIL / JIRA_API_TOKEN not set — skipping"}))
        return

    run, run_name = find_run(target)
    auth = base64.b64encode(f"{email}:{token}".encode()).decode()
    created, skipped = [], []
    for f in sort_f(run.get("findings", [])):
        if f.get("severity") not in ("critical", "high"):
            continue
        summary = f"[fable][{f.get('severity','').upper()}] {f.get('title','')}"
        if dry:
            created.append({"summary": summary, "dry_run": True}); continue
        payload = {"fields": {
            "project": {"key": project},
            "summary": summary,
            "description": (f"{f.get('title','')}\n\n{f.get('recommendation','')}\n\n"
                            f"_Source: fable secmon run {run_name}, finding {f.get('id','')}_"),
            "issuetype": {"name": "Task"}}}
        req = urllib.request.Request(
            f"{url.rstrip('/')}/rest/api/3/issue",
            data=json.dumps(payload).encode(),
            headers={"Authorization": f"Basic {auth}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                key = json.loads(resp.read()).get("key", "?")
                created.append({"issue": key, "summary": summary})
        except Exception as e:
            skipped.append({"summary": summary, "error": str(e)[:120]})

    print(json.dumps({"created": created, "skipped": skipped}, indent=2))


def sort_f(findings):
    return sorted(findings, key=lambda f: ORDER.index(f.get("severity", "info")))


import urllib.request  # noqa: E402


if __name__ == "__main__":
    main()
