#!/usr/bin/env python3
"""fable → smart bridge: scaffold the /smart ledger pre-seeded with fable research.

One command turns a task into a ready-to-run GVS5H smart ledger:

    python3 scripts/boost/smart_scaffold.py --task "<the task>" [--criteria "c1; c2"]

What it does:
  1. slug = first 8 hex chars of md5(task)  (smart protocol rule — hex only,
     so no path traversal is possible from user-supplied words).
  2. Runs the boost research FIRST; only on success creates
     <root>/.smart/<slug>/ with the protocol files:
       task.md         — verbatim task + acceptance criteria
       plan.md         — stub (the smart PLAN phase fills it)
       notes.md        — seeded with a COMPACT `## fable-research` digest
                         (top candidates: laya verdict + prompt + error lines)
                         plus local-corpus hits, kept lean (protocol: ≤800 words)
       tasks.json      — empty array (PLAN writes the real tasks)
       tests_spec.md   — placeholder header (TEST-SPEC phase writes tests)
       verify.log      — header line
  3. Saves the FULL boost pack alongside as fable-research.json. If one
     already exists, the previous pack is kept as fable-research.previous.json
     (never silently overwritten).
  4. Never clobbers other ledger files — merges only the fable-research
     sections into notes.md if missing.

Research source: runs scripts/boost/boost.py inline unless --boost-json is
given (file path, or "-" for stdin).

Output: JSON {slug, ledger_dir, files_written, next_step} on success,
{"error": ...} on failure. Exit codes: 0 ok, 2 usage, 1 failure.
"""

import hashlib
import json
import os
import shutil
import subprocess
import sys

PLUGIN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BOOST = os.path.join(PLUGIN_ROOT, "scripts", "boost", "boost.py")
SEARCH = os.path.join(PLUGIN_ROOT, "scripts", "search.js")


def parse_args(argv):
    kv, positionals = {}, []
    i = 1
    while i < len(argv):
        a = argv[i]
        if a.startswith("--") and i + 1 < len(argv) and not argv[i + 1].startswith("--"):
            kv[a[2:]] = argv[i + 1]
            i += 2
        else:
            positionals.append(a)
            i += 1
    task = kv.get("task") or (positionals[0] if positionals else "")
    if not task:
        print(json.dumps({"error": 'usage: smart_scaffold.py --task "<task>" [--criteria "c1; c2"] '
                                   '[--boost-json file|-] [--root dir] [--retrieve-top N] [--laya-top N]'}))
        sys.exit(2)
    return task, kv


def load_boost_pack(task, kv):
    """Boost pack from --boost-json, stdin, or by running boost.py inline."""
    src = kv.get("boost-json")
    if src == "-":
        return json.load(sys.stdin)
    if src:
        with open(src) as fh:
            return json.load(fh)
    cmd = [sys.executable, BOOST, "--task", task,
           "--retrieve-top", kv.get("retrieve-top", "6"),
           "--laya-top", kv.get("laya-top", "3"),
           "--failures", kv.get("failures", "2")]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    if r.returncode != 0 or not r.stdout.strip():
        raise RuntimeError(f"boost.py failed: {(r.stderr or 'empty output').strip()[:300]}")
    return json.loads(r.stdout)


def compact_digest(pack, max_candidates=3):
    """≤800-word-safe digest: per candidate — dataset, laya verdict, prompt, errors."""
    lines = []
    cands = pack.get("final_candidates") or []
    for c in cands[:max_candidates]:
        if not isinstance(c, dict):
            continue
        prompt = str(c.get("prompt") or "").replace("\n", " ")[:220]
        errs = [str(e).replace("\n", " ")[:150] for e in (c.get("errors_lessons") or [])[:2]
                if isinstance(e, str) and not e.startswith("(")]
        laya = c.get("laya_relevance")
        lines.append(f"- [{c.get('dataset')}] {str(c.get('session_id'))[:12]} "
                     f"(laya {laya if laya is not None else 'n/a'}) — prompt: {prompt}")
        for e in errs:
            lines.append(f"    - error/lesson: {e}")
    if not lines:
        lines.append("- (no relevant external fables found; rely on local corpus + fresh ideation)")
    return "\n".join(lines)


