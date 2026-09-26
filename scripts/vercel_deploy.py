#!/usr/bin/env python3
"""fable vercel deploy — one-command deploy of web fixes (xshredo-class).

Wraps the Vercel CLI (`vercel --prod`) for repos wired to Vercel. Graceful:
without the CLI or a linked project, prints clear next steps instead of failing.

Usage:
  python3 vercel_deploy.py [--repo <path>] [--prod]
"""

import argparse
import json
import os
import shutil
import subprocess
import sys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=os.getcwd())
    ap.add_argument("--prod", action="store_true")
    a = ap.parse_args()

    vc = shutil.which("vercel") or shutil.which("vccl") or ""
    if not vc:
        print(json.dumps({"deployed": False,
                          "reason": "vercel CLI not found — npm i -g vercel, then `vercel link` in the repo"}))
        sys.exit(1)
    cmd = [vc, "--prod" if a.prod else "", "--yes"]
    r = subprocess.run([c for c in cmd if c], cwd=a.repo, capture_output=True,
                       text=True, timeout=900)
    url = next((l for l in r.stdout.splitlines() if l.startswith("https://")), "")
    print(json.dumps({"deployed": r.returncode == 0, "url": url.strip() or None,
                      "exit": r.returncode}, indent=2))
    sys.exit(0 if r.returncode == 0 else 1)


if __name__ == "__main__":
    main()
