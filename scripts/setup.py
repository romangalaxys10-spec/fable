#!/usr/bin/env python3
"""fable setup — ONE COMMAND that installs everything the skill can use.

    python3 scripts/setup.py                 # core: Laya (Mac) + Headroom + tooling check
    python3 scripts/setup.py --all           # + self-learning deps + remotion npm install
    python3 scripts/setup.py --with-laya-model   # also pre-pull the Laya HF checkpoint
    python3 scripts/setup.py --with-models   # also AI4Animation weights (authoring demo)

Platform-aware: Laya is macOS/Apple-Silicon only (MLX); on Linux/Windows that
stage is skipped and the boost pipeline runs Headroom-only. Every stage is
idempotent (checks first, installs only what is missing) and degrades to a
clear report instead of crashing.

Network: package installs go to PyPI over HTTPS (pip/uv), laya-mlx from
github.com (pinned commit), the Laya checkpoint from huggingface.co. No
credentials are required or stored.
"""

import argparse
import json
import os
import platform
import shutil
import subprocess
import sys

PLUGIN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LAYA_VENDOR = os.path.join(PLUGIN_ROOT, "vendor", "laya")
HEADROOM_INTEGRATE = os.path.join(PLUGIN_ROOT, "vendor", "headroom", "integrate.py")
REMOTION_STARTER = os.path.join(PLUGIN_ROOT, "vendor", "remotion-starter")
LAYA_VENV = os.path.expanduser("~/.fable/venvs/laya-mlx")
LAYA_MODEL = "aac6fef/laya-mlx"
LAYA_MLX_PIN = ("git+https://github.com/mizorewww/laya-mlx.git"
                "@0a859518634112655cb97c745dbf04f5191aaf13#egg=laya_mlx")

report = {}


def run(cmd, timeout=1800):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def which(tool):
    return shutil.which(tool)


def stage(name):
    def deco(fn):
        def wrapper(*a, **k):
            try:
                report[name] = fn(*a, **k) or "ok"
            except Exception as e:  # noqa: BLE001 — report, never crash bootstrap
                report[name] = f"failed: {str(e)[:200]}"
            return report[name]
        return wrapper
    return deco


@stage("tooling")
def check_tooling():
    found = {t: bool(which(t)) for t in ("node", "python3", "git", "npm", "uv")}
    missing = [t for t in ("node", "python3", "git") if not found[t]]
    if missing:
        return f"missing required tools: {', '.join(missing)} (install them and re-run)"
    return {"node": which("node"), "python3": which("python3"),
            "npm": which("npm"), "uv": which("uv") or "(absent — pip fallbacks used)"}


def is_mac():
    return platform.system() == "Darwin" and platform.machine() == "arm64"


def _make_laya_venv():
    """Create ~/.fable/venvs/laya-mlx with Python >= 3.10 (mcp needs it).
    Prefers `uv venv` (can fetch a managed CPython); falls back to the best
    python3.x on PATH, upgrading pip inside the venv."""
    if which("uv"):
        r = run(["uv", "venv", "--python", "3.11", LAYA_VENV])
        if r.returncode == 0 and os.path.exists(os.path.join(LAYA_VENV, "bin", "python")):
            return os.path.join(LAYA_VENV, "bin", "python")
    best = None
    for cand in ("python3.13", "python3.12", "python3.11", "python3.10", "python3"):
        p = which(cand)
        if p:
            v = run([p, "-c", "import sys; print('%d %d' % sys.version_info[:2])"])
            try:
                major_s, minor_s = v.stdout.strip().split()
                if (int(major_s), int(minor_s)) >= (3, 10):
                    best = p
                    break
            except (ValueError, IndexError):
                continue
    if best is None:
        raise RuntimeError("no Python >= 3.10 found for the Laya venv")
    r = run([best, "-m", "venv", LAYA_VENV])
    if r.returncode != 0:
        raise RuntimeError(f"venv creation failed: {(r.stderr or '').strip()[-200:]}")
    py = os.path.join(LAYA_VENV, "bin", "python")
    run([py, "-m", "pip", "install", "-q", "--upgrade", "pip"])  # old pips miss new wheels
    return py


