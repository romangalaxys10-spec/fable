#!/usr/bin/env python3
"""fable route — smart in-skill routing: which parts of /fable does THIS task need?

Step 0 of any /fable task. Classifies the task (keywords everywhere; one
batched Laya pass on macOS for confirmation of ambiguous signals) and emits
a routing plan: the fable engines to engage, in order, with ready commands —
and explicitly which to SKIP. Agents re-run it on significant subtasks.

Usage:
  python3 scripts/route.py "<task or subtask>" [--laya] [--json]
"""

import datetime
import json
import os
import platform
import re
import subprocess
import sys

NOW = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()

PLUGIN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# route table: engine -> (include keywords, exclude keywords)
ROUTING = {
    "corpus_search": {
        "why": "always first — your own past lessons, cheapest source",
        "include": [],  # always
    },
    "external_retrieve": {
        "why": "task looks like coding/research/ops where prior sessions help",
        "include": ["code", "script", "bug", "fix", "build", "implement", "refactor",
                    "api", "parse", "scrape", "scraping", "debug", "test", "deploy",
                    "database", "sql", "docker", "research", "analyze", "report",
                    "data", "pipeline", "automate", "automation", "integration",
                    "email", "send", "fetch", "migrate", "configure", "install"],
        "exclude": ["video", "film", "animation", "storyboard", "brainstorm",
                    "idea only", "purely creative"],
    },
    "laya_boost": {
        "why": "retrieval will return candidates; on-device triage saves deep reads",
        "include": ["code", "bug", "fix", "implement", "research", "analyze",
                    "report", "pipeline", "debug", "optimize"],
        "exclude": [],
        "needs": "mac",
    },
    "headroom_compress": {
        "why": "only when transcripts will be pulled at full size",
        "include": ["--include-full-text", "long transcripts", "study deeply"],
        "exclude": [],
        "flag_only": True,   # never auto-runs; agent adds the flag instead
    },
    "smart_scaffold": {
        "why": "hard-task signals present",
        "include": ["architecture", "concurrency", "algorithm", "optimize",
                    "performance", "scal", "invariant", "race condition",
                    "refactor", "migration", "redesign", "protocol", "security",
                    "failed twice", "still failing", "hard"],
        "exclude": [],
    },
    "brainstorming": {
        "why": "creative/ambiguous work — intent gate before building",
        "include": ["new feature", "design", "idea", "concept", "prototype",
                    "what if", "should we", "explore", "creative", "ui", "ux",
                    "product", "naming", "brand", "story", "game"],
        "exclude": [],
    },
    "video_engines": {
        "why": "video/film/animation production",
        "include": ["video", "film", "movie", "animation", "animate", "render clip",
                    "storyboard", "short film", "reel", "motion graphics",
                    "character motion", "subtitle", "title card"],
        "exclude": [],
    },
    "sec_scan": {
        "why": "security audit of a site/VPS/repo (vendored secscan.py)",
        "include": ["security scan", "security audit", "secscan", "pentest",
                    "pentest-lite", "security check", "is our site safe",
                    "security report", "vulnerabilit", "hardening", "harden",
                    "csp", "tls", "https headers", "before launch",
                    "port scan", "secret leak", "exposed files"],
        "exclude": ["capability", "harness"],
    },
    "seo_geo_audit": {
        "why": "SEO + GEO audit: search rankings AND AI-engine citability (vendored seoaudit.py)",
        "include": ["seo", "geo", "search engine", "search ranking", "rank on",
                    "rank higher", "meta tags", "meta description", "structured data",
                    "schema.org", "schema markup", "ai search", "chatgpt search",
                    "perplexity", "gemini search", "ai overviews", "generative engine",
                    "citability", "cited by ai", "organic traffic", "keyword"],
        "exclude": ["capability", "harness"],
    },
    "capability_harness": {
        "why": "engages only when a needed capability is missing",
        "include": ["missing", "no tool for", "need a plugin", "need a skill",
                    "need an mcp", "integrate new"],
        "exclude": [],
    },
    "self_learning_record": {
        "why": "always at completion — that is the improvement loop",
        "include": [],  # always (at completion)
    },
    "ultra_speed": {
        "why": "trivial-mechanical or user signals speed",
        "include": ["fast", "quick", "quickly", "hurry", "asap", "one-liner",
                    "simple fix", "typo", "rename"],
        "exclude": ["architecture", "refactor", "security"],
    },
    "notify_channel": {
        "why": "sends alerts via Telegram/Discord/webhook (notify.py)",
        "include": [], "context_only": True,
    },
    "live_research": {
        "why": "live web intelligence via Brightdata (needs BRIGHTDATA_API_TOKEN)",
        "include": ["live", "latest", "today", "current", "news", "latest version",
                    "what changed", "competitor", "market intel"],
        "exclude": ["architecture", "refactor"],
    },
    "market_research": {
        "why": "finance vertical: earnings, competitive analysis, morning notes",
        "include": ["earnings", "stock", "stocks", "portfolio", "market analysis",
                    "fund", "funds", "valuation", "10-k", "10-q", "financial"],
        "exclude": [],
    },
    "colab_train": {
        "why": "GPU fine-tune of the Laya classifier from corpus lessons",
        "include": [], "context_only": True,
    },
    "postiz_publish": {
        "why": "schedule/publish LinkedIn posts with infographics or reports",
        "include": ["publish", "post to linkedin", "schedule post", "social media"],
        "exclude": [],
    },
    "js_render": {
        "why": "JS-rendered fetch for SPA pages (obscura/Firefox headless)",
        "include": ["spa", "javascript rendered", "client-side rendered", "puppeteer"],
        "exclude": [],
    },
    "jira_tickets": {
        "why": "create Jira tickets from critical/high findings",
        "include": [], "context_only": True,
    },
    "figma_design": {
        "why": "design-to-code feed for the video/design engines",
        "include": ["figma", "design mockup", "design frame"],
        "exclude": [],
    },
    "vercel_deploy": {
        "why": "one-command deploy of web fixes after approval",
        "include": [], "context_only": True,
    },
    "escalation_ladder": {
        "why": "only when actually blocked — not preloaded",
        "include": [],  # context-triggered, not task-triggered
        "context_only": True,
    },
}

