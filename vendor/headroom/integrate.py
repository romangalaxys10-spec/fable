#!/usr/bin/env python3
"""headroom integrate — detect, install, and verify headroom for fable's boost stage.

Resolution order (mirrors scripts/boost/headroom_boost.py):
  1. uv tool venv   ~/.local/share/uv/tools/headroom-ai/bin/python
  2. any importable `headroom` on the current interpreter
  3. not installed  -> offer install (uv preferred, pip fallback)

Usage:
  python3 vendor/headroom/integrate.py [--force] [--skip-install]

Exit 0 when headroom is usable afterwards; exit 1 when it could not be
installed/verified (the boost stage still works via its fallbacks).
Package sources: PyPI over HTTPS only. No credentials required or stored.
"""

import glob
import json
import os
import subprocess
import sys

TOOL_VENV_GLOB = os.path.expanduser("~/.local/share/uv/tools/headroom-ai/bin/python")


def tool_python():
    hits = glob.glob(TOOL_VENV_GLOB)
    return hits[0] if hits else None


def importable_on_current():
    try:
        import headroom  # noqa: F401
        return sys.executable
    except Exception:
        return None


def verify(py: str) -> dict:
    r = subprocess.run(
        [py, "-c",
         "import headroom; from headroom import compress; "
         "print(headroom.__version__)"],
        capture_output=True, text=True, timeout=120)
    return {"python": py, "ok": r.returncode == 0,
            "version": r.stdout.strip() if r.returncode == 0 else None,
            "error": (r.stderr or "").strip().splitlines()[-1] if r.returncode != 0 else None}


def install() -> str:
    if subprocess.run(["which", "uv"], capture_output=True).returncode == 0:
        cmd = ["uv", "tool", "install", "--python", "3.13", "headroom-ai[ml]"]
        label = "uv tool install"
    else:
        cmd = [sys.executable, "-m", "pip", "install", "headroom-ai[ml]"]
        label = "pip install"
    print(f"[headroom-integrate] installing via {label}: {' '.join(cmd)}", file=sys.stderr)
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    if r.returncode != 0:
        raise RuntimeError(f"{label} failed: {(r.stderr or r.stdout).strip()[-400:]}")
    return label


def main() -> None:
    args = sys.argv[1:]
    force = "--force" in args
    skip_install = "--skip-install" in args

    report = {"resolved": None, "verified": None, "installed_via": None}

    candidates = [p for p in [tool_python(), importable_on_current()] if p]
    for py in candidates:
        v = verify(py)
        if v["ok"]:
            report["resolved"], report["verified"] = py, v
            break

    if report["verified"] is None and not skip_install:
        try:
            report["installed_via"] = install()
            py = tool_python() or importable_on_current()
            if py:
                v = verify(py)
                if v["ok"]:
                    report["resolved"], report["verified"] = py, v
        except Exception as e:  # noqa: BLE001 — report, don't crash the caller's pipeline
            report["install_error"] = str(e)

    report["status"] = "ok" if report["verified"] else "unavailable"
    print(json.dumps(report, indent=2))
    sys.exit(0 if report["verified"] else 1)


if __name__ == "__main__":
    main()
