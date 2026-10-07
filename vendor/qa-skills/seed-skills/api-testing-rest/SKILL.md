---
name: api-testing-rest
title: REST & GraphQL API Testing Patterns
category: API & Contract
testingTypes:
  - API
  - Contract
  - Integration
frameworks:
  - Vitest
  - Supertest
  - Playwright API
  - REST Assured
languages:
  - TypeScript
  - JavaScript
  - Python
  - Java
author: Pramod Dutta (QASkills.sh)
---

# REST & GraphQL API Testing Patterns

Standardized API validation mental model for AI coding agents. Focuses on contract integrity, schema validation, and complete status-code coverage.

## Core Mental Model

1. **The PayloadManager Pattern**:
   - Never hardcode raw request payloads inline across multiple tests.
   - Use factory functions or builder patterns (`createOrderPayload({ status: 'pending' })`) to produce dynamic, timestamped payloads.
   - Decouples test data creation from test execution logic.

2. **Strict Schema & Contract Validation**:
   - Verifying HTTP 200 is necessary but insufficient.
   - Validate response shape using Zod, Joi, or JSON Schema on EVERY response.
   - Catch breaking field renames or type mismatches before they cause runtime regressions.

3. **Status Code Matrix Coverage**:
   - Every endpoint must be tested across the complete status spectrum:
     - `200 / 201`: Valid request & entity creation.
     - `400`: Malformed body, missing required fields.
     - `401`: Missing or expired Bearer token.
     - `403`: Valid token but insufficient role/permissions.
     - `404`: Non-existent entity ID.
     - `409`: Unique constraint conflict (e.g. duplicate email).
     - `422`: Semantic validation failure (e.g. invalid date range).
     - `429`: Rate limit exhaustion.

4. **Idempotency & Clean Teardown**:
   - Write tests so that `POST` entities are cleaned up via `DELETE` in `afterEach` or transactional rollbacks.
   - Tests must pass regardless of execution order.

## Pattern Implementation

```typescript
import { test, expect } from 'vitest';
import request from 'supertest';
import { z } from 'zod';
import { app } from '../src/app';

const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'member']),
  createdAt: z.string().datetime(),
});

test.describe('POST /api/v1/users', () => {
  test('creates new user and returns matching schema (201)', async () => {
    const payload = {
      email: `user_${Date.now()}@test.com`,
      role: 'member',
    };

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', 'Bearer test-token')
      .send(payload)
      .expect(201);

    // Schema assertion
    const parsed = UserResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    expect(res.body.email).toBe(payload.email);
  });

  test('rejects missing email with structured 400 error', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', 'Bearer test-token')
      .send({ role: 'member' })
      .expect(400);

    expect(res.body.error).toMatch(/email is required/i);
  });
});
```
