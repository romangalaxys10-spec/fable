import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DecisionEngine,
  HeuristicScorer,
  LayaBridgeScorer,
  RouteStats,
  ScorerRegistry,
  SystemOneHarness,
  fableRouteTargets,
} from '../src/index';

const STATE = 'audit the checkout flow of a payments web app after a failed release';

test('HeuristicScorer answers noul questions with calibrated, evidence-backed values', async () => {
  const scorer = new HeuristicScorer();
  const [result] = await scorer.evaluate(STATE, [
    {
      name: 'is_qa_task',
      question: {
        type: 'noul',
        instructions: 'the task concerns software testing, quality assurance, or release verification',
        keywords: ['test', 'qa', 'release', 'checkout'],
        negativeKeywords: ['recipe', 'gardening'],
      },
    },
  ]);
  assert.equal(result.kind, 'noul');
  assert.equal(result.answer.type, 'noul');
  if (result.answer.type !== 'noul') return;
  assert.ok(result.answer.noul > 0.5, `noul should be high for on-topic state, got ${result.answer.noul}`);
  assert.ok(result.answer.confidence > 0 && result.answer.confidence <= 0.97);
  assert.ok(result.answer.evidence.matches.length > 0, 'evidence must cite matched anchors');
});

test('HeuristicScorer prefers the option whose description matches the state', async () => {
  const scorer = new HeuristicScorer();
  const [result] = await scorer.evaluate(STATE, [
    {
      name: 'route',
      question: {
        type: 'choice',
        instructions: 'Which engine should own this task?',
        options: [
          { id: 'risk', description: 'score change risk across factors for payment checkout', keywords: ['risk', 'payment', 'checkout'] },
          { id: 'heal', description: 'repair broken locators in drifted tests', keywords: ['heal', 'locator'] },
          { id: 'video', description: 'generate an animated video scene', keywords: ['video', 'animation'] },
        ],
      },
    },
  ]);
  assert.equal(result.answer.type, 'choice');
  if (result.answer.type !== 'choice') return;
  assert.equal(result.answer.selected, 'risk');
  const sum = Object.values(result.answer.probabilities).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 0.01, `probabilities must sum to ~1, got ${sum}`);
  assert.ok(result.answer.confidence > 0.3, `margin-backed confidence expected, got ${result.answer.confidence}`);
});

test('HeuristicScorer score questions produce level + distribution', async () => {
  const scorer = new HeuristicScorer();
  const [result] = await scorer.evaluate('flaky login test fails intermittently on retry, unstable across runs', [
    {
      name: 'flake_level',
      question: {
        type: 'score',
        instructions: 'how flaky is this test',
        levels: ['stable', 'occasional', 'chronic'],
        levelKeywords: [[], ['sometimes'], ['flaky', 'intermittent', 'unstable', 'retry']],
      },
    },
  ]);
  assert.equal(result.answer.type, 'score');
  if (result.answer.type !== 'score') return;
  assert.ok(result.answer.score >= 0 && result.answer.score <= 1);
  const distSum = Object.values(result.answer.distribution).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(distSum - 1) < 0.01, `distribution must sum to ~1, got ${distSum}`);
  assert.equal(result.answer.level, 'chronic');
});

test('LayaBridgeScorer reports honest unavailability off Apple Silicon', () => {
  const bridge = new LayaBridgeScorer(join(tmpdir(), 'definitely-not-laya-vendor'));
  const d = bridge.detect();
  if (process.platform === 'darwin' && process.arch === 'arm64') {
    // On Apple Silicon the honest reason is the missing runtime path.
    assert.equal(d.available, false);
    assert.match(d.reason ?? '', /not found|mlx/);
  } else {
    assert.equal(d.available, false);
    assert.ok(d.reason !== undefined && d.reason.length > 10, 'unavailability must carry a concrete reason');
  }
});

test('ScorerRegistry resolves the available scorer and records the fallback chain', async () => {
  // Force the laya bridge to be preferred — on CI it is unavailable, so the
  // registry must fall back to the heuristic scorer and say so.
  const registry = ScorerRegistry.withDefaults();
  const { scorer, fallbackChain } = registry.resolve('xroutelm/laya-bridge');
  if (!new LayaBridgeScorer().available) {
    assert.equal(scorer.id, 'xroutelm/heuristic');
    assert.ok(fallbackChain.length >= 1, 'fallback chain must record the unavailable bridge');
    assert.match(fallbackChain[0] ?? '', /unavailable/);
  }
  const results = await scorer.evaluate(STATE, [{ name: 'q', question: { type: 'noul', instructions: 'test' } }]);
  assert.equal(results.length, 1);
});

