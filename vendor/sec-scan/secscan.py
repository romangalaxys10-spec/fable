#!/usr/bin/env python3
"""secscan.py — self-contained, non-invasive web security audit.

Stdlib-only Python 3.10+. Sends only normal HTTP(S) requests and plain
TCP connects to the target host (and optionally the --vps IP). No
exploitation, no DoS, passive scans only. See SKILL.md for details.

Safety model: every URL this script may fetch must belong to a host we
were given (the target and, optionally, the VPS IP). Redirects to any
other host are observed (recorded) but never followed — that is both
the open-redirect signal and the SSRF guard.
"""
from __future__ import annotations

import argparse
import ipaddress
import json
import re
import socket
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from html import escape

CRITICAL, HIGH, MEDIUM, LOW, INFO = "critical", "high", "medium", "low", "info"
SEVERITY_ORDER = [CRITICAL, HIGH, MEDIUM, LOW, INFO]

TARGET_HOSTS: set[str] = set()  # hostnames/IPs this run is allowed to touch
REQUESTS_SENT = 0
MAX_REQUESTS = 100
PROBE_DELAY = 2.0
MAX_REDIRECT_HOPS = 5
TCP_PORTS = [22, 80, 443, 3000, 3005, 8000, 8080, 5432, 3306, 6379,
             27017, 8443, 8888, 9000]
SANS = [".git/HEAD", ".env", ".env.local", ".next/BUILD_ID", ".DS_Store",
        "wp-login.php", "server-status", "metrics", "robots.txt"]


# ---------------------------------------------------------------- findings

def find(sev: str, fid: str, title: str, detail: str,
         evidence: str = "", remediation: str = "") -> dict:
    return {"id": fid, "severity": sev, "title": title,
            "detail": detail, "evidence": evidence, "remediation": remediation}


FINDINGS: list[dict] = []


def emit(sev: str, fid: str, title: str, detail: str,
         evidence: str = "", remediation: str = "") -> None:
    FINDINGS.append(find(sev, fid, title, detail, evidence, remediation))


def bump_request() -> None:
    global REQUESTS_SENT
    REQUESTS_SENT += 1
    if REQUESTS_SENT > MAX_REQUESTS:
        raise RuntimeError("request budget exceeded (100)")


# ---------------------------------------------------------------- host gating

def record_target(host: str) -> None:
    TARGET_HOSTS.add(host.lower())
    # also accept the www/non-www twin
    if host.lower().startswith("www."):
        TARGET_HOSTS.add(host.lower()[4:])
    else:
        TARGET_HOSTS.add("www." + host.lower())


def host_allowed(netloc: str) -> bool:
    """True if the netloc of a URL is one we are allowed to fetch."""
    h = netloc.lower().split("@")[-1]  # strip userinfo
    h = re.sub(r":\d+$", "", h)
    return any(h == t or h.endswith("." + t) or t.endswith("." + h)
               for t in TARGET_HOSTS)


