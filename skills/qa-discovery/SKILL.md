---
name: qa-discovery
title: Repository Discovery & QA Inventory
category: Discovery
author: Principal QA Architect & Systems Staff Engineer
---

# qa-discovery — Repository Discovery & Inventory

Inspects an unfamiliar codebase to discover frameworks, test suites, API routes, database schemas, CI pipelines, and existing test inventory.

## 1. Purpose
Builds the foundational `QAContextModel` before any planning or test generation begins.

## 2. When to Activate
- Initial project onboarding or when running `qa discover`.
- First step of repository audit.

## 3. Workflow
1. Detect runtime and language (Node, Python, Go, Java).
2. Enumerate installed test runners (Playwright, Vitest, Jest, Cypress, Pytest, k6).
3. Map API route definitions and public endpoints.
4. Discover existing test files and calculate current pyramid ratio.
5. Identify gaps in test fixtures, factories, and deterministic seeds.

## 4. Output Contract
Emits populated `QAContextModel` matching `packages/core/src/context.ts`.