@stage("laya")
def setup_laya(with_model=False):
    if not is_mac():
        return "skipped (Laya is macOS/Apple-Silicon only; boost will run Headroom-only)"
    py = os.path.join(LAYA_VENV, "bin", "python")
    if not os.path.exists(py):
        py = _make_laya_venv()
    r = run([py, "-c", "import laya_mlx, mcp, pydantic"])
    if r.returncode != 0:
        print("[setup] installing Laya deps (PyPI + pinned laya-mlx from GitHub)…", file=sys.stderr)
        if which("uv"):
            cmds = [["uv", "pip", "install", "--python", py, "-r",
                     os.path.join(LAYA_VENDOR, "requirements.txt")],
                    ["uv", "pip", "install", "--python", py, LAYA_MLX_PIN]]
        else:
            req = os.path.join(LAYA_VENDOR, "requirements.txt")
            cmds = [[py, "-m", "pip", "install", "-q", "-r", req],
                    [py, "-m", "pip", "install", "-q", LAYA_MLX_PIN]]
        for cmd in cmds:
            rr = run(cmd)
            if rr.returncode != 0:
                return f"failed: {(rr.stderr or rr.stdout).strip()[-300:]}"
    if with_model:
        print(f"[setup] pre-pulling checkpoint {LAYA_MODEL} from Hugging Face…", file=sys.stderr)
        r = run([py, "-c",
                 f"from huggingface_hub import snapshot_download; "
                 f"p = snapshot_download('{LAYA_MODEL}'); print(p)"])
        if r.returncode != 0:
            return f"venv ok; model pre-pull failed: {(r.stderr or r.stdout).strip()[-200:]} (downloads on first use instead)"
        return {"venv": LAYA_VENV, "model_cached_at": r.stdout.strip()}
    return {"venv": LAYA_VENV, "model": "downloads on first use (or re-run with --with-laya-model)"}


@stage("headroom")
def setup_headroom():
    if not os.path.exists(HEADROOM_INTEGRATE):
        return "failed: vendor/headroom/integrate.py missing"
    r = run([sys.executable, HEADROOM_INTEGRATE], timeout=1200)
    try:
        detail = json.loads(r.stdout)
        return {"status": detail.get("status"), "python": (detail.get("verified") or {}).get("python"),
                "version": (detail.get("verified") or {}).get("version")}
    except Exception:
        return f"integrate.py exit {r.returncode}: {(r.stderr or r.stdout).strip()[-200:]}"


@stage("self_learning")
def setup_self_learning(enabled):
    if not enabled:
        return "skipped (use --all or --with-self-learning)"
    print("[setup] installing numpy + sentence-transformers (self-learning loop)…", file=sys.stderr)
    r = run([sys.executable, "-m", "pip", "install", "-q", "numpy", "sentence-transformers"])
    if r.returncode != 0:
        return f"failed: {(r.stderr or r.stdout).strip()[-300:]}"
    return "numpy + sentence-transformers installed"


@stage("remotion")
def setup_remotion(enabled):
    if not enabled:
        return "skipped (use --all or --with-remotion)"
    if not which("npm"):
        return "failed: npm not found"
    print("[setup] npm install in vendor/remotion-starter (one-time, ~1 min)…", file=sys.stderr)
    os.chdir(REMOTION_STARTER)  # npm needs the starter's package.json
    r = run(["npm", "install", "--no-audit", "--no-fund"], timeout=1800)
    os.chdir(PLUGIN_ROOT)
    return f"npm install exit {r.returncode}" if r.returncode != 0 else "remotion starter ready (npx remotion studio)"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="core + self-learning + remotion")
    ap.add_argument("--with-self-learning", action="store_true")
    ap.add_argument("--with-remotion", action="store_true")
    ap.add_argument("--with-laya-model", action="store_true", help="pre-pull Laya HF checkpoint (Mac only)")
    ap.add_argument("--with-models", action="store_true", help="fetch AI4Animation authoring weights (~60 MB)")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    check_tooling()
    setup_laya(with_model=args.with_laya_model)
    setup_headroom()
    setup_self_learning(args.all or args.with_self_learning)
    setup_remotion(args.all or args.with_remotion)

    if args.with_models:
        fm = os.path.join(PLUGIN_ROOT, "scripts", "fetch_models.py")
        r = run([sys.executable, fm, "--demo", "authoring"], timeout=1800)
        report["ai4animation_weights"] = (r.stdout.strip().splitlines()[-1]
                                          if r.stdout.strip() else f"exit {r.returncode}")

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print("\n=== fable setup report ===")
        for k, v in report.items():
            print(f"- {k}: {v if isinstance(v, str) else json.dumps(v)}")
        print("\nDone. Run a boost to verify:  python3 scripts/boost/boost.py --task 'hello world test'")


if __name__ == "__main__":
    main()
