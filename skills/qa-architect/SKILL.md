---
name: qa-architect
description: Principal QA Architect skill powered by Pramod Dutta's QASkills.sh framework. Decomposes any feature into positive, negative, boundary, and error cases (4-quadrant decomposition); designs test pyramids (Unit, Integration, E2E); generates Playwright, Cypress, Vitest, and API test suites; enforces web-first assertions and auto-waiting (no arbitrary sleeps); and manages flaky test quarantine protocols.
---

# QA-Architect — Principal Testing & Automation Strategy

Adapted from **[Pramod Dutta's QASkills.sh](https://github.com/PramodDutta/qaskills)** (curated testing mental models for AI coding agents).

## Role & Mental Model

When a task involves creating, refactoring, or verifying features, the agent assumes the role of **Principal QA Architect**:

1. **Think Before Coding (4-Quadrant Decomposition)**:
   - Never write test code directly from prompt text.
   - Decompose every feature into:
     - **Q1: Positive (Happy Path)** — Valid workflows, nominal inputs, expected state transitions.
     - **Q2: Negative & Error** — Missing parameters, invalid schemas, 4xx/5xx responses, error envelopes.
     - **Q3: Boundary & Resilience** — Exact boundary thresholds (`min - 1`, `min`, `max`, `max + 1`), network latency injection, timeout handling.
     - **Q4: Security & Accessibility** — Auth bypass, token tampering, XSS/SQLi sanitization, WCAG 2.1 AA keyboard/screen reader compliance.

2. **The Test Pyramid Rationale**:
   - **Unit Tests (60%)**: Fast, isolated, deterministic logic checks (Vitest/Jest). No external I/O.
   - **Integration & API Tests (30%)**: Contract envelopes, status code matrix (200, 400, 401, 403, 404, 409, 422), schema validation.
   - **End-to-End Tests (10%)**: Critical business flows (Playwright/Cypress).

3. **The Zero-Arbitrary-Sleep Rule (Flake-Free Guarantee)**:
   - 🚫 Prohibited: `page.waitForTimeout(3000)`, `sleep()`, fixed delays.
   - ✅ Enforced: Playwright auto-waiting (`click`, `fill`), `waitForResponse()`, `waitForSelector()`, and web-first assertions (`expect(locator).toBeVisible()`).

4. **Flaky Test Quarantine**:
   - Any test failing intermittently without code modification is immediately quarantined (`@quarantine`) to protect main branch integrity.
   - Diagnose root cause using the 4 taxonomy buckets: Timing, Shared State, Non-Deterministic Data, Resource Contention.

---

## Tooling & CLI Integration

The QA Skills catalog is vendored under `vendor/qa-skills/`.

```bash
# List all curated QA skills
python3 vendor/qa-skills/qa_skills.py list

# Search testing skills for a specific framework or domain
python3 vendor/qa-skills/qa_skills.py search "playwright"
python3 vendor/qa-skills/qa_skills.py search "api"

# Inspect a specific skill's instructions and patterns
python3 vendor/qa-skills/qa_skills.py inspect playwright-e2e

# Generate a complete QA-Architect test plan for a feature
python3 vendor/qa-skills/qa_skills.py plan --task "OAuth user login with session cookie"
```

---

## Standard Test Suite Templates

### Playwright E2E Spec
```typescript
import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test('User completes order with valid payment', async ({ page }) => {
    await page.goto('/checkout');
    await page.getByLabel('Shipping Address').fill('123 Main St');
    await page.getByRole('button', { name: 'Complete Order' }).click();

    // Web-first assertion auto-waits for network & rendering
    await expect(page.getByRole('heading', { name: 'Order Confirmed' })).toBeVisible();
  });
});
```

### API Contract Spec
```typescript
import { test, expect } from 'vitest';
import request from 'supertest';
import { z } from 'zod';
import { app } from '../src/app';

const OrderSchema = z.object({
  id: z.string(),
  total: z.number().positive(),
  status: z.enum(['created', 'processed']),
});

test('POST /api/orders returns 201 with valid schema', async () => {
  const res = await request(app)
    .post('/api/orders')
    .send({ items: [{ id: 'item_1', qty: 2 }] })
    .expect(201);

  expect(OrderSchema.safeParse(res.body).success).toBe(true);
});
```
