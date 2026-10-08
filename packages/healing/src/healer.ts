import { ConfidenceTier } from '../../core/src/types';
import { createHash } from 'node:crypto';
import { validateGoldenRules } from '../../core/src/golden-rules';

/**
 * Confidence-tiered self-healing — with verification.
 *
 * REPLACES the previous implementation, which replaced ANY failed selector
 * with a hardcoded `page.getByRole('button', { name: 'Submit' })` and never
 * checked whether the patch worked. Healing without re-verification is
 * guessing with a diff attached.
 *
 * The engine now:
 *   1. extracts real locator candidates from the DOM/aria snapshot;
 *   2. ranks them by an evidence-based ordering (semantic role > test id >
 *      label > text > attribute/CSS), scoring each from match quality;
 *   3. synthesizes a patch per candidate;
 *   4. ONLY marks a proposal `applied` when the caller-supplied `rerun`
 *      callback actually re-executes the test and it passes with the
 *      assertion strength preserved — otherwise it stays a `proposed`
 *      patch for human review.
 *
 * Invariants (unchanged, still enforced): never heal REAL_REGRESSION, never
 * weaken assertions, never heal by timeout inflation.
 */

export interface HealRequest {
  testFile: string;
  testName: string;
  originalSnippet: string;
  failedLocatorOrSelector: string;
  /** The current DOM/aria snapshot region around the failed interaction. */
  updatedDomOrSchema: string;
  failureCategory: string;
  /**
   * REAL verification hook. When provided and the tier is HIGH, the engine
   * re-runs the test through this callback and only reports `applied` when
   * the run passes. Absent callback → every patch stays `proposed`.
   */
  rerun?: (patchedSnippet: string) => Promise<boolean> | boolean;
}

export interface HealCandidate {
  locator: string;
  strategy: 'getByRole' | 'getByTestId' | 'getByLabel' | 'getByText' | 'getByPlaceholder' | 'attribute';
  score: number;
  why: string;
}

export interface HealProposal {
  testFile: string;
  testName: string;
  confidenceTier: ConfidenceTier;
  confidenceScore: number; // 0 - 100, derived from evidence (never a constant)
  /** applied only after a passing re-run; otherwise proposed. */
  status: 'blocked' | 'proposed' | 'applied';
  proposedPatch: string;
  candidates: HealCandidate[];
  rationale: string;
  invariantChecks: {
    assertionWeakened: boolean;
    timeoutIncreased: boolean;
    regressionMasked: boolean;
    goldenRulesPassed: boolean;
    verifiedByRerun: boolean;
  };
}

const ARIA_LINE = /^\s*[-•]\s*([a-zA-Z0-9_]+)(?:\s+"([^"]*)")?/;

/**
 * Extract ranked locator candidates from a real aria/DOM snapshot.
 * Evidence comes from the snapshot text; the function never invents roles
 * or names it did not observe.
 */
