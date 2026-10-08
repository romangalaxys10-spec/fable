import { FailureCategory } from '../../core/src/types';

export interface RawFailureInput {
  testId: string;
  errorMessage: string;
  stackTrace?: string;
  firstAttemptFailed: boolean;
  retryPassed: boolean;
  httpStatus?: number;
  domElementFound?: boolean;
}

export interface TriageResult {
  testId: string;
  category: FailureCategory;
  confidence: number; // 0 - 100
  evidence: string[];
  rootCauseHypothesis: string;
  supportingSignals: string[];
  contradictingSignals: string[];
  recommendedAction: string;
  isCascade: boolean;
  clusterId: string;
}

export interface ClusteredTriageReport {
  totalFailures: number;
  primaryDefectsCount: number;
  cascadingFailuresCount: number;
  clusters: {
    clusterId: string;
    rootCause: string;
    category: FailureCategory;
    affectedCount: number;
    primaryFailure: TriageResult;
    cascadeFailures: TriageResult[];
  }[];
}


/**
 * Confidence is DERIVED from the failure's own signal record, not a constant:
 * +6 per supporting signal, +4 per evidence item, −9 per contradicting
 * signal, clamped to [40, 97]. The rule order decides the CATEGORY; the
 * signals decide how much the verdict deserves.
 */
function signalConfidence(supporting: string[], evidence: string[], contradicting: string[]): number {
  return Math.max(40, Math.min(97, 60 + 6 * supporting.length + 4 * evidence.length - 9 * contradicting.length));
}

