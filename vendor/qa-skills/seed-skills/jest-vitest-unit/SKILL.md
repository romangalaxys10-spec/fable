---
name: jest-vitest-unit
title: Unit Testing & Boundary Value Analysis Patterns
category: Unit & Foundation
testingTypes:
  - Unit
  - Property-Based
frameworks:
  - Vitest
  - Jest
languages:
  - TypeScript
  - JavaScript
author: Pramod Dutta (QASkills.sh)
---

# Unit Testing & Boundary Value Analysis Patterns

Core foundational unit testing methodology for AI coding agents. Focuses on exhaustive edge-case coverage and boundary partitioning.

## Core Mental Model

1. **Equivalence Partitioning & Boundary Value Analysis (BVA)**:
   - For every input range `[min, max]`, systematically test:
     - `min - 1` (Invalid lower boundary)
     - `min` (Valid lower boundary)
     - `min + 1` (Valid nominal lower)
     - `nominal` (Normal happy path value)
     - `max - 1` (Valid nominal upper)
     - `max` (Valid upper boundary)
     - `max + 1` (Invalid upper boundary)
   - Null, undefined, empty array `[]`, empty string `""`, zero `0`, negative numbers, NaN.

2. **AAA Pattern (Arrange, Act, Assert)**:
   - Keep sections visually separated by a single newline.
   - One primary assertion focus per unit test.

3. **Deterministic Timers & Zero Leakage**:
   - Never wait for real wall-clock timeouts in unit tests.
   - Use `vi.useFakeTimers()` and `vi.advanceTimersByTime(ms)`.
   - Restore mocks after each test: `afterEach(() => { vi.restoreAllMocks(); });`.

## Pattern Implementation

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculateDiscount } from '../src/discount';

describe('calculateDiscount()', () => {
  // Boundary tests for tier discount percentage
  it('returns 0% discount for orders under $50 (boundary: $49.99)', () => {
    expect(calculateDiscount(49.99)).toBe(0);
  });

  it('applies 10% discount exactly at $50 threshold (boundary: $50.00)', () => {
    expect(calculateDiscount(50.00)).toBe(5.00);
  });

  it('throws ValidationError when order amount is negative', () => {
    expect(() => calculateDiscount(-1)).toThrowError(/amount must be positive/i);
  });
});
```
