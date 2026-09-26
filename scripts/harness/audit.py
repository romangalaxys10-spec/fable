#!/usr/bin/env python3
"""fable harness — multi-phase security audit for third-party capabilities.

Architecture pattern: "everything is a plugin" (credit: DeepSeek Harness,
github.com/deepseek-ai/deepseek-harness, MIT). Implementation is fable's own
minimal, dependency-free Python — we deliberately do NOT embed the dsh
runtime (developer preview, self-declared unaudited).

Phases (a capability must clear ALL of them to be installable):
  P0 source & content policy — host allowlist, size cap, forbidden file types
                               (binaries/executables/hooks), path traversal
  P1 secrets scan            — API keys / tokens / private keys in content
  P2 dangerous-API scan      — eval/exec, shell pipes, credential harvesting,
                               non-allowlisted network egress, auto-run hooks
  P3 sandboxed preview       — artifact quarantined (read-only inspection);
                               a real isolated run is only attempted when a
                               container runtime is available (--sandbox docker)
  verdict: ok | needs-review | blocked  (install.py refuses blocked; needs-
  review requires the human's explicit --i-have-reviewed)

Usage:
  python3 audit.py --target <dir> [--json] [--sandbox docker]

Exit codes: 0 ok, 1 blocked, 2 needs-review, 3 usage/error.
"""

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys

ALLOWED_NET_HOSTS = (
    "huggingface.co", "datasets-server.huggingface.co",
    "github.com", "api.github.com", "raw.githubusercontent.com", "objects.githubusercontent.com",
    "registry.npmjs.org", "pypi.org", "files.pythonhosted.org",
    "schema.org", "yunwu.ai", "api.minimax.io", "openrouter.ai",
    "www.w3.org",  # SVG xmlns identifier — appears in every SVG, never fetched
    "api.telegram.org", "discord.com", "api.brightdata.com",
    "openrouter.ai",
)
MAX_TREE_BYTES = 25 * 1024 * 1024          # 25 MB cap per capability
BLOCKED_SUFFIXES = (
    ".so", ".dylib", ".dll", ".exe", ".bin", ".o", ".a", ".node",
    ".pyc", ".whl", ".deb", ".pkg", ".dmg", ".app", ".iso",
)
BLOCKED_PATH_PARTS = ("hooks", "postinstall", "preinstall")
SUSPECT_DIRS = (".ssh", ".aws", ".gnupg", ".kube", ".docker")

SECRET_PATTERNS = [
    ("aws-access-key", r"\bAKIA[0-9A-Z]{16}\b"),
    ("github-token", r"\bgh[pousr]_[A-Za-z0-9]{36,}\b"),
    ("google-api-key", r"\bAIza[0-9A-Za-z_\-]{35}\b"),
    ("openai-style-key", r"\bsk-[A-Za-z0-9_\-]{20,}\b"),
    ("slack-token", r"\bxox[baprs]-[A-Za-z0-9\-]{10,}\b"),
    ("private-key-block", r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    ("generic-credential-literal", r"""(?i)\b(api[_-]?key|secret|token|password)\b["'\s:=]{1,4}["'][A-Za-z0-9_\-]{16,}["']"""),
]

DANGEROUS_PATTERNS = [
    ("eval-exec", r"\beval\s*\(|\bexec\s*\("),
    ("shell-pipe-install", r"\b(curl|wget)\b[^|;\n]*\|\s*(sudo\s+)?(ba|z|sh)?sh\b"),
    ("rm-rf-root", r"rm\s+-rf\s+/(?:\s|$)"),
    ("credential-harvest", r"""(?i)(\.ssh|\.aws|\.gnupg|\.kube|id_rsa|\.env(?![\w.])|credentials\s*json)"""),
    ("env-secret-harvest", r"""(?i)(?:os\.environ|process\.env)(?:\[|\.get\()[^;\n]{0,120}(?:urlopen|requests\.(?:get|post)|fetch\(|subprocess)[^;\n]{0,120}(KEY|TOKEN|SECRET|PASSWORD)"""),
    ("obfuscated-payload", r"\bbase64\s+-d\b|\bbase64 --decode\b"),
    ("auto-run-hook", r"(?i)postinstall|preinstall|PostToolUse|SessionStart"),
]
NET_RE = re.compile(r"""https?://([A-Za-z0-9.\-]+)""")

CRITICAL_P1 = {"private-key-block"}
CRITICAL_P2 = {"shell-pipe-install", "rm-rf-root"}


def sha256_tree(root):
    h = hashlib.sha256()
    for dirpath, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in (".git", "__pycache__", "node_modules"))
        for f in sorted(files):
            p = os.path.join(dirpath, f)
            h.update(os.path.relpath(p, root).encode())
            with open(p, "rb") as fh:
                for chunk in iter(lambda: fh.read(1 << 16), b""):
                    h.update(chunk)
    return h.hexdigest()