ALWAYS = {"corpus_search", "self_learning_record"}
CONTEXT_ONLY = {"escalation_ladder", "capability_harness", "headroom_compress"}


def detect_laya():
    py = next((p for p in (os.environ.get("FABLE_LAYA_PY"),
                           os.path.expanduser("~/.fable/venvs/laya-mlx/bin/python"),
                           os.path.expanduser("~/.venvs/laya-mlx/bin/python"))
               if p and os.path.exists(p)), None)
    cwd = next((c for c in (os.environ.get("FABLE_LAYA_CWD"),
                            os.path.join(PLUGIN_ROOT, "vendor", "laya"))
                if c and os.path.isdir(c)), None)
    return (py, cwd) if py and cwd else None


def laya_confirm(task, ambiguous):
    """One batched pass over ambiguous engine names: does this task need them?"""
    laya = detect_laya()
    if laya is None or not ambiguous:
        return None
    py_bin, cwd = laya
    import tempfile as tf
    fh = tf.NamedTemporaryFile("w", suffix=".json", delete=False)
    json.dump({"task": task[:500], "engines": ambiguous}, fh)
    fh.close()
    tmp, rp = fh.name, None
    runner = """
import json, os, sys, asyncio
sys.path.insert(0, os.getcwd())
payload = json.load(open(sys.argv[1]))
import laya_mcp_server as lm

async def run():
    out = {}
    for eng in payload["engines"]:
        q = {eng: {"type": "noul",
             "instructions": ("Should the fable engine '" + eng + "' be used for this task? "
                              "true only if clearly relevant. Task: " + repr(payload["task"])),
             "criteria": {"false": "no", "true": "yes"}}}
        r, _ = await lm._run_predict(text=payload["task"][:400], questions=q,
                model="aac6fef/laya-mlx", device="gpu", dtype="float16")
        out[eng] = round(float(next(iter(r["answers"].values()))["noul"]), 4)
    print(json.dumps(out))

asyncio.run(run())
"""
    fh2 = tf.NamedTemporaryFile("w", suffix=".py", delete=False)
    fh2.write(runner)
    fh2.close()
    rp = fh2.name
    try:
        try:
            r = subprocess.run([py_bin, rp, tmp], cwd=cwd, capture_output=True,
                               text=True, timeout=300)
        except subprocess.TimeoutExpired:
            return None
    finally:
        for p in (tmp, rp):
            try:
                os.unlink(p)
            except OSError:
                pass
    if r.returncode != 0 or not r.stdout.strip():
        return None
    try:
        return {str(k): round(float(v), 4) for k, v in json.loads(r.stdout).items()}
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        return None


def is_mac():
    return platform.system() == "Darwin" and platform.machine() == "arm64"


ROUTE_STATS = os.path.expanduser("~/.fable/route_stats.jsonl")


def record_feedback(engines, outcome):
    """Append routing outcomes; aggregated by aggregate_feedback() at route time."""
    os.makedirs(os.path.dirname(ROUTE_STATS), exist_ok=True)
    with open(ROUTE_STATS, "a", encoding="utf-8") as fh:
        for e in engines:
            fh.write(json.dumps({"engine": e, "outcome": outcome, "ts": NOW()}) + "\n")
    return {"recorded": engines, "outcome": outcome}


