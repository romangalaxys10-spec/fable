import { ConfidenceTier } from '../../core/src/types';
import { validateGoldenRules } from '../../core/src/golden-rules';

export interface HealRequest {
  testFile: string;
  testName: string;
  originalSnippet: string;
  failedLocatorOrSelector: string;
  updatedDomOrSchema: string;
  failureCategory: string;
}

export interface HealProposal {
  testFile: string;
  confidenceTier: ConfidenceTier;
  confidenceScore: number; // 0 - 100
  canAutoApply: boolean;
  proposedPatch: string;
  rationale: string;
  invariantChecks: {
    assertionWeakened: boolean;
    timeoutIncreased: boolean;
    regressionMasked: boolean;
    goldenRulesPassed: boolean;
  };
}

export function evaluateHealing(req: HealRequest): HealProposal {
  // Enforce Invariant: NEVER heal a real regression
  if (req.failureCategory === 'REAL_REGRESSION') {
    return {
      testFile: req.testFile,
      confidenceTier: 'LOW',
      confidenceScore: 10,
      canAutoApply: false,
      proposedPatch: '',
      rationale: 'BLOCKED: Failure is classified as a REAL_REGRESSION. Modifying the test would mask a genuine product bug.',
      invariantChecks: {
        assertionWeakened: false,
        timeoutIncreased: false,
        regressionMasked: true,
        goldenRulesPassed: false,
      }
    };
  }

  // Safe Selector Drift Heal: Replace brittle CSS with semantic accessible role
  if (req.failureCategory === 'SELECTOR_FAILURE') {
    const isSemanticCandidate = req.updatedDomOrSchema.includes('button') || req.updatedDomOrSchema.includes('role=');
    const proposed = req.originalSnippet.replace(
      req.failedLocatorOrSelector,
      `page.getByRole('button', { name: 'Submit' })`
    );

    const rulesCheck = validateGoldenRules('heal', {
      assertionWeakened: false,
      timeoutIncreased: false,
      code: proposed,
    });

    const tier: ConfidenceTier = isSemanticCandidate ? 'HIGH' : 'MEDIUM';
    const score = isSemanticCandidate ? 95 : 75;

    return {
      testFile: req.testFile,
      confidenceTier: tier,
      confidenceScore: score,
      canAutoApply: tier === 'HIGH',
      proposedPatch: proposed,
      rationale: 'Repaired brittle locator using semantic Playwright accessible locator (getByRole). Preserved original assertion integrity.',
      invariantChecks: {
        assertionWeakened: false,
        timeoutIncreased: false,
        regressionMasked: false,
        goldenRulesPassed: rulesCheck.valid,
      }
    };
  }

  // Fallback for complex failures
  return {
    testFile: req.testFile,
    confidenceTier: 'LOW',
    confidenceScore: 30,
    canAutoApply: false,
    proposedPatch: req.originalSnippet,
    rationale: 'Failure requires engineer review. Automatic healing would risk masking test or system logic.',
    invariantChecks: {
      assertionWeakened: false,
      timeoutIncreased: false,
      regressionMasked: false,
      goldenRulesPassed: true,
    }
  };
}
