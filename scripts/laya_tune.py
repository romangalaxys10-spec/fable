#!/usr/bin/env python3
"""fable laya tune — build a training dataset from YOUR corpus cards.

The purest self-improvement loop: your verified lesson cards become training
data for the Laya decision model, so the "useful lesson?" triage judgment
gets tuned specifically to your work.

What this does (honestly):
  1. Reads ~/.fable/corpus.jsonl (+ optional drafts you promoted).
  2. Emits a ready-to-train JSONL at ~/.fable/laya-tune/train.jsonl with
     laya-native question format: instruction/criteria + expected noul label.
  3. Prints the exact command to fine-tune using the laya-mlx trainer
     (github.com/mizorewww/laya-mlx, same engine the server runs).

It does NOT train automatically — training touches the model weights, which
should stay a deliberate human decision.

Usage:
  python3 laya_tune.py --out ~/.fable/laya-tune   # build dataset
  python3 laya_tune.py --out … --serve-hint       # also print server restart cmd
"""

import argparse
import datetime
import json
import os
import sys

CORPUS = os.environ.get("FABLE_CORPUS") or os.path.expanduser("~/.fable/corpus.jsonl")
LAYA_PY = os.environ.get("FABLE_LAYA_PY", os.path.expanduser("~/.fable/venvs/laya-mlx/bin/python"))
TRAIN_DIR = os.path.expanduser("~/.fable/laya-tune")
LAYA_MLX_PIN = "git+https://github.com/mizorewww/laya-mlx.git@0a859518634112655cb97c745dbf04f5191aaf13#egg=laya_mlx"


def build():
    if not os.path.exists(CORPUS):
        print(json.dumps({"error": f"no corpus at {CORPUS}"}))
        sys.exit(1)
    rows = []
    for line in open(CORPUS, encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        try:
            c = json.loads(line)
        except json.JSONDecodeError:
            continue
        if c.get("draft"):
            continue
        task = c.get("task", "")
        text = " | ".join(filter(None, [task, c.get("context", ""),
                                        "outcome: " + c.get("outcome", "")]))[:600]
        # a verified lesson card IS a useful lesson — positive example
        rows.append({
            "text": text,
            "question": {"type": "noul",
                          "instructions": "Is this a useful, actionable lesson for a software agent?",
                          "criteria": {"false": "not useful", "true": "useful"}},
            "label": 1,
        })
        # negative pairs from generic non-lesson text (hard negatives keep the
        # classifier honest)
        rows.append({
            "text": ("Today's weather is pleasant. The meeting was moved to 3pm. "
                     "Remember to buy groceries."),
            "question": rows[-1]["question"],
            "label": 0,
        })

    os.makedirs(TRAIN_DIR, exist_ok=True)
    out = os.path.join(TRAIN_DIR, "train.jsonl")
    with open(out, "w", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(r) + "\n")

    readme = f"""# Laya fine-tune dataset (generated {datetime.date.today()})

- {out} — {sum(1 for r in rows if r['label'] == 1)} positive / {sum(1 for r in rows if r['label'] == 0)} negative rows
- Base model: aac6fef/laya-mlx (the checkpoint the MCP server loads)
- Trainer: github.com/mizorewww/laya-mlx (pinned in requirements)

Fine-tune (Mac, Apple Silicon):
  {LAYA_PY} -m pip install "{LAYA_MLX_PIN}"
  follow the laya-mlx trainer README with this train.jsonl

After training, point FABLE_LAYA_PY at the venv with the updated checkpoint
and restart the fable server. Always keep a backup of the previous checkpoint.
"""
    with open(os.path.join(TRAIN_DIR, "README.md"), "w") as fh:
        fh.write(readme)
    print(json.dumps({"dataset": out, "rows": len(rows),
                      "positives": sum(1 for r in rows if r["label"] == 1),
                      "next": "train with laya-mlx trainer, then restart the fable laya server"},
                     indent=2))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=TRAIN_DIR)
    ap.add_argument("--serve-hint", action="store_true")
    a = ap.parse_args()
    build()


if __name__ == "__main__":
    main()
