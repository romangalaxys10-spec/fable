#!/usr/bin/env python3
"""fable video: fetch AI4Animation model weights on demand.

The vendored `vendor/ai4animation/` code is small, but its trained weights
are not (~60 MB per demo). This script downloads them once into
~/.fable/models/ai4animation/<demo>/ from the upstream GitHub repo.

Security: HTTPS only; host must be exactly one of the allowlisted hosts
(github.com, raw.githubusercontent.com, huggingface.co); loopback/private/
reserved hosts are rejected before any request is made.

Usage:
  python3 scripts/fetch_models.py --demo authoring   # Network.pt + PostProcessor.pt
  python3 scripts/fetch_models.py --demo biped
  python3 scripts/fetch_models.py --demo quadruped
  python3 scripts/fetch_models.py --list
"""

import argparse
import ipaddress
import json
import os
import socket
import sys
import urllib.parse
import urllib.request

REPO = "facebookresearch/ai4animationpy"
DEST_ROOT = os.environ.get("FABLE_MODELS", os.path.expanduser("~/.fable/models/ai4animation"))
ALLOWED_HOSTS = {"github.com", "raw.githubusercontent.com", "huggingface.co", "codeload.github.com"}

DEMOS = {
    "authoring": [
        "Demos/Authoring/Models/Network.pt",
        "Demos/Authoring/Models/PostProcessor.pt",
    ],
    "biped": [
        "Demos/Locomotion/Biped/Models/Network.pt",
        "Demos/Locomotion/Biped/Models/PostProcessor.pt",
    ],
    "quadruped": [
        "Demos/Locomotion/Quadruped/Network.pt",
        "Demos/Locomotion/Quadruped/Postprocessor.pt",
    ],
}


def assert_safe_url(url: str) -> None:
    """HTTPS only, exact allowlisted host, reject loopback/private/reserved."""
    u = urllib.parse.urlparse(url)
    if u.scheme not in ("https", "http"):
        raise ValueError(f"only http/https allowed: {url}")
    host = u.hostname or ""
    if host in ("localhost",) or host.endswith(".local") or host.endswith(".internal"):
        raise ValueError(f"loopback/internal host rejected: {host}")
    try:
        infos = socket.getaddrinfo(host, None)
    except OSError as e:
        raise ValueError(f"cannot resolve host {host}: {e}")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_loopback or ip.is_private or ip.is_reserved or ip.is_link_local or ip.is_multicast:
            raise ValueError(f"host {host} resolves to private/reserved address {ip}; rejected")
    if host not in ALLOWED_HOSTS:
        raise ValueError(f"host not allowlisted: {host}")


def fetch(url: str, dest: str, force: bool = False) -> str:
    assert_safe_url(url)
    if os.path.exists(dest) and not force:
        return f"cached: {dest}"
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    tmp = dest + ".part"
    req = urllib.request.Request(url, headers={"User-Agent": "fable-video/0.1"})
    with urllib.request.urlopen(req, timeout=120) as resp, open(tmp, "wb") as fh:
        while True:
            chunk = resp.read(1 << 20)
            if not chunk:
                break
            fh.write(chunk)
    os.replace(tmp, dest)
    return f"downloaded: {dest} ({os.path.getsize(dest) // 1024 // 1024} MB)"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--demo", choices=sorted(DEMOS))
    ap.add_argument("--list", action="store_true")
    args = ap.parse_args()

    if args.list or not args.demo:
        print(json.dumps({"demos": {k: len(v) for k, v in DEMOS.items()},
                          "dest_root": DEST_ROOT,
                          "allowed_hosts": sorted(ALLOWED_HOSTS)}, indent=2))
        return

    results = []
    for rel in DEMOS[args.demo]:
        url = f"https://raw.githubusercontent.com/{REPO}/main/{rel}"
        dest = os.path.join(DEST_ROOT, rel.split("/")[-2], os.path.basename(rel))
        try:
            results.append(fetch(url, dest, force=os.environ.get("FABLE_FORCE") == "1"))
        except Exception as e:  # noqa: BLE001 - report per-file failure, keep going
            results.append(f"FAILED: {rel}: {e}")
    print(json.dumps({"demo": args.demo, "results": results}, indent=2))
    if any(r.startswith("FAILED") for r in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
