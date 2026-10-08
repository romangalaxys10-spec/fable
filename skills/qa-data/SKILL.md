---
name: qa-data
title: Test Data Engineering & Factories
category: Data Engineering
author: Principal QA Architect & Systems Staff Engineer
---

# qa-data — Test Data Engineering & Factories

Provides robust test data management: dynamic factories, builders, deterministic seeds, unique identity tagging, PII masking, and isolated transactional cleanup.

## 1. Capabilities
- Elimination of hardcoded test payloads and shared state collisions.
- Dynamic factories generating valid, timestamped, schema-compliant entities.
- Automatic registration of teardown hooks to delete test entities upon completion.
- Masking and anonymization of production database dumps used in staging.