test('DecisionEngine routes to the best target and journals the decision', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'xroutelm-journal-'));
  const journal = join(dir, 'decisions.jsonl');
  const engine = new DecisionEngine(new ScorerRegistry([new HeuristicScorer()]), journal);
  const decision = await engine.route(STATE, fableRouteTargets());
  assert.equal(decision.label, 'INFERRED');
  assert.ok(fableRouteTargets().some((t) => t.id === decision.target), `target ${decision.target} must be a registered route target`);
  assert.ok(decision.confidence > 0);
  assert.ok(decision.fallback.length === fableRouteTargets().length - 1);
  const lines = readFileSync(journal, 'utf8').trim().split('\n');
  assert.equal(lines.length, 1);
  const rec = JSON.parse(lines[0]) as { kind: string; stateHash: string; statePreview: string };
  assert.equal(rec.kind, 'route');
  assert.equal(rec.stateHash, engine.stateHash(STATE));
  assert.ok(rec.statePreview.length <= 80);
  rmSync(dir, { recursive: true, force: true });
});

test('stateHash is deterministic FNV-1a', () => {
  const engine = new DecisionEngine(new ScorerRegistry([new HeuristicScorer()]));
  assert.equal(engine.stateHash('hello'), engine.stateHash('hello'));
  assert.notEqual(engine.stateHash('hello'), engine.stateHash('hellp'));
  assert.equal(engine.stateHash('hello'), '4f9f2cab');
});

test('RouteStats learns from recorded outcomes and reorders targets', () => {
  const dir = mkdtempSync(join(tmpdir(), 'xroutelm-stats-'));
  const statsPath = join(dir, 'route-stats.jsonl');
  const stats = new RouteStats(statsPath);
  assert.equal(stats.rates().size, 0, 'no data before any run — honest empty state');

  // qa-failure-triage: 8/10 success → promoted (>= 0.7).
  for (let i = 0; i < 8; i++) stats.record('qa-failure-triage', true, 'clustered');
  for (let i = 0; i < 2; i++) stats.record('qa-failure-triage', false, 'unclassified');
  // qa-test-healing: 2/10 success → demoted (< 0.3).
  for (let i = 0; i < 2; i++) stats.record('qa-test-healing', true, 'healed');
  for (let i = 0; i < 8; i++) stats.record('qa-test-healing', false, 'no candidate');

  const rates = stats.rates();
  assert.ok(Math.abs((rates.get('qa-failure-triage')?.rate ?? 0) - 0.8) < 1e-9);
  assert.equal(rates.get('qa-test-healing')?.samples, 10);

  const targets = fableRouteTargets();
  const reordered = stats.apply(targets);
  const idx = (id: string): number => reordered.findIndex((t) => t.id === id);
  assert.ok(idx('qa-failure-triage') < targets.findIndex((t) => t.id === 'qa-failure-triage'), 'high-success target must be promoted');
  assert.ok(idx('qa-test-healing') > targets.findIndex((t) => t.id === 'qa-test-healing'), 'low-success target must be demoted');
  rmSync(dir, { recursive: true, force: true });
});

test('SystemOneHarness gates on noul threshold and routes models with fallback', async () => {
  const engine = new DecisionEngine(new ScorerRegistry([new HeuristicScorer()]));
  const harness = new SystemOneHarness(engine);

  const onTopic = await harness.gate(STATE, [
    { name: 'is_actionable', question: { type: 'noul', instructions: 'the state describes a concrete engineering task', keywords: ['audit', 'checkout', 'release', 'payments'] } },
  ]);
  assert.equal(onTopic.proceed, true);
  assert.match(onTopic.reasons[0] ?? '', /pass/);

  const offTopic = await harness.gate('a pleasant afternoon in the garden', [
    { name: 'is_actionable', question: { type: 'noul', instructions: 'the state describes a concrete engineering task', keywords: ['audit', 'checkout', 'release'] } },
  ]);
  assert.equal(offTopic.proceed, false, 'below-threshold noul must block');
  assert.match(offTopic.reasons[0] ?? '', /block/);

  const routed = await harness.routeModel(STATE, {
    choices: [
      { id: 'strong-model', criteria: 'multi-file refactors, architecture work, security review', keywords: ['architecture', 'security', 'refactor'] },
      { id: 'fast-model', criteria: 'simple edits, formatting, single-file fixes' },
    ],
    minConfidence: 0.9, // unreachable → forces the documented fallback path
    fallback: 'fast-model',
  });
  assert.equal(routed.model, 'fast-model');
  assert.equal(routed.usedFallback, true);
});