export function rankCandidates(snapshot: string, failedSelector: string): HealCandidate[] {
  const candidates: HealCandidate[] = [];
  const failedName = /["'#.]([A-Za-z0-9_-]{3,})/.exec(failedSelector)?.[1]?.toLowerCase() ?? '';

  for (const rawLine of snapshot.split('\n')) {
    const m = ARIA_LINE.exec(rawLine);
    if (m === null) continue;
    const role = m[1] ?? '';
    const name = m[2] ?? '';
    if (!role) continue;
    const nameMatch = failedName !== '' && name !== '' && (name.toLowerCase().includes(failedName) || failedName.includes(name.toLowerCase()));
    const score = (isInteractiveRole(role) ? 60 : 30) + (name !== '' ? 25 : 0) + (nameMatch ? 15 : 0);
    candidates.push({
      locator: name !== '' ? `page.getByRole('${role}', { name: '${name.replace(/'/g, "\\'")}' })` : `page.getByRole('${role}')`,
      strategy: 'getByRole',
      score,
      why: `aria snapshot line observed: role=${role}${name !== '' ? `, name="${name}"` : ''}${nameMatch ? ' (name aligns with failed selector)' : ''}`,
    });
  }

  // data-testid anchors observed in the snapshot.
  for (const m of snapshot.matchAll(/data-testid=["']?([A-Za-z0-9_-]+)/g)) {
    const id = m[1] ?? '';
    const aligned = failedName !== '' && id.toLowerCase().includes(failedName);
    candidates.push({
      locator: `page.getByTestId('${id}')`,
      strategy: 'getByTestId',
      score: 70 + (aligned ? 20 : 0),
      why: `data-testid="${id}" observed in snapshot${aligned ? ' (aligned with failed selector)' : ''}`,
    });
  }

  // Labelled inputs observed in the snapshot.
  for (const m of snapshot.matchAll(/<label[^>]*for=["']?([A-Za-z0-9_-]+)/g)) {
    const forId = m[1] ?? '';
    candidates.push({
      locator: `page.getByLabel('${forId}')`,
      strategy: 'getByLabel',
      score: 55,
      why: `label[for="${forId}"] observed in snapshot`,
    });
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 5);
}

function isInteractiveRole(role: string): boolean {
  return ['button', 'link', 'textbox', 'checkbox', 'radio', 'combobox', 'slider', 'tab', 'menuitem', 'option', 'switch'].includes(role);
}

function assertStrengthPreserved(original: string, patched: string): boolean {
  const strength = [
    /toBe\(/, /toEqual\(/, /toStrictEqual\(/, /toHaveText\(/, /toContainText\(/,
    /toBeVisible\(/, /toHaveValue\(/, /toHaveCount\(/, /toBeEnabled\(/, /toBeChecked\(/,
  ];
  const originalHas = strength.some((re) => re.test(original));
  const patchedHas = strength.some((re) => re.test(patched));
  // Weakening = the original asserted something strong and the patch no longer does.
  return !originalHas || patchedHas;
}

function timeoutInflated(patched: string): boolean {
  return /timeout:\s*\d{4,}/.test(patched) || /waitForTimeout/.test(patched);
}

export async function evaluateHealing(req: HealRequest): Promise<HealProposal> {
  const base = {
    testFile: req.testFile,
    testName: req.testName,
  };

  // Invariant: never heal a real regression.
  if (req.failureCategory === 'REAL_REGRESSION') {
    return {
      ...base,
      confidenceTier: 'LOW',
      confidenceScore: 10,
      status: 'blocked',
      proposedPatch: '',
      candidates: [],
      rationale: 'BLOCKED: failure classified as REAL_REGRESSION. Modifying the test would mask a genuine product bug.',
      invariantChecks: { assertionWeakened: false, timeoutIncreased: false, regressionMasked: true, goldenRulesPassed: false, verifiedByRerun: false },
    };
  }

  if (req.failureCategory !== 'SELECTOR_FAILURE') {
    return {
      ...base,
      confidenceTier: 'LOW',
      confidenceScore: 30,
      status: 'proposed',
      proposedPatch: req.originalSnippet,
      candidates: [],
      rationale: `Failure category ${req.failureCategory} is not a selector drift — automatic healing risks masking test or system logic. Engineer review required.`,
      invariantChecks: { assertionWeakened: false, timeoutIncreased: false, regressionMasked: false, goldenRulesPassed: true, verifiedByRerun: false },
    };
  }

  // Rank real candidates from the observed snapshot.
  const candidates = rankCandidates(req.updatedDomOrSchema, req.failedLocatorOrSelector);
  if (candidates.length === 0) {
    return {
      ...base,
      confidenceTier: 'LOW',
      confidenceScore: 20,
      status: 'proposed',
      proposedPatch: req.originalSnippet,
      candidates: [],
      rationale: 'No locator candidates observed in the provided DOM/aria snapshot — nothing to rank, so nothing is proposed. Provide the current snapshot region for the failed interaction.',
      invariantChecks: { assertionWeakened: false, timeoutIncreased: false, regressionMasked: false, goldenRulesPassed: true, verifiedByRerun: false },
    };
  }

  const best = candidates[0] as HealCandidate;
  const proposed = req.originalSnippet.replace(req.failedLocatorOrSelector, best.locator);
  const assertionOk = assertStrengthPreserved(req.originalSnippet, proposed);
  const timeoutOk = !timeoutInflated(proposed);
  // Golden-rule seed: deterministic per (test, failed selector, snapshot) so a
  // heal run is reproducible — the rules engine rejects seedless heal payloads.
  const seed = createHash('sha256')
    .update(`${req.testFile}::${req.testName}::${req.failedLocatorOrSelector}::${req.updatedDomOrSchema}`)
    .digest('hex').slice(0, 16);
  const rulesCheck = validateGoldenRules('heal', {
    assertionWeakened: !assertionOk,
    timeoutIncreased: !timeoutOk,
    code: proposed,
    failureCategory: req.failureCategory,
    explanation: best.why,
    seed,
  });

  // Confidence is derived: candidate evidence score + assertion-preservation,
  // never a hardcoded constant.
  let score = Math.min(95, Math.round(best.score * 0.8) + (assertionOk ? 15 : 0));
  let tier: ConfidenceTier = score >= 85 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW';

  let status: HealProposal['status'] = 'proposed';
  let verifiedByRerun = false;
  let rationale = `Top candidate from ${candidates.length} ranked: ${best.locator} (${best.strategy}, evidence score ${best.score}). ${best.why}.`;

  if (!assertionOk || !timeoutOk || !rulesCheck.valid) {
    score = Math.min(score, 55);
    tier = 'LOW';
    rationale += ' Patch held for review: golden-rule checks flagged assertion or timeout changes.';
  } else if (req.rerun !== undefined && tier === 'HIGH') {
    // REAL verification: the patch is applied only when the re-run passes.
    try {
      const passed = await req.rerun(proposed);
      verifiedByRerun = passed;
      status = passed ? 'applied' : 'proposed';
      rationale += passed
        ? ' Re-run verification PASSED with assertions intact — patch applied.'
        : ' Re-run verification FAILED — patch demoted to proposal for engineer review (no masking).';
      if (!passed) tier = 'MEDIUM';
    } catch (e) {
      rationale += ` Re-run verification errored (${(e as Error).message}) — patch demoted to proposal.`;
      tier = 'MEDIUM';
    }
  } else if (req.rerun === undefined) {
    rationale += ' No rerun callback provided — patch remains a proposal (never applied unverified).';
  }

  return {
    ...base,
    confidenceTier: tier,
    confidenceScore: score,
    status,
    proposedPatch: proposed,
    candidates,
    rationale,
    invariantChecks: {
      assertionWeakened: !assertionOk,
      timeoutIncreased: !timeoutOk,
      regressionMasked: false,
      goldenRulesPassed: rulesCheck.valid,
      verifiedByRerun,
    },
  };
}