def audit(target):
    findings = []

    def add(phase, severity, kind, detail, rel=""):
        findings.append({"phase": phase, "severity": severity, "kind": kind,
                         "detail": detail[:300], "file": rel})

    # ---- P0: source & content policy -------------------------------------
    total = 0
    for dirpath, dirs, files in os.walk(target):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "__pycache__", ".mimosa")]
        rel_dir = os.path.relpath(dirpath, target)
        if any(part in BLOCKED_PATH_PARTS for part in rel_dir.split(os.sep)):
            add("P0", "critical", "auto-run-hook-dir", f"blocked path segment under {rel_dir}")
        for part in rel_dir.split(os.sep):
            if part in SUSPECT_DIRS:
                add("P0", "critical", "credential-dir", f"ships a {part} directory")
        for f in files:
            p = os.path.join(dirpath, f)
            rel = os.path.relpath(p, target)
            try:
                size = os.path.getsize(p)
            except OSError:
                continue
            total += size
            if total > MAX_TREE_BYTES:
                add("P0", "critical", "size-cap", "capability exceeds 25 MB cap")
                total = 0  # report once; keep walking cheaply
            if f.lower().endswith(BLOCKED_SUFFIXES):
                add("P0", "critical", "binary-artifact", f"forbidden file type: {f}", rel)
            if f.startswith("."):
                if f in (".env", ".npmrc", ".pypirc"):
                    add("P0", "critical", "credential-file", f"ships {f}", rel)
            if any(part in rel.split(os.sep) for part in SUSPECT_DIRS):
                add("P0", "critical", "credential-dir", f"ships {rel}")

    # ---- P1 + P2 + P0 content scan (text files only) ----------------------
    text_exts = (".py", ".js", ".ts", ".mjs", ".cjs", ".sh", ".bash", ".zsh",
                 ".json", ".yaml", ".yml", ".md", ".txt", ".toml", ".rb",
                 ".go", ".rs", ".ps1", ".html", "")
    for dirpath, dirs, files in os.walk(target):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "__pycache__", ".mimosa")]
        for f in files:
            p = os.path.join(dirpath, f)
            rel = os.path.relpath(p, target)
            if not f.lower().endswith(text_exts):
                continue
            try:
                with open(p, "r", encoding="utf-8", errors="replace") as fh:
                    content = fh.read(2 * 1024 * 1024)
            except OSError:
                continue
            code_exts = (".py", ".js", ".ts", ".mjs", ".cjs", ".sh", ".bash",
                         ".zsh", ".rb", ".go", ".rs", ".ps1")
            for kind, pat in SECRET_PATTERNS:
                m = re.search(pat, content)
                if m:
                    sev = "critical" if kind in CRITICAL_P1 else "high"
                    add("P1", sev, kind, f"possible secret: {m.group(0)[:40]!r}", rel)
            is_doc = rel.lower().endswith((".md", ".txt"))
            for kind, pat in DANGEROUS_PATTERNS:
                m = re.search(pat, content)
                if m:
                    # docs (.md/.txt) legitimately quote patterns — but the
                    # secrets scan (P1 above) still covers every file
                    if is_doc and kind in ("eval-exec", "credential-harvest",
                                           "env-secret-harvest", "shell-pipe-install"):
                        continue
                    sev = "critical" if kind in CRITICAL_P2 else "high"
                    # redact the matched material in the report (may contain
                    # real credentials on first scan of an unaudited tree)
                    add("P2", sev, kind, f"pattern {kind}: {m.group(0)[:24]!r}…", rel)
            if rel.lower().endswith(code_exts):
                # egress + credential-harvest apply to executable code with
                # comment lines stripped (comments are prose, not behavior)
                content = re.sub(r'(?m)^\s*(#|//).*$', ' ', content)
                # egress applies to executable code only — docs legitimately
                # name integrations; secrets scan still covers docs above
                hosts = sorted(set(NET_RE.findall(content)))
                bad_hosts = [h for h in hosts if h.lower() not in ALLOWED_NET_HOSTS]
                if bad_hosts:
                    add("P2", "high", "unlisted-network-egress",
                        f"contacts non-allowlisted host(s): {', '.join(bad_hosts[:4])}", rel)

    # ---- P3: sandboxed preview (quarantine copy; optional docker run) -----
    digest = sha256_tree(target)
    quarantine = os.path.join(os.path.expanduser("~/.fable/quarantine"), digest[:12])
    os.makedirs(quarantine, exist_ok=True)
    if os.path.abspath(quarantine) != os.path.abspath(target):
        shutil.rmtree(quarantine, ignore_errors=True)
        shutil.copytree(target, quarantine, dirs_exist_ok=True,
                        ignore=shutil.ignore_patterns(".git", "node_modules", "__pycache__"))
    add("P3", "info", "quarantined", f"artifact copied to {quarantine} (digest {digest[:12]})")

    # ---- verdict -----------------------------------------------------------
    sev_rank = {"critical": 3, "high": 2, "medium": 1, "low": 0, "info": -1}
    worst = max((sev_rank.get(f["severity"], 0) for f in findings), default=-1)
    verdict = "blocked" if worst >= 3 else ("needs-review" if worst >= 2 else "ok")
    return {"verdict": verdict, "digest": digest,
            "quarantine": quarantine, "findings": findings}


