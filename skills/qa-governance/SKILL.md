---
name: qa-governance
title: Enterprise QA Governance & Compliance Policy
category: Governance
author: Principal QA Architect & Systems Staff Engineer
---

# qa-governance — QA Governance & Compliance

Enforces enterprise test standards, compliance controls (SOC 2, ISO 27001, HIPAA, PCI DSS), PII masking, role-based access control (RBAC), and audit log retention.

## 1. Capabilities
- Full audit logging of all test runs, approvals, and self-healing patches.
- PII sanitization in test fixtures and evidence bundles.
- Secret leak prevention: scans test artifacts for authorization tokens and private keys.
- Enforces explicit two-person review for destructive test runs or high-risk actions.