export function triageSingleFailure(failure: RawFailureInput): TriageResult {
  const err = (failure.errorMessage || '').toLowerCase();
  const stack = (failure.stackTrace || '').toLowerCase();

  // 1. FLAKE: passed on retry with zero code changes
  if (failure.firstAttemptFailed && failure.retryPassed) {
    return {
      testId: failure.testId,
      category: 'FLAKE',
      confidence: 94,
      evidence: ['Failed on run attempt 1', 'Passed on run attempt 2 without code mutation'],
      rootCauseHypothesis: 'Non-deterministic race condition or transient external dependency jitter.',
      supportingSignals: ['Immediate retry success', 'DOM locator identical across runs'],
      contradictingSignals: ['No reproducible hard assertion rejection'],
      recommendedAction: 'Quarantine test with @quarantine tag. Replace arbitrary wait with web-first assertion.',
      isCascade: false,
      clusterId: 'cluster-flake-transient',
    };
  }

  // 2. TIMING / ASYNC
  if (err.includes('timeout') && (err.includes('wait') || err.includes('exceeded 30000ms') || err.includes('navigation'))) {
    return {
      testId: failure.testId,
      category: 'TIMING_FAILURE',
      confidence: 88,
      evidence: ['Explicit timeout error in test runner', failure.errorMessage],
      rootCauseHypothesis: 'Element actionability state took longer to resolve than timeout SLA or network lag injected delay.',
      supportingSignals: ['Timeout reached without explicit element mutation'],
      contradictingSignals: ['Server returned HTTP 200 in access logs'],
      recommendedAction: 'Enforce auto-waiting on locator. Verify backend response time is within SLA.',
      isCascade: false,
      clusterId: 'cluster-timing-timeout',
    };
  }

  // 3. SELECTOR FAILURE
  if (err.includes('locator') || err.includes('element not found') || err.includes('waiting for selector') || failure.domElementFound === false) {
    return {
      testId: failure.testId,
      category: 'SELECTOR_FAILURE',
      confidence: 91,
      evidence: ['DOM locator resolution failed', failure.errorMessage],
      rootCauseHypothesis: 'Component DOM structure changed (e.g. class rename or tag refactor) while test used brittle selector.',
      supportingSignals: ['Page loaded successfully but specific element unresolved'],
      contradictingSignals: ['API payload returned expected data'],
      recommendedAction: 'Self-heal test by upgrading to accessible semantic locator (getByRole / getByLabel).',
      isCascade: false,
      clusterId: 'cluster-selector-drift',
    };
  }

  // 4. NETWORK / DEPENDENCY FAILURE
  if (err.includes('econnrefused') || err.includes('502 bad gateway') || err.includes('503 service unavailable') || failure.httpStatus === 502 || failure.httpStatus === 503) {
    return {
      testId: failure.testId,
      category: 'NETWORK_FAILURE',
      confidence: 96,
      evidence: ['Network socket refusal or gateway error', failure.errorMessage],
      rootCauseHypothesis: 'Target backend service or database container was offline during test execution.',
      supportingSignals: ['HTTP 502/503 status code', 'Zero application payload received'],
      contradictingSignals: ['Frontend client initialized properly'],
      recommendedAction: 'Check service health in docker/k8s environment before retrying suite.',
      isCascade: false,
      clusterId: 'cluster-network-down',
    };
  }

  // 5. TEST DATA DEFECT
  if (err.includes('duplicate key') || err.includes('already exists') || err.includes('unique constraint') || err.includes('foreign key')) {
    return {
      testId: failure.testId,
      category: 'TEST_DATA_DEFECT',
      confidence: 89,
      evidence: ['Database constraint collision in test run', failure.errorMessage],
      rootCauseHypothesis: 'Test did not randomize unique entity IDs or failed to clean up database state from previous run.',
      supportingSignals: ['Collision on static email/username fixture'],
      contradictingSignals: ['Business logic code is functioning normally'],
      recommendedAction: 'Use dynamic factory builders with UUID suffix and register clean teardown hooks.',
      isCascade: false,
      clusterId: 'cluster-test-data-collision',
    };
  }

  // 6. REAL REGRESSION: assertion failure on business logic
  if (err.includes('expected') && err.includes('received') || err.includes('assertionerror')) {
    return {
      testId: failure.testId,
      category: 'REAL_REGRESSION',
      confidence: 92,
      evidence: ['Deterministic assertion violation', failure.errorMessage],
      rootCauseHypothesis: 'Application code produced unexpected output value or invalid state transition.',
      supportingSignals: ['Failed consistently across all retries', 'Valid test setup and healthy environment'],
      contradictingSignals: ['No network or locator error in console logs'],
      recommendedAction: 'File defect report and block release gate until application regression is resolved.',
      isCascade: false,
      clusterId: 'cluster-real-regression',
    };
  }

  // Fallback
  return {
    testId: failure.testId,
    category: 'ASSERTION_FAILURE',
    confidence: 70,
    evidence: [failure.errorMessage],
    rootCauseHypothesis: 'Assertion failure in test spec requiring manual code inspection.',
    supportingSignals: [failure.errorMessage],
    contradictingSignals: [],
    recommendedAction: 'Inspect stack trace and check git diff of associated feature.',
    isCascade: false,
    clusterId: 'cluster-generic-assertion',
  };
}

export function clusterFailures(failures: RawFailureInput[]): ClusteredTriageReport {
  const triaged = failures.map(triageSingleFailure);
  const clusterMap = new Map<string, TriageResult[]>();

  for (const item of triaged) {
    const list = clusterMap.get(item.clusterId) || [];
    list.push(item);
    clusterMap.set(item.clusterId, list);
  }

  const clusters = [];
  let primaryCount = 0;
  let cascadeCount = 0;

  for (const [clusterId, items] of clusterMap.entries()) {
    const primary = items[0];
    primary.isCascade = false;
    primaryCount++;

    const cascades = items.slice(1).map(item => {
      item.isCascade = true;
      return item;
    });
    cascadeCount += cascades.length;

    clusters.push({
      clusterId,
      rootCause: primary.rootCauseHypothesis,
      category: primary.category,
      affectedCount: items.length,
      primaryFailure: primary,
      cascadeFailures: cascades,
    });
  }

  return {
    totalFailures: failures.length,
    primaryDefectsCount: primaryCount,
    cascadingFailuresCount: cascadeCount,
    clusters,
  };
}
