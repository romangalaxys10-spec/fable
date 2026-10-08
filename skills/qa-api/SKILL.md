---
name: qa-api
title: REST & GraphQL API Integration Testing
category: API Testing
author: Principal QA Architect & Systems Staff Engineer
---

# qa-api — REST & GraphQL API Testing

Validates backend routes, contract envelopes, status code matrices (200, 201, 400, 401, 403, 404, 409, 422, 429), and strict schema serialization.

## 1. Capabilities
- Automated payload factories using dynamic seeds and UUID tags.
- Schema verification with Zod, Joi, or JSON Schema on 100% of responses.
- Idempotency verification on duplicate POST submissions.
- Teardown hooks guaranteeing zero test database pollution.