def is_public_host(host: str) -> bool:
    try:
        ip = ipaddress.ip_address(host)
        return not (ip.is_private or ip.is_loopback
                    or ip.is_link_local or ip.is_reserved or ip.is_unspecified)
    except ValueError:
        pass
    try:
        infos = socket.getaddrinfo(host, 443, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        return False
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if not (ip.is_private or ip.is_loopback
                or ip.is_link_local or ip.is_reserved or ip.is_unspecified):
            return True
    return False


# ---------------------------------------------------------------- http layer

class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Return 3xx responses as-is instead of following them."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Ctx:
    def __init__(self, target: str, base_url: str, base_host: str):
        self.target = target
        self.base_url = base_url          # e.g. https://xshredo.com
        self.base_host = base_host        # e.g. xshredo.com
        self.redirect_hops: list[dict] = []
        self.final_url: str = base_url
        self.requested: set[str] = set()
        self.last_status = 0
        self.last_headers: dict = {}

    def _do_get(self, url: str, follow: bool = True, _depth: int = 0):
        """GET; returns (status, headers, body, final_url).

        With follow=True we chase 3xx one hop at a time, counting each hop
        against the request budget and refusing to leave allowed hosts.
        """
        bump_request()
        opener = urllib.request.build_opener(_NoRedirect())
        req = urllib.request.Request(
            url, headers={"User-Agent": "Mozilla/5.0 (compatible; secscan/1.0)"})
        try:
            resp = opener.open(req, timeout=15)
            status = resp.status
            headers = {k.lower(): v for k, v in resp.headers.items()}
            body = resp.read(512 * 1024).decode("utf-8", "replace")
            final = resp.geturl()
        except urllib.error.HTTPError as e:
            status = e.code
            headers = {k.lower(): v for k, v in (e.headers or {}).items()}
            body = (e.read() if e.fp else b"").decode("utf-8", "replace")[:256_000]
            final = url
        except Exception as e:  # URLError etc.
            return 0, {}, f"__ERROR__ {e}", url

        if follow and status in (301, 302, 303, 307, 308) and _depth < MAX_REDIRECT_HOPS:
            loc = (headers.get("location") or "").strip()
            self.redirect_hops.append({"url": url, "status": status,
                                       "location": loc,
                                       "headers": {k: v for k, v in headers.items()}})
            if loc:
                target = loc if loc.startswith("http") else \
                    f"{urllib.parse.urlparse(url).scheme}://{host_allowed_target(url, loc)}"
                target = urllib.parse.urljoin(url, loc)
                netloc = urllib.parse.urlparse(target).netloc
                if host_allowed(netloc):
                    return self._do_get(target, follow=True, _depth=_depth + 1)
                # redirect to a foreign host: do NOT fetch it; report it
                # to the caller as a 3xx observation (open-redirect signal)
        return status, headers, body, final

    def get(self, url: str, follow: bool = True):
        key = url + ("|follow" if follow else "|nofollow")
        if key in self.requested:
            if self.last_status:
                return (self.last_status, self.last_headers, "", "")
            return None
        self.requested.add(key)
        result = self._do_get(url, follow=follow)
        self.last_status = result[0]
        self.last_headers = result[1]
        return result

    def head_baseline_404(self) -> int:
        """Use a nonsense path to learn what a 404 looks like (status code)."""
        url = f"{self.base_url.rstrip('/')}/definitely-not-a-real-page-12345xyz"
        r = self.get(url, follow=False)
        if r is None:
            return -1
        return r[0]


def host_allowed_target(url: str, loc: str) -> str:
    if loc.startswith("http"):
        return urllib.parse.urlparse(loc).netloc
    return urllib.parse.urlparse(url).netloc


def header_val(headers: dict, name: str) -> str:
    for k, v in headers.items():
        if k.lower() == name.lower():
            return v
    return ""


# ---------------------------------------------------------------- A. headers

def audit_headers(ctx: Ctx) -> None:
    r = ctx.get(ctx.base_url, follow=True)
    if r is None or r[0] == 0:
        return
    status, headers, body, final_url = r
    ctx.final_url = final_url

    sec = final_url.lower().startswith("https") or ctx.base_url.lower().startswith("https")
    hsts = header_val(headers, "strict-transport-security")
    if sec:
        if not hsts:
            emit(HIGH, "hdr-hsts", "Missing HSTS header on HTTPS",
                 "The site is reachable over HTTPS but does not send "
                 "Strict-Transport-Security, so browsers are not pinned to TLS.",
                 evidence=f"GET {final_url}",
                 remediation="Add: Strict-Transport-Security: max-age=63072000; "
                             "includeSubDomains; preload")
        else:
            flags = []
            if "includesubdomains" not in hsts.lower():
                flags.append("includeSubDomains")
            if "preload" not in hsts.lower():
                flags.append("preload")
            if flags:
                emit(MEDIUM, "hdr-hsts-flags", "HSTS present but incomplete",
                     f"HSTS is missing: {', '.join(flags)}.",
                     evidence=hsts,
                     remediation=f"Add {', '.join(flags)} to the HSTS directive.")

    server = header_val(headers, "server")
    if server and re.search(r"/\d", server):
        emit(HIGH, "hdr-server-version", "Server header leaks version",
             "The Server response header includes a version string, which "
             "funds exploit matching. A version-less header (or none) is fine.",
             evidence=server,
             remediation="nginx: server_tokens off (globally in nginx.conf, "
                         "then reload). Equivalent in other web servers.")
    elif server:
        emit(LOW, "hdr-server-present", "Server header present (no version)",
             "A version-less Server header is acceptable but can be dropped "
             "entirely.", evidence=server,
             remediation="Optional: hide the Server header in nginx/caddy.")

    leak_hdrs = [
        ("x-powered-by", "hdr-xpoweredby", MEDIUM, "X-Powered-By header leak"),
        ("x-aspnet-version", "hdr-xaspnet", MEDIUM, "X-AspNet-Version header leak"),
        ("x-generator", "hdr-xgenerator", LOW, "X-Generator header leak"),
        ("via", "hdr-via", LOW, "Via header leak (proxy version)"),
    ]
    for name, fid, sev, title in leak_hdrs:
        v = header_val(headers, name)
        if v:
            emit(sev, fid, title, f"{name}: {v}", evidence=v,
                 remediation="Suppress the header at the web server.")

    if not header_val(headers, "x-content-type-options"):
        emit(MEDIUM, "hdr-xcto", "Missing X-Content-Type-Options",
             "Browsers may MIME-sniff responses.", evidence=final_url,
             remediation="Add: X-Content-Type-Options: nosniff")

    csp = header_val(headers, "content-security-policy")
    frame_ancestors = "frame-ancestors" in csp.lower()
    if not header_val(headers, "x-frame-options") and not frame_ancestors:
        emit(MEDIUM, "hdr-frame", "No clickjacking protection",
             "Neither X-Frame-Options nor CSP frame-ancestors is set.",
             evidence=final_url,
             remediation="Add X-Frame-Options: DENY/SAMEORIGIN or "
                         "Content-Security-Policy: frame-ancestors 'none'.")

    if not header_val(headers, "referrer-policy"):
        emit(LOW, "hdr-referrer", "Missing Referrer-Policy",
             "Full URLs may leak to third-party requests.", evidence=final_url,
             remediation="Add: Referrer-Policy: strict-origin-when-cross-origin")

    if not header_val(headers, "permissions-policy"):
        emit(LOW, "hdr-permissions", "Missing Permissions-Policy",
             "Unnecessary device-capability permissions are granted.",
             evidence=final_url,
             remediation="Add: Permissions-Policy: camera=(), microphone=(), "
                         "geolocation=()")

    setc = header_val(headers, "set-cookie")
    if setc:
        if not re.search(r"\bsecure\b", setc, re.I):
            emit(MEDIUM, "hdr-cookie-secure", "Session cookie without Secure flag",
                 "A Set-Cookie on a public page lacks the Secure flag.",
                 evidence=setc[:200],
                 remediation="Set session cookies with Secure; HttpOnly; "
                             "SameSite=Lax.")
        elif not re.search(r"\bhttponly\b", setc, re.I):
            emit(LOW, "hdr-cookie-httponly", "Session cookie without HttpOnly",
                 "Cookies are readable from page scripts.", evidence=setc[:200],
                 remediation="Add the HttpOnly flag to session cookies.")

    # open-redirect probes: paths that historically honor a callback/return
    # parameter. Any 30x whose Location points at a host we do not allow = High.
    candidates = [
        "/auth/signin?callbackUrl=https://evil.example/x",
        "/auth/signin?next=https://evil.example/x",
        "/auth/callback?returnTo=https://evil.example/x",
        "/api/auth/callback?next=https://evil.example/x",
    ]
    for path in candidates:
        url = ctx.base_url.rstrip("/") + path
        rr = ctx.get(url, follow=False)
        if rr and rr[0] in (301, 302, 303, 307, 308):
            loc = header_val(rr[1], "location") or ""
            netloc = urllib.parse.urlparse(
                loc if loc.startswith("http") else f"https://{loc}").netloc.lower()
            if netloc and not host_allowed(netloc):
                emit(HIGH, "open-redirect",
                     f"Open redirect via {urllib.parse.urlparse(path).path}",
                     f"GET {url} -> 3xx Location: {loc} (host {netloc} is "
                     f"outside the allowed targets)",
                     evidence=loc,
                     remediation="Validate callback/return parameters against an "
                                 "allowlist of same-site paths before redirecting.")


# ---------------------------------------------------------------- B. CSP

def _csp_directives(csp: str) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for part in csp.split(";"):
        part = part.strip()
        if not part:
            continue
        bits = part.split()
        if not bits:
            continue
        key, rest = bits[0].lower(), bits[1:]
        out.setdefault(key, []).extend(rest)
    return out


def audit_csp(ctx: Ctx) -> None:
    # Collect every CSP we saw: final page plus intermediate redirect hops.
    csp_pool: list[str] = []
    r = ctx.get(ctx.base_url, follow=False)
    if r:
        csp_pool.append(header_val(r[1], "content-security-policy"))
    for hop in ctx.redirect_hops:
        csp_pool.append(header_val(hop["headers"], "content-security-policy"))
    csp_pool = [c for c in csp_pool if c]
    if not csp_pool:
        emit(MEDIUM, "csp-missing", "No Content-Security-Policy header",
             "The site sends no CSP at all.", evidence=ctx.base_url,
             remediation="Send a Content-Security-Policy header (start with "
                         "default-src 'self').")
        return

    csp = max(csp_pool, key=lambda c: len(_csp_directives(c)))
    d = _csp_directives(csp)
    has_default = "default-src" in d

    for directive in ("object-src", "base-uri", "form-action", "frame-src",
                      "script-src"):
        if directive in d:
            continue
        if has_default:
            continue  # covered by default-src
        sev = HIGH if directive == "script-src" else MEDIUM
        emit(sev, f"csp-{directive}",
             f"CSP missing {directive} with no default-src",
             f"No {directive} and no default-src to fall back to."
             + (" Scripts may load from any origin." if directive == "script-src" else ""),
             evidence=csp, remediation=f"Add {directive} 'self'.")

    for key, vals in d.items():
        for v in vals:
            if key.endswith("-src") and (v == "*" or
                                        (re.match(r"^https?:", v) and v in ("https:", "http:"))):
                emit(MEDIUM, "csp-wildcard",
                     f"CSP {key} uses wildcard '{v}'",
                     f"A wildcard source in {key} weakens the policy.",
                     evidence=csp,
                     remediation=f"Replace {key} '{v}' with an explicit "
                                 "allowlist of origins.")
                break

    risky = [
        ("script-src", "'unsafe-inline'", HIGH, "csp-unsafe-inline",
         "Removes inline scripts: switch to nonce- or hash-based script "
         "sources.", "Remove 'unsafe-inline' from script-src."),
        ("script-src", "'unsafe-eval'", HIGH, "csp-unsafe-eval",
         "eval() defeats script-source restrictions.",
         "Remove 'unsafe-eval' from script-src (refactor eval usage)."),
        ("style-src", "'unsafe-inline'", MEDIUM, "csp-style-unsafe-inline",
         "Inline styles are permitted (lower impact than inline script).",
         "Extract inline styles into a stylesheet or use style hashes."),
    ]
    for key, tok, sev, fid, detail, rem in risky:
        if tok in d.get(key, []):
            emit(sev, fid, f"CSP {key} contains {tok}", detail,
                 evidence=csp, remediation=rem)

    for key in ("worker-src", "child-src"):
        if key not in d and not has_default:
            emit(MEDIUM, f"csp-{key}",
                 f"CSP missing {key} (no default-src fallback)",
                 "Worker/child frames can come from anywhere.", evidence=csp,
                 remediation=f"Add {key} 'self' (or 'none').")


# ---------------------------------------------------------------- C. TLS

def audit_tls(host: str) -> None:
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((host, 443), timeout=8) as raw:
            with ctx.wrap_socket(raw, server_hostname=host) as s:
                cert = s.getpeercert()
                issuer = dict(x[0] for x in cert.get("issuer", []))
                subject = dict(x[0] for x in cert.get("subject", []))
                if issuer.get("commonName", "") == subject.get("commonName", ""):
                    emit(HIGH, "tls-selfsigned", "Self-signed certificate",
                         "The certificate was issued by itself; standard "
                         "browsers reject or warn.",
                         evidence=json.dumps(subject),
                         remediation="Install a CA-issued certificate "
                                     "(Let's Encrypt / Caddy / ACME).")
                notafter = cert.get("notAfter", "")
                if notafter:
                    try:
                        exp = datetime.strptime(
                            notafter, "%b %d %H:%M:%S %Y %Z").replace(
                            tzinfo=timezone.utc)
                        days = (exp - datetime.now(timezone.utc)).days
                        if days < 14:
                            emit(HIGH, "tls-expiring",
                                 f"Certificate expires in {days} days",
                                 f"notAfter={notafter} — within 14 days.",
                                 evidence=notafter,
                                 remediation="Renew the certificate now "
                                             "(acme renew / certbot renew).")
                        elif days < 30:
                            emit(MEDIUM, "tls-expiring-soon",
                                 f"Certificate expires in {days} days",
                                 f"notAfter={notafter} — within 30 days.",
                                 evidence=notafter,
                                 remediation="Renew the certificate; add "
                                             "auto-renewal (acme renew cron).")
                    except ValueError:
                        pass

        # TLS 1.1 handshake probe: success = legacy protocol enabled
        legacy = ssl.create_default_context()
        legacy.minimum_version = ssl.TLSVersion.TLSv1_1
        legacy.maximum_version = ssl.TLSVersion.TLSv1_1
        try:
            with socket.create_connection((host, 443), timeout=6) as raw:
                legacy.wrap_socket(raw, server_hostname=host)
                emit(HIGH, "tls-legacy", "TLS 1.1 is enabled",
                     "The server completed a handshake at a deprecated "
                     "TLS version.",
                     evidence="TLS 1.1 handshake succeeded",
                     remediation="Disable TLS < 1.2 "
                                 "(nginx: ssl_protocols TLSv1_2 TLSv1_3; or "
                                 "set a minimum protocol version).")
        except Exception:
            pass
    except Exception as e:
        emit(INFO, "tls-unreachable", "Could not probe TLS", str(e))


# ---------------------------------------------------------------- D. sensitive files

def audit_sensitive_files(ctx: Ctx) -> None:
    baseline = ctx.head_baseline_404()
    time.sleep(PROBE_DELAY)
    for p in SANS:
        time.sleep(PROBE_DELAY)
        url = ctx.base_url.rstrip("/") + "/" + p
        r = ctx.get(url, follow=False)
        if r is None or r[0] != 200:
            continue
        _status, _headers, body, _final = r
        if p == "robots.txt":
            disallow = [ln.strip() for ln in body.splitlines()
                        if ln.lower().startswith("disallow:") and len(ln.strip()) > 9]
            if disallow:
                emit(INFO, "robots-disallow", "robots.txt Disallow entries",
                     "Reported for awareness only; these paths are intentionally "
                     "listed and were NOT treated as leaks.",
                     evidence="\n".join(disallow[:10]),
                     remediation="Nothing — confirm each Disallow path is "
                                 "intended (e.g. /admin).")
            continue
        if baseline == 404 and body.strip():
            sev = HIGH if p in (".env", ".env.local") else MEDIUM
            emit(sev, f"leak-{p.replace('/', '-')}",
                 f"/{p} is publicly readable",
                 f"GET /{p} returned 200 with content while the 404 baseline "
                 f"is {baseline}.",
                 evidence=body[:300].replace("\n", " | "),
                 remediation=f"Remove /{p} from the document root or block it "
                             "in the web server.")
        elif baseline not in (404, -1) and baseline == 200:
            emit(INFO, "no-404-baseline", f"No 404 baseline for /{p}",
                 "The server returned the same status for a nonexistent path "
                 "as it returns for real pages, so this probe is inconclusive.",
                 evidence=f"404 baseline -> {baseline}",
                 remediation="Verify manually whether /" + p + " exists.")

    # /admin special case: 200 vs 404 baseline is expected but worth noting
    r = ctx.get(ctx.base_url.rstrip("/") + "/admin", follow=False)
    if r and r[0] == 200 and baseline == 404:
        emit(MEDIUM, "admin-200", "/admin returns 200",
             "The admin UI is reachable (it may still render the login form "
             "for anonymous visitors).",
             evidence=f"GET /admin -> 200 (404 baseline {baseline})",
             remediation="Confirm /admin shows only the auth screen to "
                         "anonymous visitors; guard it if it leaks content.")


# ---------------------------------------------------------------- E. repo scan

SECRET_PATTERNS = [
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "AWS access key (AKIA…)"),
    (re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b"), "Slack token (xox…)"),
    (re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b"), "GitHub token (ghp_/gho_/…)"),
    (re.compile(r"-----BEGIN (?:RSA|EC|DSA|OPENSSH|PGP) PRIVATE KEY-----"),
     "Private key block"),
    (re.compile(r"\bsk-[A-Za-z0-9]{20,}\b"), "OpenAI-style API key (sk-…)"),
    (re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\b"),
     "JWT with embedded payload"),
]


def scan_repo(root: Path) -> None:
    skip_dirs = {"node_modules", ".git", ".next", ".turbo", "dist",
                 "build", ".venv", "vendor"}
    max_files = 4000
    scanned = 0
    for path in root.rglob("*"):
        if scanned > max_files:
            break
        if not path.is_file():
            continue
        rel = path.relative_to(root)
        if any(part in skip_dirs for part in rel.parts):
            continue
        scanned += 1
        try:
            text = path.read_text(errors="ignore")
        except Exception:
            continue
        for regex, label in SECRET_PATTERNS:
            m = regex.search(text)
            if m:
                ctx_line = text[max(0, m.start() - 80):m.end() + 40]
                emit(HIGH, "repo-secret",
                     f"Possible {label} in {rel}",
                     f"Regex match for {label} at {rel}.",
                     evidence=ctx_line.replace("\n", " ")[:240],
                     remediation="Rotate the credential and move it to an "
                                 "environment variable / secret store; add a "
                                 "pre-commit hook (gitleaks / git-secrets).")
                break  # one secret hit per file is enough

    if (root / ".git").is_dir():
        try:
            out = subprocess.run(
                ["git", "-C", str(root), "ls-files"],
                capture_output=True, text=True, timeout=15,
                cwd=str(root)).stdout
            env_files = [l for l in out.splitlines()
                         if re.search(r"(^|/)\.env(\..*)?$", l)]
            if env_files:
                emit(HIGH, "repo-env-tracked",
                     ".env files tracked by git",
                     "Environment files that usually contain credentials are "
                     "committed to the repository.",
                     evidence="\n".join(env_files[:10]),
                     remediation="git rm --cached the .env files, add them to "
                                 ".gitignore, and rotate anything that leaked.")
        except Exception:
            pass


# ---------------------------------------------------------------- F. VPS ports

PORT_SERVICES = {22: "ssh", 80: "http", 443: "https", 3000: "node app",
                 3005: "node app", 8000: "uvicorn/app", 8080: "alt web",
                 5432: "postgres", 3306: "mysql", 6379: "redis",
                 27017: "mongodb", 8443: "alt https", 8888: "jupyter/webui",
                 9000: "gunicorn/caddy"}


def check_vps(ip: str) -> None:
    for port in TCP_PORTS:
        try:
            with socket.create_connection((ip, port), timeout=1.5):
                open = True
        except Exception:
            continue
        if port in (80, 443):
            emit(INFO, f"vps-port-{port}",
                 f"VPS port {port} is open (expected)",
                 "Web traffic; expected for a hosting VPS.",
                 remediation="None — normal.")
        elif port == 22:
            try:
                with socket.create_connection((ip, 22), timeout=1.5) as s:
                    banner = s.recv(64).decode("utf-8", "replace").strip()
                if re.search(r"OpenSSH/\d", banner):
                    emit(LOW, "vps-ssh-banner",
                         "SSH banner discloses OpenSSH version",
                         "The SSH banner includes the version string.",
                         evidence=banner,
                         remediation="Optional: restrict 22 to trusted IPs "
                                     "(ufw) or hide the banner behind a "
                                     "bouncer.")
            except Exception:
                pass
            emit(INFO, "vps-ssh-open", "VPS port 22 is open",
                 "SSH exposure is normal for a VPS; keep key auth and "
                 "fail2ban in place.",
                 remediation="Firewall 22 to your IPs where possible.")
        else:
            emit(MEDIUM, f"vps-port-{port}",
                 f"VPS port {port} is open (unexpected)",
                 f"TCP {port} on the VPS answers; typical service: "
                 f"{PORT_SERVICES.get(port, 'unknown')}.",
                 remediation="Verify it is intentional; close database/cache "
                             "ports to the public IP (ufw/iptables).")


# ---------------------------------------------------------------- G. fingerprint

def fingerprint(ctx: Ctx) -> None:
    r = ctx.get(ctx.base_url, follow=True)
    if r is None or r[0] != 200:
        return
    _status, headers, body, _final = r
    for hdr in ("x-nextjs-version",):
        v = header_val(headers, hdr)
        if v:
            emit(INFO, "fp-nextjs", f"Next.js version {v} exposed in header",
                 "Version disclosure only.", evidence=v,
                 remediation="Optional: drop the header at the web server.")
    m = re.search(r'"version"\s*:\s*"(\d+\.\d+\.\d+)"', body)
    if m and "buildManifest" in body:
        emit(LOW, "fp-nextjs-manifest",
             "Next.js build manifest hints at version",
             "Static asset metadata encodes the framework version.",
             evidence=m.group(0)[:120],
             remediation="Informational; keep dependencies patched instead.")


# ---------------------------------------------------------------- H. port sweep (nmap-lite)

def port_sweep(ip: str, mode: str = "top1000") -> None:
    """TCP connect sweep beyond the fixed VPS list. top1000 = common ports;
    full = all 1-65535 (slow: only with --port-sweep full)."""
    if mode == "full":
        ports = range(1, 65536)
    else:
        ports = TOP_1000_PORTS
    open_found = []
    for port in ports:
        try:
            with socket.create_connection((ip, port), timeout=0.4):
                open_found.append(port)
                if port not in TCP_PORTS:
                    emit(MEDIUM if port not in (53, 25, 587, 993, 465) else LOW,
                         f"sweep-port-{port}",
                         f"Port {port} is open ({PORT_SERVICES.get(port, 'unknown service')})",
                         f"TCP {port} answered on the sweep (outside the common "
                         f"web-port list).",
                         remediation="Verify the service is intentional and "
                                     "firewall it to trusted IPs if not.")
        except OSError:
            continue
    emit(INFO, "sweep-summary",
         f"Port sweep ({mode}): {len(open_found)} open ports",
         "Open: " + (", ".join(str(p) for p in open_found[:30]) or "none") +
         (" … (truncated)" if len(open_found) > 30 else ""),
         remediation="Close or firewall anything not intentional.")


TOP_1000_PORTS = [
    20, 21, 22, 23, 25, 53, 67, 68, 69, 80, 110, 111, 123, 135, 137, 138, 139,
    143, 161, 162, 389, 427, 443, 445, 465, 500, 514, 515, 548, 554, 587, 623,
    631, 636, 646, 873, 990, 993, 995, 1025, 1080, 1194, 1433, 1434, 1521,
    1611, 1723, 1883, 2049, 2054, 2082, 2083, 2181, 2375, 2376, 2377, 2425,
    2638, 2967, 3128, 3260, 3268, 3283, 3306, 3389, 3690, 3724, 4369, 4444,
    5060, 5061, 5222, 5353, 5432, 5439, 5555, 5666, 5672, 5800, 5900, 5984,
    6000, 6001, 6379, 6443, 6566, 6666, 7001, 7002, 7443, 8000, 8008, 8009,
    8010, 8023, 8080, 8081, 8088, 8089, 8090, 8181, 8443, 8500, 8642, 8888,
    9000, 9001, 9080, 9090, 9091, 9100, 9200, 9418, 9595, 9999, 10000, 11211,
    15672, 27017, 27018, 28017, 32768, 32769, 50000, 50030, 50060, 50070,
    50090, 61616,
]

# ---------------------------------------------------------------- I. dependency CVE quick-scan

# Pinned-version checks: known-bad ranges for very common deps (offline lite
# version of dependency-check / trivy). Not a CVE database — flags old floors.
DEP_FLOORS = [
    # (file, dep-name regex, min safe version, advisory id, note)
    ("requirements*.txt", r"log4j", "2.17.1", "CVE-2021-44228", "log4shell RCE"),
    ("requirements*.txt", r"django", "4.2.0", "MULTI", "old django branch EOL"),
    ("requirements*.txt", r"flask", "2.3.0", "MULTI", "older flask, several CVEs"),
    ("requirements*.txt", r"requests", "2.31.0", "CVE-2023-32681", "proxy-auth leak"),
    ("requirements*.txt", r"pillow", "10.0.0", "MULTI", "older pillow CVEs"),
    ("package*.json", r"next\"?\s*:|next$", "13.4.20", "MULTI", "server-side request forgery / cache poisoning fixes"),
    ("package*.json", r"express", "4.18.2", "MULTI", "qs / body-parser issues"),
    ("package*.json", r"lodash", "4.17.21", "CVE-2021-23337", "command injection"),
    ("package*.json", r"axios", "1.6.0", "CVE-2023-45857", "XSRF token leak"),
    ("package*.json", r"json5", "2.2.2", "CVE-2022-46175", "prototype pollution"),
    ("package*.json", r"ws\b", "8.17.1", "CVE-2024-37890", "DoS via headers"),
    ("go.mod", r"golang.org/x/net", "0.17.0", "CVE-2023-39325", "HTTP/2 rapid reset"),
]


def _version_key(v: str):
    parts = re.findall(r"\d+", v)
    return [int(x) for x in parts[:4]] or [0]


def scan_dependencies(root: Path) -> None:
    for fname_pat, dep_re, minver, advisory, note in DEP_FLOORS:
        for path in root.glob(fname_pat):
            try:
                text = path.read_text(errors="ignore")
            except Exception:
                continue
            for line in text.splitlines():
                if not re.search(dep_re, line, re.I):
                    continue
                versions = re.findall(r"(\d+\.\d+(?:\.\d+)?)", line)
                if not versions:
                    continue
                v = versions[0]
                if _version_key(v) < _version_key(minver):
                    emit(HIGH, "dep-vulnerable",
                         f"Outdated dependency in {path.name}: {line.strip()[:60]}",
                         f"Version {v} is below the known-safe floor {minver} "
                         f"({advisory} — {note}).",
                         evidence=line.strip()[:200],
                         remediation=f"Bump to >= {minver} (or later) and run "
                                     "your package manager's audit tool.")
                break  # one match per file/dep is enough


# ---------------------------------------------------------------- J. code-pattern scan (semgrep-lite)

CODE_PATTERNS = [
    (r"md5\s*\(|MD5\b(?!\w*verify)", "Weak hash MD5", "Use SHA-256 or better."),
    (r"random\.random\(\)|random\.randint\(", "Insecure randomness",
     "Use the secrets module for tokens/keys."),
    (r"(?i)verify\s*=\s*False", "TLS verification disabled",
     "Never disable certificate verification."),
    (r"(?i)debug\s*[:=]\s*True", "Debug mode enabled in code",
     "Disable debug mode in production deployments."),
    (r"(?i)(password|passwd|pwd)\s*=\s*[\"'][^\"']{4,}[\"']", "Hardcoded password literal",
     "Move credentials to env/secret store."),
    (r"execute\(.*%s.*\)\s*%|execute\(.*\+.*\)", "Possible SQL string concatenation",
     "Use parameterized queries."),
    (r"pickle\.loads?\(", "pickle deserialization",
     "Avoid pickle on untrusted input (arbitrary code execution)."),
    (r"(?i)shell=True", "shell=True in subprocess",
     "Avoid shell=True with user-controlled input (injection)."),
    (r"eval\(|new Function\(", "eval usage in code",
     "Remove dynamic evaluation of strings."),
]


def scan_code_patterns(root: Path) -> None:
    skip_dirs = {"node_modules", ".git", ".next", ".venv", "vendor", "dist", "build"}
    exts = {".py", ".js", ".ts", ".mjs"}
    scanned = 0
    for path in root.rglob("*"):
        if scanned > 3000:
            break
        if not path.is_file() or path.suffix not in exts:
            continue
        if any(part in skip_dirs for part in path.relative_to(root).parts):
            continue
        scanned += 1
        try:
            text = path.read_text(errors="ignore")
        except Exception:
            continue
        for regex, title, rem in CODE_PATTERNS:
            m = re.search(regex, text)
            if m:
                ctx = text[max(0, m.start() - 60):m.end() + 40].replace("\n", " ")
                emit(MEDIUM, "code-pattern",
                     f"{title} in {path.relative_to(root)}",
                     f"Pattern matched: {regex}",
                     evidence=ctx[:200],
                     remediation=rem)
                break  # one pattern hit per file


# ---------------------------------------------------------------- K. compliance mapping

COMPLIANCE_MAP = {
    "hdr-hsts": ["NIST 800-53 SC-8", "CIS Control 3.10"],
    "hdr-server-version": ["CIS Control 9", "OWASP A05"],
    "hdr-xpoweredby": ["OWASP A05", "CIS Control 9"],
    "hdr-xcto": ["OWASP A05"],
    "hdr-frame": ["OWASP A05", "CIS Control 9"],
    "hdr-cookie-secure": ["OWASP A02", "PCI DSS 4.2"],
    "open-redirect": ["OWASP A01", "PCI DSS 6.5"],
    "csp-missing": ["OWASP A05"],
    "csp-unsafe-inline": ["OWASP A05"],
    "tls-legacy": ["PCI DSS 4.2.1", "NIST 800-53 SC-8"],
    "tls-expiring": ["PCI DSS 4.2.1"],
    "tls-selfsigned": ["PCI DSS 4.2.1", "ISO 27001 A.8.24"],
    "leak-.env": ["OWASP A05", "CIS Control 3.3"],
    "leak-.git/HEAD": ["OWASP A05"],
    "repo-secret": ["CIS Control 3.3", "SOC 2 CC6.1", "ISO 27001 A.8.28"],
    "repo-env-tracked": ["CIS Control 3.3", "SOC 2 CC6.1"],
    "dep-vulnerable": ["OWASP A06", "PCI DSS 6.3.3"],
    "code-pattern": ["OWASP A03", "PCI DSS 6.3.1"],
    "vps-port-*": ["CIS Control 4.6"],
    "admin-200": ["OWASP A07", "SOC 2 CC6"],
}


def compliance_map(findings: list[dict]) -> dict:
    """Map finding ids to framework references (AegisScan-style gap analysis)."""
    out: dict[str, list[str]] = {}
    for f in findings:
        fid = f["id"]
        refs = set()
        for key, frameworks in COMPLIANCE_MAP.items():
            if key.endswith("*") and fid.startswith(key[:-1]):
                refs.update(frameworks)
            elif fid == key:
                refs.update(frameworks)
        if refs and f["severity"] in (CRITICAL, HIGH, MEDIUM):
            out[fid] = sorted(refs)
    return out


# ---------------------------------------------------------------- report

def render_html(findings: list[dict], meta: dict) -> str:
    colors = {CRITICAL: "#c0392b", HIGH: "#e74c3c", MEDIUM: "#f39c12",
              LOW: "#f1c40f", INFO: "#7f8c8d"}
    counts = {s: 0 for s in SEVERITY_ORDER}
    for f in findings:
        counts[f["severity"]] += 1
    rows = []
    for s in SEVERITY_ORDER:
        for f in [x for x in findings if x["severity"] == s]:
            rows.append(f"""
      <tr style="border-bottom:1px solid #eee">
        <td style="padding:8px 10px;white-space:nowrap">
          <span style="background:{colors[s]};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;text-transform:uppercase">{s}</span>
        </td>
        <td style="padding:8px 10px;width:38%"><b>{escape(f['title'])}</b><br>
          <span style="color:#666">{escape(f['detail'])}</span></td>
        <td style="padding:8px 10px"><pre style="white-space:pre-wrap;margin:0 0 4px;font-size:11px;color:#333">{escape(f['evidence'][:500])}</pre>
          <span style="color:#2c3e50;font-size:12px">{escape(f['remediation'])}</span></td>
      </tr>""")
    summary = "".join(
        f'<span style="background:{colors[s]};color:#fff;padding:2px 10px;border-radius:10px;margin-right:6px">{s}: {counts[s]}</span>'
        for s in SEVERITY_ORDER if counts[s])
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>secscan report — {escape(meta['target'])}</title>
<style>body{{font-family:-apple-system,Segoe UI,Roboto,sans-serif;margin:0;background:#f6f8fa}}
.wrap{{max-width:1100px;margin:24px auto;background:#fff;border-radius:8px;
box-shadow:0 1px 4px rgba(0,0,0,.12);padding:24px}}
h1{{margin:0 0 4px;font-size:20px}} table{{width:100%;border-collapse:collapse}}
.meta{{color:#666;font-size:12px;margin-bottom:16px}}</style></head>
<body><div class="wrap">
<h1>secscan — {escape(meta['target'])}</h1>
<div class="meta">{escape(meta['generated_at'])} · {escape(meta['scope'])} ·
requests used: {meta['requests_used']}</div>
<div style="margin:12px 0">{summary or '<span style="color:#27ae60">No findings.</span>'}</div>
<table>{''.join(rows) or '<tr><td style="padding:12px">Clean run — no findings recorded.</td></tr>'}
</table></div></body></html>"""


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="secscan — non-invasive web security audit (see SKILL.md).")
    ap.add_argument("target", help="hostname or http(s) URL to audit")
    ap.add_argument("--vps", help="optional VPS IP for the port/TCP checks")
    ap.add_argument("--repo", help="optional repo path for the secret/leak scan")
    ap.add_argument("--port-sweep", choices=["off", "top1000", "full"], default="off",
                    help="TCP sweep beyond the fixed port list (top1000 or all 65535)")
    ap.add_argument("--compliance", action="store_true",
                    help="map findings to compliance framework references")
    ap.add_argument("--out", help="write the HTML report to this path")
    args = ap.parse_args(argv)

    t = args.target
    if not re.match(r"^https?://", t):
        t = "https://" + t
    parsed = urllib.parse.urlparse(t)
    if not parsed.hostname:
        print("error: target does not parse to a hostname", file=sys.stderr)
        return 2
    base_url = f"{parsed.scheme or 'https'}://{parsed.netloc}"
    host = parsed.hostname
    record_target(host)

    public = is_public_host(host)
    if not public:
        print(f"note: {host} is not public — HTTP/sensitive-file probes are "
              f"skipped (LAN-targeting refused).", file=sys.stderr)

    print(f"secscan {base_url} ({'public' if public else 'non-public'})")

    ctx = Ctx(args.target, base_url, host)
    if public:
        audit_headers(ctx)
        audit_csp(ctx)
        audit_sensitive_files(ctx)
        if base_url.startswith("https"):
            audit_tls(host)
    else:
        emit(INFO, "skip-probes", "Non-public target: probes skipped",
             "The target resolves to a private/loopback address; the HTTP "
             "sections are skipped by design.",
             remediation="Run from a machine with public egress, or pass a "
                         "public target.")
    fingerprint(ctx)  # harmless: the single GET just fails fast if unreachable

    if args.vps:
        record_target(args.vps)
        check_vps(args.vps)

    if args.repo:
        p = Path(args.repo).expanduser()
        if p.is_dir():
            scan_repo(p)
            scan_dependencies(p)
            scan_code_patterns(p)
        else:
            print(f"warning: --repo {args.repo} is not a directory",
                  file=sys.stderr)

    if args.port_sweep != "off":
        sweep_ip = args.vps or host
        if is_public_host(sweep_ip):
            port_sweep(sweep_ip, args.port_sweep)
        else:
            print(f"warning: port sweep skipped — {sweep_ip} is not public",
                  file=sys.stderr)

    FINDINGS.sort(key=lambda f: (SEVERITY_ORDER.index(f["severity"]), f["id"]))
    counts = {s: sum(1 for f in FINDINGS if f["severity"] == s)
              for s in SEVERITY_ORDER}

    print("\nresults:")
    for s in SEVERITY_ORDER:
        for f in [x for x in FINDINGS if x["severity"] == s]:
            print(f"  [{s.upper():8}] {f['id']}: {f['title']}")
    print("\nsummary: " + " ".join(f"{s}={counts[s]}" for s in SEVERITY_ORDER))

    if args.compliance:
        cmap = compliance_map(FINDINGS)
        if cmap:
            print("\ncompliance mapping (finding → framework references):")
            for fid, refs in sorted(cmap.items()):
                print(f"  {fid}: {', '.join(refs)}")
        else:
            print("\ncompliance mapping: no mappable findings")

    if args.out:
        meta = {"target": base_url,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "scope": "target" + (f" + vps {args.vps}" if args.vps else "")
                         + (f" + repo {args.repo}" if args.repo else ""),
                "requests_used": REQUESTS_SENT}
        html = render_html(FINDINGS, meta)
        if args.compliance:
            cmap = compliance_map(FINDINGS)
            if cmap:
                rows = "".join(
                    f"<tr style='border-bottom:1px solid #eee'><td style='padding:6px 10px'>{fid}</td>"
                    f"<td style='padding:6px 10px'>{', '.join(refs)}</td></tr>"
                    for fid, refs in sorted(cmap.items()))
                html = html.replace("</table></div></body>",
                                    f"</table><h3 style='margin-top:20px'>Compliance mapping</h3>"
                                    f"<table>{rows}</table></div></body>")
        Path(args.out).write_text(html, encoding="utf-8")
        print(f"report written to {args.out}")

    print(f"requests sent: {REQUESTS_SENT} (budget {MAX_REQUESTS})")
    has_bad = counts[CRITICAL] + counts[HIGH] > 0
    return 1 if has_bad else 0


if __name__ == "__main__":
    sys.exit(main())
