#!/usr/bin/env python3
"""fable live research — Brightdata web intelligence engine (optional).

Adds present-day web awareness to Fable's research layer (past sessions +
corpus are static; this sees the live web). Uses the Brightdata SERP API
with a key from the environment:

  BRIGHTDATA_API_TOKEN   your Brightdata token
  (optional) BRIGHTDATA_ZONE   defaults to "web_unlocker"

Graceful: without a token the script prints a clear skip notice and exits 0 —
callers (boost/route) treat it as an absent engine. Output: top organic
results (title + URL) as JSON, ready to fold into the research digest.

Usage:
  python3 live_research.py "<query>" [--n 5]
"""

import argparse
import json
import os
import sys
import urllib.request

TOKEN = os.environ.get("BRIGHTDATA_API_TOKEN")
ZONE = os.environ.get("BRIGHTDATA_ZONE", "web_unlocker")
ENDPOINT = "https://api.brightdata.com/datasets/v3/trigger"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("query")
    ap.add_argument("--n", type=int, default=5)
    a = ap.parse_args()

    if not TOKEN:
        print(json.dumps({"engine": "brightdata", "status": "skipped",
                          "reason": "BRIGHTDATA_API_TOKEN not set — live research skipped",
                          "results": []}))
        return
    payload = [{"search_engine": "google", "keyword": a.query,
                "country": "", "parse": True}]
    req = urllib.request.Request(
        f"{ENDPOINT}?dataset_id={ZONE}&format=json&uncompressed_webhook=true",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read().decode("utf-8", "replace"))
    except Exception as e:
        print(json.dumps({"engine": "brightdata", "status": "error", "error": str(e)[:200]}))
        return
    print(json.dumps({"engine": "brightdata", "status": "triggered", "response": body}, indent=2))


if __name__ == "__main__":
    main()