def aggregate_feedback():
    """Per-engine success rate over the last 50 samples. Engines with >=3
    samples and <30% success are downgraded (skipped) by the router; >=70%
    success boosts ordering."""
    stats = {}
    if not os.path.exists(ROUTE_STATS):
        return stats
    try:
        with open(ROUTE_STATS, encoding="utf-8") as fh:
            lines = fh.readlines()[-200:]
    except OSError:
        return stats
    hist = {}
    for line in lines:
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue
        hist.setdefault(rec.get("engine", "?"), []).append(rec.get("outcome"))
    for eng, outs in hist.items():
        recent = outs[-50:]
        if len(recent) >= 3:
            rate = recent.count("success") / len(recent)
            stats[eng] = {"success_rate": round(rate, 2), "samples": len(recent)}
    return stats


def main():
    args = sys.argv[1:]
    use_laya = "--laya" in args
    want_json = "--json" in args

    # feedback mode: record routing outcomes (feeds the learning loop)
    if "--feedback" in args:
        engines = []
        outcome = "success"
        expect_engines = False
        for a in args:
            if expect_engines:
                engines = [e.strip() for e in a.split("|") if e.strip()]
                expect_engines = False
                continue
            if a == "--engines":
                expect_engines = True
                continue
            if a in ("success", "fail"):
                outcome = a
        if not engines:
            print(json.dumps({"error": "no engines given (use --engines \"a|b|c\")"}))
            sys.exit(3)
        print(json.dumps(record_feedback(engines, outcome), indent=2))
        return

    pos = [a for a in args if not a.startswith("--")]
    if not pos:
        print(json.dumps({"error": 'usage: route.py "<task>" [--laya] [--json] | --feedback --engines "a|b" success|fail'}))
        sys.exit(3)
    task = pos[0]
    low = task.lower()

    feedback = aggregate_feedback()

    routed, skipped = {}, {}
    for engine, spec in ROUTING.items():
        if engine in ALWAYS:
            routed[engine] = spec["why"]
            continue
        if spec.get("context_only"):
            skipped[engine] = spec["why"] + " (activates when context demands)"
            continue
        inc = any(k in low for k in spec["include"])
        exc = any(k in low for k in spec.get("exclude", []))
        if inc and not exc:
            routed[engine] = spec["why"]
        else:
            skipped[engine] = spec["why"]

    # learning loop: apply recorded success rates (>=3 samples)
    for eng, st in feedback.items():
        if eng in ROUTING and eng in ALWAYS:
            continue
        if st["success_rate"] >= 0.7 and eng in skipped and eng not in CONTEXT_ONLY:
            routed[eng] = f"feedback boost ({st['success_rate']} over {st['samples']} runs)"
            del skipped[eng]
        elif st["success_rate"] < 0.3 and eng in routed:
            skipped[eng] = f"downgraded by feedback ({st['success_rate']} over {st['samples']} runs)"
            del routed[eng]

    # Laya confirmation for genuinely ambiguous calls (mac only)
    ambiguous = [e for e in ("external_retrieve", "smart_scaffold", "brainstorming")
                 if e in skipped and e not in CONTEXT_ONLY]
    laya_out = None
    if use_laya and ambiguous and is_mac():
        laya_out = laya_confirm(task, ambiguous)
        if laya_out:
            for eng, p in laya_out.items():
                if p >= 0.62 and eng in skipped:
                    routed[eng] = f"laya confirmed ({p}) — " + ROUTING[eng]["why"]
                    del skipped[eng]
                elif p < 0.30 and eng in routed and eng not in ALWAYS:
                    skipped[eng] = f"laya rejected ({p}) — " + ROUTING[eng]["why"]
                    del routed[eng]

    plan = {
        "task": task,
        "platform_note": None if is_mac() else "non-mac: Laya triage skipped; boost runs Headroom-only",
        "use": [{"engine": e, "why": routed[e]} for e in routed],
        "skip": [{"engine": e, "why": skipped[e]} for e in skipped],
        "laya_confirmation": laya_out,
        "order": [
            "0) route (this output)",
            "1) corpus: node scripts/search.js \"<task>\"" + ("  [RUN]" if "corpus_search" in routed else "  [skip]"),
            "2) boost: python3 scripts/boost/boost.py --task \"<task>\""
            + ("  [RUN]" if "external_retrieve" in routed else "  [skip]"),
            "3) hard? -> smart_scaffold.py | creative? -> brainstorming skill | video? -> skills/video",
            "4) blocked? -> scripts/escalate.py --blocker \"…\" --options \"a|b\"",
            "5) done -> node scripts/record.js … (always)",
        ],
    }
    print(json.dumps(plan, indent=2))


if __name__ == "__main__":
    main()
