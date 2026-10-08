import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateEnterpriseTestSuite, GeneratedSuiteReport, GenerationRequest } from '../src/generator-agent';

const CRITERIA = [
  'checkout completes within 3 seconds',
  'duplicate submits return idempotent response',
];

function generate(overrides: Partial<GenerationRequest> = {}): GeneratedSuiteReport {
  return generateEnterpriseTestSuite({
    featureTitle: 'Checkout Flow',
    acceptanceCriteria: CRITERIA,
    ...overrides,
  });
}

test('seed is propagated verbatim into the report (string)', () => {
  const report = generate({ seed: 'release-2026-10-08' });
  assert.equal(report.seed, 'release-2026-10-08');
  assert.match(report.specFileContent, /Seed: release-2026-10-08/, 'spec content must record the seed (Golden Rule 12)');
});

test('seed is propagated verbatim into the report (number, type preserved)', () => {
  const report = generate({ seed: 42 });
  assert.strictEqual(report.seed, 42, 'numeric seed must not be stringified in the report');
  assert.match(report.specFileContent, /Seed: 42/);
});

test('absent seed is reported honestly as undefined while the spec still records the derived tag', () => {
  const report = generate({ seed: undefined });
  assert.equal(report.seed, undefined, 'report must not invent a seed the caller never gave');
  assert.match(report.specFileContent, /Seed: seed-\d+/, 'derived reproducibility tag still recorded in spec');
});

test('every generated case traces to a real acceptance criterion (tracesTo)', () => {
  const report = generate({ seed: 'trace-check' });
  assert.ok(report.testCases.length > 0, 'criteria in → cases out');
  for (const tc of report.testCases) {
    assert.ok(
      CRITERIA.includes(tc.tracesTo),
      `tracesTo "${tc.tracesTo}" must be one of the input criteria`,
    );
    assert.equal(typeof tc.code, 'string');
    assert.ok(tc.code.length > 0);
  }
  assert.deepEqual(report.uncoveredCriteria, [], 'criteria covered by the heuristics must not be reported uncovered');
  // IDs are unique and sequential.
  const ids = report.testCases.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, 'case ids must be unique');
  assert.equal(ids[0], 'TC-01');
});

test('pyramid distribution is computed from the emitted cases, not invented', () => {
  const report = generate({ seed: 'pyramid-check' });
  const { unit, integration, e2e } = report.pyramidDistribution;
  assert.equal(unit + integration + e2e, report.testCases.length, 'distribution must sum to the case count');
  assert.equal(unit, report.testCases.filter((t) => t.layer === 'unit').length);
  assert.equal(integration, report.testCases.filter((t) => t.layer === 'integration').length);
  assert.equal(e2e, report.testCases.filter((t) => t.layer === 'e2e').length);
});

test('same seed produces byte-identical suites (reproducibility)', () => {
  const a = generate({ seed: 'deterministic-1' });
  const b = generate({ seed: 'deterministic-1' });
  assert.deepEqual(a.testCases, b.testCases);
  assert.equal(a.specFileContent, b.specFileContent);
  assert.deepEqual(a.pyramidDistribution, b.pyramidDistribution);
});

test('different seeds produce different embedded tags (seeds are not ignored)', () => {
  const a = generate({ seed: 'seed-a' });
  const b = generate({ seed: 'seed-b' });
  assert.notEqual(a.specFileContent, b.specFileContent);
});

test('empty criteria → honest empty state, zero invented cases', () => {
  const report = generate({ acceptanceCriteria: [], seed: 'empty-check' });
  assert.equal(report.testCases.length, 0);
  assert.deepEqual(report.pyramidDistribution, { unit: 0, integration: 0, e2e: 0 });
  assert.deepEqual(report.uncoveredCriteria, []);
  assert.match(report.specFileContent, /no cases generated/);
  assert.equal(report.seed, 'empty-check', 'seed still propagates on the empty path');
});

test('whitespace-only criteria are filtered, not turned into cases', () => {
  const report = generate({ acceptanceCriteria: ['  ', '', CRITERIA[0] as string], seed: 'ws-check' });
  assert.ok(report.testCases.length > 0);
  for (const tc of report.testCases) {
    assert.equal(tc.tracesTo, CRITERIA[0]);
  }
});