def local_corpus_digest(task):
    """search.js text output, truncated — local experience first."""
    try:
        r = subprocess.run(["node", SEARCH, task], capture_output=True, text=True, timeout=60)
        text = (r.stdout or "").strip()
        if not text or "No matching" in text or "No local corpus" in text:
            return ""
        return "\n".join(text.splitlines()[:40])
    except Exception:
        return ""


def write_if_absent(path, content):
    if os.path.exists(path):
        return False
    with open(path, "w") as fh:
        fh.write(content)
    return True


def main():
    try:
        task, kv = parse_args(sys.argv)
        root = os.path.abspath(kv.get("root") or os.getcwd())
        slug = hashlib.md5(task.encode("utf-8")).hexdigest()[:8]
        ledger = os.path.join(root, ".smart", slug)

        # Research first — never leave a partial empty ledger behind on failure.
        pack = load_boost_pack(task, kv)
        digest = compact_digest(pack)
        corpus = local_corpus_digest(task)

        os.makedirs(ledger, exist_ok=True)

        criteria = [c.strip() for c in (kv.get("criteria") or "").split(";") if c.strip()]
        criteria_md = ("\n".join(f"{i+1}. {c}" for i, c in enumerate(criteria))
                       or "_(the user has not stated explicit criteria — confirm them before WORK)_")

        written = []
        if write_if_absent(os.path.join(ledger, "task.md"),
                           f"# Task\n\n{task}\n\n## Acceptance criteria\n\n{criteria_md}\n"):
            written.append("task.md")
        if write_if_absent(os.path.join(ledger, "plan.md"),
                           "# Plan\n\n_(PLAN phase: write a 3–6 sentence strategy here, ≤4000 chars, then fill tasks.json)_\n"):
            written.append("plan.md")
        if write_if_absent(os.path.join(ledger, "tasks.json"), "[]\n"):
            written.append("tasks.json")
        if write_if_absent(os.path.join(ledger, "tests_spec.md"),
                           "# Adversarial tests\n\n_(TEST-SPEC phase: 3–8 edge-case tests + 1–2 property tests, written BEFORE implementation)_\n"):
            written.append("tests_spec.md")
        if write_if_absent(os.path.join(ledger, "verify.log"),
                           "# verify.log\n\n_(every verification run + verdict; a failed verify overrides any 'done')_\n"):
            written.append("verify.log")

        # notes.md: create or merge the fable-research sections without clobbering
        notes_path = os.path.join(ledger, "notes.md")
        sections = ["## fable-research (boosted digest — full pack in fable-research.json)", digest]
        if corpus:
            sections += ["", "## local-corpus (fable)", corpus]
        new_block = "\n".join(sections) + "\n"
        if os.path.exists(notes_path):
            with open(notes_path) as fh:
                existing = fh.read()
            if "## fable-research" not in existing:
                with open(notes_path, "a") as fh:
                    fh.write("\n" + new_block)
                written.append("notes.md (merged fable-research)")
        else:
            with open(notes_path, "w") as fh:
                fh.write("# notes\n\n" + new_block)
            written.append("notes.md")

        # Full pack: keep the previous one if a research file already exists.
        pack_path = os.path.join(ledger, "fable-research.json")
        if os.path.exists(pack_path):
            shutil.copy2(pack_path, os.path.join(ledger, "fable-research.previous.json"))
        with open(pack_path, "w") as fh:
            json.dump(pack, fh, indent=1)
        written.append("fable-research.json")

        print(json.dumps({
            "slug": slug,
            "ledger_dir": ledger,
            "files_written": written,
            "candidates_seeded": len([c for c in (pack.get("final_candidates") or [])
                                      if isinstance(c, dict)]),
            "next_step": ("Ledger ready. Invoke the `smart` skill (announce 'Entering smart mode "
                          "(ledger orchestration)'), read task.md + plan.md, then run PLAN → IDEATE "
                          "→ TEST-SPEC → WORK → VERIFY. If the smart skill is not available in this "
                          "session, follow vendor/smart-protocol/SKILL.md inline."),
        }, indent=2))
    except SystemExit:
        raise
    except Exception as e:  # noqa: BLE001 — documented failure JSON, controlled exit
        print(json.dumps({"error": f"{type(e).__name__}: {e}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
