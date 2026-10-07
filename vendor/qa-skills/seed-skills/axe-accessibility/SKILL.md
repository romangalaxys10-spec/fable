---
name: axe-accessibility
title: Automated Accessibility & WCAG 2.1 AA Auditing
category: Specialized & Compliance
testingTypes:
  - Accessibility
  - a11y
  - Compliance
frameworks:
  - Axe Core
  - Playwright
languages:
  - TypeScript
  - JavaScript
author: Pramod Dutta (QASkills.sh)
---

# Automated Accessibility & WCAG 2.1 AA Auditing

Automated accessibility testing instructions for AI coding agents. Ensures applications are fully accessible to screen readers and keyboard users.

## Core Mental Model

1. **Continuous Axe Integration**:
   - Run `@axe-core/playwright` on all critical route entrypoints.
   - Fail CI when critical or serious accessibility violations are detected.

2. **Keyboard Navigation & Focus Trapping**:
   - Verify all interactive controls are reachable via `Tab` and activatable with `Enter` / `Space`.
   - Modals and dialogs MUST trap focus and release focus back to the triggering element on `Escape`.

3. **ARIA & Contrast Standards**:
   - Buttons without text must possess an `aria-label`.
   - Color contrast ratio must meet 4.5:1 for normal text and 3:1 for large text.

## Pattern Implementation

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Compliance (WCAG 2.1 AA)', () => {
  test('Dashboard page should have zero critical accessibility violations', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast']) // Optional: isolate color if verified separately
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```
