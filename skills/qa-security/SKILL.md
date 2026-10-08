---
name: qa-security
title: Automated Security Testing & OWASP Hardening
category: Security
author: Principal QA Architect & Systems Staff Engineer
---

# qa-security — Security Testing & OWASP Hardening

Scans for security vulnerabilities including OWASP Top 10, auth bypasses, IDOR, input sanitization flaws (SQLi/XSS), and leaked secrets in test artifacts.

## 1. Capabilities
- Integration with OWASP ZAP and dependency CVE audit tools.
- Automated fuzzing of input parameters with SQL injection and XSS probes.
- Role-based authorization matrix testing (Admin, Member, Anonymous).
- Zero secrets policy enforcement across logs, traces, and fixtures.
