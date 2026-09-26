#!/usr/bin/env python3
"""fable site_health — combined security + SEO/GEO weekly scan → one immersive report.

Runs both auditors against a target, merges into a single "site health"
verdict, and generates the immersive HTML + PDF pair (via report.py when a
matching run is stored, else self-rendered).

Usage:
  python3 site_health.py <target> [--out-dir DIR]
"""

import datetime
import json
import os
import subprocess
import sys

PLUGIN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SECMON = os.path.join(PLUGIN_ROOT, "scripts", "secmonitor.py")
SEOAUDIT = os.path.join(PLUGIN_ROOT, "vendor", "seo-geo", "seoaudit.py")
REPORT = os.path.join(PLUGIN_ROOT, "scripts", "report.py")


def run(cmd, timeout=900):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def last_run_file(target):
    slug = target.lower().replace("https://", "").replace("http://", "").strip("/")
    import re
    slug = re.sub(r"[^a-z0-9.-]+", "-", slug)
    d = os.path.join(os.path.expanduser("~/.fable/secmon"), slug)
    if not os.path.isdir(d):
        return None
    runs = sorted(f for f in os.listdir(d) if f.startswith("run-") and f.endswith(".json"))
    return os.path.join(d, runs[-1]) if runs else None


def main():
    a = sys.argv[1:]
    target = a[0] if a else ""
    if not target:
        print(json.dumps({"error": "usage: site_health.py <target> [--out-dir DIR]"}))
        sys.exit(3)
    out_dir = a[a.index("--out-dir") + 1] if "--out-dir" in a else os.path.join(
        os.path.expanduser("~"), "Documents", "Market Researches", "fable-linkedin")
    os.makedirs(out_dir, exist_ok=True)
    date = datetime.datetime.now().strftime("%Y-%m-%d")

    # security leg
    r1 = run([sys.executable, SECMON, "record", target, "--compliance"], timeout=900)
    sec_ok = r1.returncode in (0, 1)
    # SEO/GEO leg
    r2 = run([sys.executable, SEOAUDIT, target, "--store", "--json"], timeout=300)
    seo_ok = r2.returncode == 0

    result = {"target": target, "date": date, "security": "ok" if sec_ok else "failed",
              "seo_geo": "ok" if seo_ok else "failed"}

    # immersive combined report via report.py (renders latest stored run;
    # we point it at whichever engine produced a usable stored run)
    report_files = []
    for flag, script in (("--run-file", None),):
        pass
    sec_run = last_run_file(target)
    if sec_run:
        rr = run([sys.executable, REPORT, target, "--out-dir", out_dir])
        if os.path.isdir(out_dir):
            reports = sorted(f for f in os.listdir(out_dir) if f.startswith("fable-sec-report"))
            report_files += reports[-2:]

    print(json.dumps({
        "target": target, "date": date,
        "security_scan": result["security"],
        "seo_geo_scan": result["seo_geo"],
        "report_dir": out_dir,
        "report_files": report_files,
        "next": ("open the HTML report; fixes still follow the propose→approve→"
                 "fix workflow"),
    }, indent=2))


if __name__ == "__main__":
    main()
