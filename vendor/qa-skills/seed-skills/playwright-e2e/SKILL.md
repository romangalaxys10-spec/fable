---
name: playwright-e2e
title: Playwright End-to-End Testing Patterns
category: Automation
testingTypes:
  - E2E
  - UI
  - Visual Regression
frameworks:
  - Playwright
languages:
  - TypeScript
  - JavaScript
  - Python
author: Pramod Dutta (QASkills.sh)
---

# Playwright E2E Testing Patterns

Expert-level Playwright testing instructions for AI coding agents. Focuses on robust, maintainable, flake-free browser automation.

## Core Mental Model

1. **Auto-Waiting Over Arbitrary Sleeps**:
   - 🚫 NEVER use `page.waitForTimeout()`, `time.sleep()`, or fixed delays. Arbitrary sleeps are the #1 cause of flaky tests.
   - ✅ Rely on Playwright's built-in auto-waiting (`click`, `fill`, `check` auto-wait for actionability).
   - ✅ Use web-first assertions: `await expect(locator).toBeVisible()`, `await expect(locator).toHaveText()`.

2. **User-Centric Locators**:
   - Order of locator preference:
     1. `page.getByRole('button', { name: 'Submit' })` (Accessible, mirrors real user actions)
     2. `page.getByLabel('Username')`
     3. `page.getByPlaceholder('Enter your email')`
     4. `page.getByText('Welcome back')`
     5. `page.getByTestId('checkout-btn')` (When role/label is ambiguous)
   - 🚫 NEVER use brittle XPath or deep CSS selectors (`div > div:nth-child(3) > span`).

3. **Page Object Model (POM) Discipline**:
   - Separate locator definitions and user interactions from test assertions.
   - Each Page Object encapsulates one cohesive page or modal.
   - Return clean action promises; perform assertions in the test spec, not inside the Page Object.

4. **Network Interception & Deterministic State**:
   - Use `page.route('**/api/v1/orders', async (route) => { ... })` to mock flaky third-party APIs.
   - Use `page.waitForResponse()` to synchronize on network calls rather than UI guesses.

## Pattern Implementation

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('Authentication Flow', () => {
  test('User successfully logs in with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('developer@example.com', 'SecurePass123!');

    // Web-first assertion
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Shows validation error when password is empty', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.submitWithCredentials('developer@example.com', '');

    await expect(page.getByRole('alert')).toHaveText(/password is required/i);
  });
});
```

## Anti-Patterns to Avoid

- ❌ Hardcoding credentials or environment URLs. Use environment variables.
- ❌ Sharing state across tests. Every test must run in a clean browser context.
- ❌ Testing third-party services (Stripe, Google OAuth) directly in E2E runs; stub them with `page.route()`.
