#!/usr/bin/env python3
"""fable semantic search — embedding-based corpus + fable-row search.

Upgrade over keyword `search.js`: embeds corpus cards (and optionally the
secmon finding index) with a local sentence-transformers model (MiniLM) and
ranks by cosine similarity, so "payment crash" finds the card about "billing
failure".

Modes:
  build    (re)build the vector index from ~/.fable/corpus.jsonl
  query    semantic top-k search:  query "<text>" [--k 5]
  auto     query; if the index or model is missing, fall back to search.js

Model: all-MiniLM-L6-v2 (local, ~80 MB, downloads once from Hugging Face).
Deps: sentence-transformers + numpy (installed by `setup.py --all`); on
ImportError this script exits 3 with a clear message — callers fall back to
keyword search.
"""

import argparse
import json
import os
import sys

CORPUS = os.environ.get("FABLE_CORPUS") or os.path.expanduser("~/.fable/corpus.jsonl")
INDEX = os.path.expanduser("~/.fable/corpus_vectors.json")
MODEL = os.environ.get("FABLE_EMBED_MODEL", "all-MiniLM-L6-v2")


def load_model():
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        # raise, don't exit — callers decide whether to fall back or report
        raise ImportError("sentence-transformers not installed "
                          "(fix: python3 scripts/setup.py --all)")
    return SentenceTransformer(MODEL)


def card_text(c):
    return " | ".join(str(x) for x in [c.get("task"), c.get("context"),
                                       c.get("outcome"), *c.get("learnings", []),
                                       *c.get("gotchas", [])] if x)


def read_corpus():
    cards = []
    if os.path.exists(CORPUS):
        with open(CORPUS, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    try:
                        cards.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
    return cards


def cmd_build():
    cards = read_corpus()
    if not cards:
        print(json.dumps({"indexed": 0, "note": "corpus empty"}))
        return
    model = load_model()
    vecs = model.encode([card_text(c) for c in cards], show_progress_bar=False)
    index = {"model": MODEL, "dim": len(vecs[0]),
             "cards": [{"i": i, "ts": c.get("ts"), "task": c.get("task"),
                        "vector": [round(float(x), 5) for x in vecs[i]]}
                       for i, c in enumerate(cards)]}
    json.dump(index, open(INDEX, "w"))
    print(json.dumps({"indexed": len(cards), "index": INDEX, "model": MODEL}))


def cmd_query(query, k):
    cards = read_corpus()
    index = {}
    if os.path.exists(INDEX):
        try:
            index = json.load(open(INDEX))
        except Exception:
            index = {}
    if not isinstance(index, dict):
        index = {}
    model = load_model()
    # rebuild when corpus size changed OR the embedding model changed —
    # vectors from different models are numerically valid, semantically garbage
    stale = (len(index.get("cards", [])) != len(cards)
             or index.get("model") != MODEL)
    if stale or not index.get("cards"):
        if not cards:
            print(json.dumps({"query": query, "results": [], "note": "corpus empty"}))
            return
        vecs = model.encode([card_text(c) for c in cards], show_progress_bar=False)
        index = {"model": MODEL,
                 "cards": [{"i": i, "task": c.get("task"),
                            "vector": [float(x) for x in vecs[i]]}
                           for i, c in enumerate(cards)]}
    qv = model.encode([query])[0]

    def cos(a, b):
        num = sum(x * y for x, y in zip(a, b))
        da = sum(x * x for x in a) ** 0.5 or 1
        db = sum(x * x for x in b) ** 0.5 or 1
        return num / (da * db)

    scored = sorted(({"task": c["task"], "score": round(cos(qv, c["vector"]), 4),
                      "card": cards[c["i"]]} for c in index["cards"]),
                    key=lambda x: -x["score"])[:k]
    print(json.dumps({"query": query, "results": scored}, indent=2))


def cmd_auto(query, k):
    """Semantic query with graceful keyword fallback (used by the skill).

    Falls back on ANY failure — model load errors, empty/corrupt index,
    fresh machines — the fallback path must never silently die.
    """
    try:
        cmd_query(query, k)
    except SystemExit as e:
        if e.code in (0, None):
            return  # empty-corpus result already printed
        r = subprocess_search(query)
        print(r)
    except Exception:
        r = subprocess_search(query)
        print(r)


def subprocess_search(query):
    r = subprocess.run(["node", os.path.join(PLUGIN_ROOT, "scripts", "search.js"), query],
                       capture_output=True, text=True, timeout=60)
    return r.stdout or "(no results)"


import subprocess  # noqa: E402
PLUGIN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["build", "query", "auto"])
    ap.add_argument("text", nargs="?", help="query text (query/auto modes)")
    ap.add_argument("--k", type=int, default=5)
    a = ap.parse_args()
    if a.mode == "build":
        cmd_build()
    elif a.mode == "query":
        if not a.text:
            print(json.dumps({"error": "query text required"})); sys.exit(3)
        cmd_query(a.text, a.k)
    else:
        if not a.text:
            print(json.dumps({"error": "query text required"})); sys.exit(3)
        cmd_auto(a.text, a.k)


if __name__ == "__main__":
    main()