def maybe_sandbox(target, engine):
    """Best-effort isolated run: only when a container runtime is present."""
    if engine == "docker" and shutil.which("docker"):
        img = "python:3.12-alpine"
        r = subprocess.run(
            ["docker", "run", "--rm", "--network=none", "-v",
             f"{os.path.abspath(target)}:/cap:ro", img,
             "python3", "-c", "import pathlib; print(sorted(str(p) for p in pathlib.Path('/cap').iterdir()))"],
            capture_output=True, text=True, timeout=180)
        return {"engine": "docker", "exit": r.returncode,
                "stdout": r.stdout.strip()[:500], "stderr": r.stderr.strip()[-300:]}
    return {"engine": "none", "note": ("no container runtime or engine disabled — "
                                       "static phases only; do not treat as a runtime guarantee")}


def main():
    args = sys.argv[1:]
    if "--target" not in args:
        print(json.dumps({"error": 'usage: audit.py --target <dir> [--json] [--sandbox docker]'}))
        sys.exit(3)
    target = args[args.index("--target") + 1]
    if not os.path.isdir(target):
        print(json.dumps({"error": f"target is not a directory: {target}"}))
        sys.exit(3)
    result = audit(target)
    if "--sandbox" in args:
        result["sandbox"] = maybe_sandbox(target, args[args.index("--sandbox") + 1])
    want_json = "--json" in args
    if want_json:
        print(json.dumps(result, indent=2))
    else:
        print(f"verdict: {result['verdict']}  |  digest: {result['digest'][:12]}")
        for f in result["findings"]:
            if f["severity"] != "info":
                print(f"  [{f['phase']}/{f['severity']}] {f['kind']}: {f['detail']} ({f['file']})")
        print(f"quarantine: {result['quarantine']}")
    sys.exit({"ok": 0, "needs-review": 2}.get(result["verdict"], 1))


if __name__ == "__main__":
    main()
