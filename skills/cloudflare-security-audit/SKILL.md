---
name: cloudflare-security-audit
title: Enterprise Multi-Phase Security Audit & Edge Hardening
source: https://github.com/cloudflare/security-audit-skill.git
category: Cloud & Edge Application Security
version: 1.0.0
license: Apache-2.0
---

# cloudflare-security-audit — Enterprise Multi-Phase Security Audit

Derived from the official [`cloudflare/security-audit-skill`](https://github.com/cloudflare/security-audit-skill.git).

> **Core Axiom**: Transforms a coding agent into a systematic security auditor capable of fleet-wide codebase scanning and edge posture hardening across 6 isolated phases with independent double-blind verification.

---

## 1. The 6-Phase Audit Workflow

```
[Phase 1: Reconnaissance]          Enum architecture, edge routes, ingress, auth boundaries
          │
          ▼
[Phase 2: Coverage-Led Hunting]    Taint flow analysis, dangerous sink scanning (crypto, exec, db)
          │
          ▼
[Phase 3: Candidate Validation]    Filter false leads against exploitability preconditions
          │
          ▼
[Phase 4: Structured Output]       CVSS v3.1 calculation, CWE taxonomy, impact matrix
          │
          ▼
[Phase 5: Independent Verification] Isolated auditor sub-agent independently re-verifies finding
          │
          ▼
[Phase 6: Target-Neutral Report]   Comprehensive remediation guide with defense-in-depth policy
```

---

## 2. Edge & Cloud Security Invariants Checked

1. **HTTP Security Headers**:
   - `Content-Security-Policy`: Disallow `unsafe-inline` / `unsafe-eval` without nonces.
   - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`.
   - `X-Content-Type-Options: nosniff`.
   - `X-Frame-Options: DENY` or `SAMEORIGIN`.
   - `Referrer-Policy: strict-origin-when-cross-origin`.
2. **TLS / SSL Ciphers & Transport**:
   - TLS 1.3 enforced, minimum TLS 1.2. Zero legacy ciphers (RC4, 3DES, CBC).
3. **CORS & Origin Hardening**:
   - No wildcard `Access-Control-Allow-Origin: *` with credentials.
   - Authenticated Origin Pulls (TLS client certificate between edge and origin).
4. **WAF & Rate Limiting**:
   - Managed OWASP Core Ruleset enabled at edge.
   - Rate limit thresholds on `/api/login`, `/api/auth`, `/api/checkout`.
5. **Zero Trust & IAM**:
   - Service-to-service mTLS or signed JWT gateway headers.
