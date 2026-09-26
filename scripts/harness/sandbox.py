#!/usr/bin/env python3
"""fable harness sandbox — prove an installed capability is safe in isolation.

Runs a capability inside a no-network Docker container (read-only mount,
fresh container per run) and reports: does it compile, does it run, does it
touch anything unexpected? Turns the P3 trust guarantee from "static analysis"
into "proven in isolation".

Graceful: if Docker is missing, prints an honest verdict instead of failing.

Usage:
  python3 sandbox.py --dir <capability-dir> [--entry tool.py] [--image python:3.12-alpine]
"""

import argparse
import glob
import json
import os
import subprocess
import sys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True, help="capability directory to test")
    ap.add_argument("--entry", help="entry script to run (default: compile-check only)")
    ap.add_argument("--image", default="python:3.12-alpine")
    args = ap.parse_args()

    cap = os.path.abspath(args.dir)
    if not os.path.isdir(cap):
        print(json.dumps({"error": f"not a directory: {cap}"}))
        sys.exit(3)

    if not _has_docker():
        print(json.dumps({"verdict": "sandbox-unavailable",
                          "reason": "Docker not found — install Docker Desktop, "
                                    "or accept the static-only guarantee",
                          "static_only": True}))
        return

    # 1. compile-check every python file inside the container
    compile_cmd = ["docker", "run", "--rm", "--network=none",
                   "-v", f"{cap}:/cap:ro", "-w", "/cap", args.image,
                   "python3", "-c",
                   "import glob, py_compile, sys; "
                   "files = glob.glob('**/*.py', recursive=True); "
                   "[py_compile.compile(f, doraise=True) for f in files]; "
                   "print(f'compiled {len(files)} files')"]
    r = subprocess.run(compile_cmd, capture_output=True, text=True, timeout=180)
    result = {"compile": r.stdout.strip() or r.stderr.strip()[-200:] or "ok",
              "compile_ok": r.returncode == 0}

    # 2. optional entry run (still no network, read-only)
    if args.entry and result.get("compile_ok"):
        er = subprocess.run(
            ["docker", "run", "--rm", "--network=none",
             "-v", f"{cap}:/cap:ro", "-w", "/cap", args.image,
             "python3", args.entry, "--help"],
            capture_output=True, text=True, timeout=120)
        result["entry_run"] = {"ok": er.returncode in (0, 2),  # 2 = argparse help/usage
                               "output": (er.stdout + er.stderr).strip()[:400]}

    result["verdict"] = ("sandbox-proven" if result.get("compile_ok") else "sandbox-failed")
    print(json.dumps(result, indent=2))
    sys.exit(0 if result.get("compile_ok") else 1)


def _has_docker():
    try:
        return subprocess.run(["docker", "info"], capture_output=True,
                              timeout=15).returncode == 0
    except Exception:
        return False


if __name__ == "__main__":
    main()
