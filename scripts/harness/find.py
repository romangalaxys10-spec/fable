#!/usr/bin/env python3
"""fable harness — find: locate a capability you already have, or a vetted source.

Search order:
  1. installed fable capabilities  ~/.fable/capabilities/
  2. fable's own built-ins         skills/ + vendor/ + scripts/ (this plugin)
  3. the vendored vetted-source registry (REPO_AGENTIC.md) — external repos we
     pre-audited at vendor time; installing from them still runs audit.py
  4. (opt-in) GitHub search restricted to allowlisted topics — results are
     UNTRUSTED by default and must clear the audit gate before install.

Usage:
  python3 find.py "<what the task needs>" [--github] [--json]
"""

import json
import os
import re
import subprocess
import sys

PLUGIN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CAPS = os.path.expanduser("~/.fable/capabilities")

VETTED = [
    {"name": "laya-triage", "where": "vendored", "path": "vendor/laya",
     "what": "on-device typed decision verdicts (macOS only)"},
    {"name": "headroom-compression", "where": "integration", "path": "vendor/headroom",
     "what": "token compression engine + installer"},
    {"name": "self-learning", "where": "vendored", "path": "vendor/self-learning-agents",
     "what": "feedback memory + prompt enhancement"},
    {"name": "smart-ledger", "where": "vendored", "path": "vendor/smart-protocol",
     "what": "GVS5H multi-agent loop for hard tasks"},
    {"name": "video-engines", "where": "vendored", "path": "vendor/vimax + ai4animation + remotion-starter",
     "what": "film pipeline, character animation, programmatic video"},
    {"name": "harness", "where": "this script", "path": "scripts/harness",
     "what": "produce/find/install capabilities with multi-phase audit"},
]

STOP = set("the a an and or for with need needs want get find install produce skill mcp plugin tool".split())


def tokens(q):
    return [t for t in re.split(r"[^a-z0-9]+", q.lower()) if len(t) > 2 and t not in STOP]


def score(hay, toks):
    hay_l = hay.lower()
    return sum(1 for t in toks if t in hay_l)


def main():
    args = sys.argv[1:]
    want_github = "--github" in args
    want_json = "--json" in args
    pos = [a for a in args if not a.startswith("--")]
    if not pos:
        print(json.dumps({"error": 'usage: find.py "<need>" [--github] [--json]'}))
        sys.exit(3)
    need = pos[0]
    toks = tokens(need)
    results = []

    caps = os.path.expanduser(CAPS)
    if os.path.isdir(caps):
        for name in sorted(os.listdir(caps)):
            p = os.path.join(caps, name)
            if os.path.isdir(p):
                results.append({"source": "installed", "name": name, "path": p,
                                "score": score(name, toks)})

    for sub, label in (("skills", "built-in skill"), ("vendor", "built-in engine"), ("scripts", "built-in script")):
        base = os.path.join(PLUGIN_ROOT, sub)
        if os.path.isdir(base):
            for name in sorted(os.listdir(base)):
                if score(name, toks):
                    results.append({"source": label, "name": name,
                                    "path": os.path.join(base, name), "score": score(name, toks) + 1})

    for v in VETTED:
        s = score(v["name"] + " " + v["what"], toks)
        if s:
            results.append({"source": "vetted-registry", **v, "score": s + 1})

    if want_github:
        q = " ".join(toks[:4])
        r = subprocess.run(
            ["curl", "-sS", "--max-time", "30",
             f"https://api.github.com/search/repositories?q={q}+topic:claude-plugins+topic:mcp-server&per_page=5"],
            capture_output=True, text=True, timeout=60)
        try:
            for item in json.loads(r.stdout).get("items", []):
                results.append({"source": "github-UNTRUSTED", "name": item["full_name"],
                                "path": item["clone_url"], "stars": item.get("stargazers_count"),
                                "license": (item.get("license") or {}).get("spdx_id"),
                                "score": 0,
                                "note": "must pass scripts/harness/audit.py before install"})
        except Exception as e:
            results.append({"source": "github-UNTRUSTED", "error": str(e)})

    results = [x for x in results if x.get("score", 0) > 0 or x.get("source") == "github-UNTRUSTED"]
    results.sort(key=lambda x: -x.get("score", 0))

    if want_json:
        print(json.dumps(results, indent=2))
    else:
        if not results:
            print(f"No local/vetted capability matches {need!r}. "
                  "Use scripts/harness/produce.py to build one, or re-run with --github (untrusted results).")
            return
        for x in results[:10]:
            stars = f" (stars {x['stars']}, {x.get('license')})" if "stars" in x else ""
            print(f"- [{x['source']}] {x['name']} → {x.get('path')}{stars}")


if __name__ == "__main__":
    main()
