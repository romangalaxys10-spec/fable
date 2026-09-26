#!/usr/bin/env python3
"""fable publish_local — make the LATEST local build the one every session uses.

One command after any source edit:

    python3 scripts/publish_local.py [--push]

Steps:
  1. Read the version from the source manifest (.zcode-plugin/plugin.json).
  2. Export a clean copy of the source to the app cache:
     ~/.zcode/cli/plugins/cache/dev-market-researches-e1947603/fable/<version>/
     (older version dirs are pruned so "latest" is unambiguous).
  3. Update ~/.zcode/cli/plugins/installed_plugins.json (version,
     installPath, updatedAt) with a backup each run.
  4. Sync the marketplace catalog version (source catalog + the app's
     marketplaces/ copy).
  5. --push: additionally export to /tmp/fable-publish and git-push to
     github.com/romangalaxys10-spec/fable (token via GH_TOKEN env only).

Idempotent: re-running with no source change just re-syncs. Running
sessions snapshot their skill catalog at start — the user-level launcher
(~/.zcode/skills/fable) resolves the highest cache version at INVOCATION
time, so even current sessions pick this up on the next /fable.
"""

import argparse
import datetime
import json
import os
import shutil
import subprocess
import sys

PLUGIN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MARKET_ID = "dev-market-researches-e1947603"
PLUGINS_DIR = os.path.expanduser("~/.zcode/cli/plugins")
CACHE_BASE = os.path.join(PLUGINS_DIR, "cache", MARKET_ID, "fable")
APPS_MARKET_DIR = os.path.join(PLUGINS_DIR, "marketplaces", MARKET_ID)
SOURCE_CATALOG = os.path.join(os.path.dirname(PLUGIN_ROOT), "marketplace.json")
REPO = "romangalaxys10-spec/fable"
PUBLISH_TMP = "/tmp/fable-publish"

EXCLUDES = ("--exclude", ".mimosa", "--exclude", ".smart", "--exclude", "__pycache__",
            "--exclude", ".DS_Store", "--exclude", "*.pyc")


