#!/usr/bin/env python3
"""fable harness — install: activate a capability ONLY after the audit gate.

Flow: fetch (local dir or github.com clone) → audit (P0-P3) →
      blocked: refuse. needs-review: refuse unless --i-have-reviewed.
      ok/acknowledged: copy into ~/.fable/capabilities/<name>/ and pin the
      sha256 digest in ~/.fable/approved.json. Later loads verify the pin.

Usage:
  python3 install.py --from <dir> [--name <kebab>] [--i-have-reviewed] [--json]
  python3 install.py --list
  python3 install.py --remove <name>
  python3 install.py --verify            # re-hash installed capabilities vs pins
"""

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from audit import audit, sha256_tree  # noqa: E402

CAPS = os.path.expanduser("~/.fable/capabilities")
APPROVED = os.path.expanduser("~/.fable/approved.json")


def load_pins():
    try:
        with open(APPROVED) as fh:
            return json.load(fh)
    except Exception:
        return {}


def save_pins(pins):
    os.makedirs(os.path.dirname(APPROVED), exist_ok=True)
    with open(APPROVED, "w") as fh:
        json.dump(pins, fh, indent=2)


def fetch(src):
    """Local dir passthrough, or clone from an allowlisted github.com URL."""
    if os.path.isdir(src):
        return src, "local"
    if re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", src):
        url = f"https://github.com/{src}.git"   # host pinned by policy
    elif src.startswith("https://github.com/"):
        url = src
    else:
        raise ValueError("source must be a local dir, owner/repo, or https://github.com/… URL")
    dst = os.path.join(os.path.expanduser("~/.fable/quarantine"),
                       "fetch-" + hashlib.sha1(src.encode()).hexdigest()[:10])
    if not os.path.isdir(dst):
        r = subprocess.run(["git", "clone", "--depth", "1", url, dst],
                           capture_output=True, text=True, timeout=300)
        if r.returncode != 0:
            raise RuntimeError(f"clone failed: {(r.stderr or '').strip()[-200:]}")
    return dst, url


def main():
    args = sys.argv[1:]
    if "--list" in args:
        pins = load_pins()
        if not os.path.isdir(CAPS):
            print("no capabilities installed")
            return
        for name in sorted(os.listdir(CAPS)):
            p = os.path.join(CAPS, name)
            if os.path.isdir(p):
                pin = pins.get(name, {})
                if not pin.get("digest"):
                    state = "unpinned (not installed via the audit gate)"
                elif pin.get("digest") == sha256_tree(p):
                    state = "pinned"
                else:
                    state = "MODIFIED"
                print(f"- {name} → {p} [{state}, {pin.get('digest', '?')[:12]}]")
        return
    if "--remove" in args:
        name = args[args.index("--remove") + 1]
        p = os.path.join(CAPS, name)
        if os.path.isdir(p):
            shutil.rmtree(p)
            pins = load_pins()
            pins.pop(name, None)
            save_pins(pins)
            print(f"removed {name}")
        else:
            print(f"not installed: {name}")
        return
    if "--verify" in args:
        pins = load_pins()
        bad = []
        for name, meta in pins.items():
            p = os.path.join(CAPS, name)
            if not os.path.isdir(p) or sha256_tree(p) != meta.get("digest"):
                bad.append(name)
        print(json.dumps({"verified": len(pins) - len(bad), "modified_or_missing": bad}))
        sys.exit(1 if bad else 0)

    if "--from" not in args:
        print(json.dumps({"error": 'usage: install.py --from <dir|owner/repo> [--name kebab] '
                                   '[--i-have-reviewed] [--json] | --list | --remove <n> | --verify'}))
        sys.exit(3)
    src = args[args.index("--from") + 1]
    reviewed = "--i-have-reviewed" in args
    want_json = "--json" in args

    try:
        fetched, origin = fetch(src)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(3)

    name = (args[args.index("--name") + 1] if "--name" in args
            else re.sub(r"[^a-z0-9-]+", "-", os.path.basename(fetched.rstrip("/")).lower()).strip("-"))
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,40}", name):
        print(json.dumps({"error": f"cannot derive a kebab-case name from {name!r}; pass --name"}))
        sys.exit(3)

    result = audit(fetched)
    dest = os.path.join(CAPS, name)
    if result["verdict"] == "blocked":
        out = {"installed": False, "verdict": "blocked", "name": name,
               "findings": [f for f in result["findings"] if f["severity"] in ("critical", "high")],
               "quarantine": result["quarantine"],
               "note": "audit blocked this capability; inspect manually if you disagree"}
        print(json.dumps(out, indent=2) if want_json else json.dumps(out, indent=2))
        sys.exit(1)
    if result["verdict"] == "needs-review" and not reviewed:
        out = {"installed": False, "verdict": "needs-review", "name": name,
               "findings": [f for f in result["findings"] if f["severity"] != "info"],
               "note": ("review the findings; re-run with --i-have-reviewed to accept "
                        "responsibility for this capability")}
        print(json.dumps(out, indent=2))
        sys.exit(2)

    try:
        src_real, dest_real = os.path.realpath(fetched), os.path.realpath(dest)
        if src_real == dest_real or os.path.commonpath([src_real, dest_real]) == src_real:
            print(json.dumps({"error": "destination would overwrite the source; pass a different --name "
                                       "or install from a copy"}))
            sys.exit(3)
    except ValueError:
        pass  # commonpath can fail across roots (e.g. Windows drives); path check above already ran
    if os.path.islink(dest) or os.path.isfile(dest):
        os.remove(dest)
    elif os.path.exists(dest):
        shutil.rmtree(dest)
    shutil.copytree(fetched, dest, ignore=shutil.ignore_patterns(".git", "node_modules", "__pycache__"))
    digest = sha256_tree(dest)
    pins = load_pins()
    pins[name] = {"digest": digest, "origin": origin,
                  "verdict": result["verdict"], "reviewed": reviewed}
    save_pins(pins)
    print(json.dumps({"installed": True, "name": name, "path": dest,
                      "digest": digest, "verdict": result["verdict"],
                      "reviewed_by_human": reviewed}, indent=2))


if __name__ == "__main__":
    main()
