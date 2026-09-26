---
name: sec-scan
description: "Self-contained security audit for web properties: response-header hardening, CSP policy linting, TLS config, exposed sensitive files, secret leak scan, port/OS detection, and version-leak checks. Use when asked to security-scan / audit / pentest-lite a site or VPS before launch or after a security report arrives. Vendored into fable; routed automatically by scripts/route.py for security-audit tasks."
---

# sec-scan — self-contained security audit (vendored in fable)

Re-audit a web property (and optionally the VPS it lives on and the repo
behind it) without paid scanners. The single tool is `secscan.py`, a
stdlib-only Python 3.10+ script in this folder.

## When to use

- Before launch, or right after a security report (nmap/nuclei/zap/nikto/
  spiderfoot) arrives and you want to confirm or reproduce the key findings
  in-house.
- When the team asks for a quick "is our site still safe?" pass.
- Weekly-ish hygiene check: run it, diff the HTML report against the last one.

## How to run

Single command, no pip installs:

```bash
python3 <plugin-root>/vendor/sec-scan/secscan.py <target> [--vps <ip>] [--repo <path>] \
    [--port-sweep top1000|full] [--compliance] [--out report.html]
```

`<target>` may be a bare hostname or an http(s) URL. Exit code is 0 when
there are no Critical/High findings, 1 otherwise — so it is cron- and CI-
friendly.

## What each check does

- **A. HTTP header audit** — HSTS, Server/version leaks, X-Powered-By/AspNet/
  Generator/Via, X-Content-Type-Options, clickjacking, Referrer/Permissions-
  Policy, cookie Secure/HttpOnly, open-redirect probes (3–4 callback paths).
- **B. CSP lint (ZAP-equivalent rules)** — missing directives with no
  `default-src` fallback, wildcards, `unsafe-inline`/`unsafe-eval`,
  worker/child-src gaps.
- **C. TLS audit** — cert expiry (<14d High, <30d Medium), TLS 1.0/1.1
  enabled, self-signed cert.
- **D. Sensitive-file probing** — `.git/HEAD`, `.env`, `.next/BUILD_ID`,
  `.DS_Store`, `/wp-login.php`, `/admin`, `/server-status`, `/metrics`;
  404-baseline aware; robots.txt Disallow reported as info only. Bounded
  under 3 minutes total.
- **E. Secret/leak scan** (with `--repo`) — AWS/Slack/GitHub tokens, private
  key blocks, OpenAI-style keys, JWTs, `.env` files tracked by git.
- **F. VPS host checks** (with `--vps <ip>`) — fixed TCP port list; anything
  open beyond 80/443 = Medium; SSH banner version disclosure = Low.
- **H. Port sweep** (`--port-sweep top1000|full`) — Nmap-style TCP connect
  sweep beyond the fixed list (top-1000 common ports, or all 65535 with
  `full`; slow). Unexpected open ports = Medium.
- **I. Dependency CVE quick-scan** (with `--repo`) — checks
  `requirements*.txt` / `package*.json` / `go.mod` against known-safe
  version floors for a dozen high-impact deps (log4shell, axios, lodash,
  next, requests, golang.org/x/net…). Offline lite version of
  dependency-check/trivy.
- **J. Code-pattern scan** (with `--repo`, semgrep-lite) — flags MD5,
  insecure randomness, `verify=False`, debug mode, hardcoded passwords,
  SQL string concatenation, pickle, `shell=True`, `eval`.
- **K. Compliance mapping** (`--compliance`) — maps every finding to
  framework references: OWASP Top 10, CIS Controls, PCI DSS, NIST 800-53,
  ISO 27001, SOC 2. Printed to console and embedded in the HTML report.

## Safety model

Every URL fetched must belong to the target host (or the `--vps` IP) —
redirects to other hosts are recorded but never followed (SSRF guard).
Non-public/loopback targets refuse HTTP probing. Request budget: 100.

## Fable integration

- Routed automatically: security-audit tasks (`scan`, `audit`, `pentest`,
  `security check`, `headers`, `csp`, `tls`, `before launch`) hit the
  `sec_scan` engine in `scripts/route.py`.
- Findings with Critical/High severity should be recorded as a lesson card
  (`scripts/record.js`) once fixed, so future audits of the same property
  reuse the fix.