def now():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def sh(cmd, timeout=600, cwd=None):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=cwd)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--push", action="store_true", help="also git-publish to GitHub (GH_TOKEN env)")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--skip-security-gate", action="store_true",
                    help="EMERGENCY ONLY: skip the mandatory security audit "
                         "(its use is logged loudly in the output)")
    args = ap.parse_args()
    steps = {}

    # 0. MANDATORY security gate — every delivery is audited automatically,
    #    no user prompt needed. New critical/high findings BLOCK the publish.
    if args.skip_security_gate:
        steps["security_gate"] = "⚠️ SKIPPED (--skip-security-gate) — delivery unaudited!"
    else:
        gate = os.path.join(PLUGIN_ROOT, "scripts", "security_gate.py")
        gr = sh([sys.executable, gate, "--target", PLUGIN_ROOT, "--json"], timeout=600)
        try:
            gate_out = json.loads(gr.stdout)
        except Exception:
            gate_out = {"verdict": f"gate crashed (exit {gr.returncode})",
                        "note": (gr.stderr or "")[-200:]}
        steps["security_gate"] = {"verdict": gate_out.get("verdict"),
                                  "known_accepted": gate_out.get("known_accepted"),
                                  "new_findings": gate_out.get("new_findings", [])}
        if gate_out.get("verdict") == "blocked":
            steps["security_gate"]["action"] = ("publish ABORTED — fix the new findings, "
                                                "or a human must accept them via "
                                                "security_gate.py --accept-baseline --i-have-reviewed")
            print(json.dumps(steps, indent=2) if args.json else steps)
            sys.exit(1)

    manifest = json.load(open(os.path.join(PLUGIN_ROOT, ".zcode-plugin", "plugin.json")))
    version = manifest["version"]
    steps["version"] = version

    # keep the shipped launcher in sync with the user-level one
    launcher_src = os.path.expanduser("~/.zcode/skills/fable/SKILL.md")
    launcher_dst = os.path.join(PLUGIN_ROOT, "extras", "launcher", "SKILL.md")
    if os.path.exists(launcher_src):
        os.makedirs(os.path.dirname(launcher_dst), exist_ok=True)
        shutil.copy2(launcher_src, launcher_dst)
        steps["launcher_extras"] = "synced from ~/.zcode/skills/fable"

    # 2. clean export into the app cache
    dest = os.path.join(CACHE_BASE, version)
    os.makedirs(dest, exist_ok=True)
    r = sh(["rsync", "-a", *EXCLUDES, PLUGIN_ROOT + "/", dest + "/"])
    steps["cache_export"] = "ok" if r.returncode == 0 else f"failed: {r.stderr.strip()[-200:]}"
    if r.returncode != 0:
        print(json.dumps(steps, indent=2) if args.json else steps)
        sys.exit(1)
    # prune other version dirs so latest is unambiguous
    for v in os.listdir(CACHE_BASE):
        if v != version:
            shutil.rmtree(os.path.join(CACHE_BASE, v), ignore_errors=True)
            steps.setdefault("pruned", []).append(v)

    # 3. inventory update (with backup)
    ip_path = os.path.join(PLUGINS_DIR, "installed_plugins.json")
    shutil.copy2(ip_path, ip_path + ".bak-fable-publish")
    ip = json.load(open(ip_path))
    pid = f"fable@{MARKET_ID}"
    ip["plugins"] = [p for p in ip["plugins"] if p.get("id") != pid]
    ip["plugins"].append({
        "id": pid, "name": "fable", "marketplace": MARKET_ID, "version": version,
        "installPath": dest, "installedAt": now(), "updatedAt": now(),
        "scope": "user",
        "source": {"source": "directory", "path": PLUGIN_ROOT},
    })
    json.dump(ip, open(ip_path, "w"), indent=2)
    steps["inventory"] = f"{pid} → v{version}"

    # 4. catalog version sync (source + app copy)
    cat = json.load(open(SOURCE_CATALOG))
    for p in cat.get("plugins", []):
        if p.get("name") == "fable":
            p["version"] = version
    json.dump(cat, open(SOURCE_CATALOG, "w"), indent=2)
    os.makedirs(APPS_MARKET_DIR, exist_ok=True)
    shutil.copy2(SOURCE_CATALOG, os.path.join(APPS_MARKET_DIR, "marketplace.json"))
    steps["catalog"] = f"synced to v{version} (source + app copy)"

    # 5. optional git publish
    if args.push:
        token = os.environ.get("GH_TOKEN")
        if not token:
            steps["git_publish"] = "skipped: GH_TOKEN not set"
        else:
            shutil.rmtree(PUBLISH_TMP, ignore_errors=True)
            os.makedirs(PUBLISH_TMP)
            sh(["rsync", "-a", *EXCLUDES, PLUGIN_ROOT + "/", PUBLISH_TMP + "/"])
            sh(["git", "init", "-b", "main"], cwd=PUBLISH_TMP)
            sh(["git", "config", "user.name", "romangalaxys10-spec"], cwd=PUBLISH_TMP)
            sh(["git", "config", "user.email", "romangalaxys10-spec@users.noreply.github.com"], cwd=PUBLISH_TMP)
            sh(["git", "add", "-A"], cwd=PUBLISH_TMP)
            rc = sh(["git", "commit", "-q", "-m", f"v{version}"], cwd=PUBLISH_TMP)
            sh(["git", "remote", "add", "origin", f"https://github.com/{REPO}.git"], cwd=PUBLISH_TMP)
            helper = '!f(){ echo "username=x-access-token"; echo "password=$GH_TOKEN"; }; f'
            pr = sh(["git", "-c", f"credential.helper={helper}", "push", "-f", "origin", "main"],
                    cwd=PUBLISH_TMP)
            os.environ.pop("GH_TOKEN", None)
            steps["git_publish"] = ("pushed" if pr.returncode == 0
                                    else f"failed: {(pr.stderr or '').strip()[-200:]}")

    if args.json:
        print(json.dumps(steps, indent=2))
    else:
        for k, v in steps.items():
            print(f"- {k}: {v if isinstance(v, str) else json.dumps(v)}")
        print("\nLatest build is now what every /fable resolves to "
              "(current sessions: next /fable invocation; new sessions: native).")


if __name__ == "__main__":
    main()
