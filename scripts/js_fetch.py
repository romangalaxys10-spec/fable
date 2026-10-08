#!/usr/bin/env python3
"""fable js_fetch — JS-rendered page fetch via local obscura headless browser.

Modern SPAs (Next.js etc.) serve content via JS; raw HTML fetches miss the
rendered DOM. This fetches the *rendered* page through the local obscura
browser (never Chrome) so sec-scan and SEO/GEO audits see what users and AI
crawlers executing JS see.

Usage:
  python3 js_fetch.py <url> [--out file.html]
Output: rendered HTML on stdout (or --out file); exit 0 ok / 1 fail.
"""

import argparse
import json
import os
import subprocess
import sys

OBSCURA = os.path.expanduser("~/.local/bin/obscura")
FIREFOX = "/Applications/Firefox.app/Contents/MacOS/firefox"


def fetch_obscura(url):
    r = subprocess.run([OBSCURA, "fetch", "--dump", "html", url],
                       capture_output=True, text=True, timeout=90)
    return r.returncode, r.stdout


def fetch_firefox(url):
    shot = "/tmp/fable-jsfetch-capture.png"
    r = subprocess.run([FIREFOX, "--headless", "--screenshot", shot,
                        "--window-size=1920,4000", url],
                       capture_output=True, text=True, timeout=90)
    if r.returncode != 0 or not os.path.exists(shot):
        return 1, ""
    # Firefox headless can't dump DOM directly; screenshot proves render but
    # has no HTML. Signal partial success to the caller.
    return 2, f"<!-- JS-rendered screenshot captured: {shot} (DOM dump unsupported) -->"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("--out", help="write rendered HTML to file (default stdout)")
    a = ap.parse_args()

    url = a.url if a.url.startswith("http") else "https://" + a.url

    html, engine = "", None
    if os.path.exists(OBSCURA):
        rc, html = fetch_obscura(url)
        engine = "obscura" if rc == 0 and html.strip() else None
    if not engine and os.path.exists(FIREFOX):
        rc, html = fetch_firefox(url)
        engine = "firefox-screenshot" if rc == 0 and html.strip() else None

    if not engine:
        print(json.dumps({"error": "no JS-render engine available "
                                   "(install obscura or Firefox)"}), file=sys.stderr)
        sys.exit(1)
    if a.out:
        with open(a.out, "w", encoding="utf-8") as fh:
            fh.write(html)
        print(f"saved rendered page ({engine}) → {a.out}")
    else:
        sys.stdout.write(html)


if __name__ == "__main__":
    main()
