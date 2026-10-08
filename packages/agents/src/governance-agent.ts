import { ReleaseGateVerdict } from '../../core/src/types';
import { validateGoldenRules, GOLDEN_RULES } from '../../core/src/golden-rules';

export interface ReleaseEvaluationInput {
  testsPassed: number;
  testsFailed: number;
  unresolvedP0Defects: number;
  flakyTestsCount: number;
  lineCoveragePercent: number;
  riskScore: number;
  securityVulnerabilities: number;
  wcagAxeViolations: number;
  /** Retry count attached to the failing tests — masking detection needs it. */
  maxRetriesOnFailures?: number;
  /** Failure category for the failing tests, when triage produced one. */
  failureCategory?: string;
  /** Evidence bundle path for the failing runs (Golden Rule 13). */
  evidencePath?: string;
  /** Seed recorded for the release-critical generated tests (Golden Rule 12). */
  seed?: string | number;
  /** Free-text rationale for the verdict (Golden Rule 14). */
  explanation?: string;
  /**
   * Whether ANY real execution backs these numbers. Planning-phase calls
   * (nothing ran yet) must pass false — a green verdict without execution
   * evidence is UNKNOWN, never PASS.
   */
  executionEvidence?: boolean;
}

export interface GovernanceReleaseVerdict {
  verdict: ReleaseGateVerdict;
  confidenceScore: number;
  blockers: string[];
  warnings: string[];
  /**
   * Golden-rule compliance is COMPUTED from the supplied evidence via each
   * rule's mechanical check — never a hardcoded compliant:true list.
   */
  invariantsAudit: { ruleId: string; title: string; compliant: boolean; detail?: string }[];
  summary: string;
}

export class QualityGovernanceAgent {
  evaluateRelease(input: ReleaseEvaluationInput): GovernanceReleaseVerdict {
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (input.testsFailed > 0) {
      blockers.push(`Direct test failures detected: ${input.testsFailed} test(s) failed in pipeline.`);
    }
    if (input.unresolvedP0Defects > 0) {
      blockers.push(`Unresolved P0 critical defects present: ${input.unresolvedP0Defects}.`);
    }
    if (input.securityVulnerabilities > 0) {
      blockers.push(`Security vulnerabilities detected: ${input.securityVulnerabilities}.`);
    }
    if (input.flakyTestsCount > 5) {
      warnings.push(`High flake count: ${input.flakyTestsCount} tests marked as flaky.`);
    }
    if (input.wcagAxeViolations > 0) {
      warnings.push(`Accessibility violations: ${input.wcagAxeViolations} WCAG violations.`);
    }
    if (input.lineCoveragePercent < 75 && input.riskScore > 70) {
      warnings.push(`High risk change (${input.riskScore}/100) with line coverage below threshold (${input.lineCoveragePercent}% < 75%).`);
    }

    // ---- REAL golden-rule audit ----
    // Each rule's mechanical check() runs against a payload built from the
    // release evidence. Rules whose checks cannot judge this payload are
    // reported as not-applicable (compliant: true, detail: 'not applicable
    // to this payload') rather than being skipped silently.
    const auditPayload = {
      status: input.testsFailed === 0 ? 'CONFIRMED' : 'FAILED',
      retryCount: input.maxRetriesOnFailures ?? 0,
      category: input.failureCategory ?? (input.testsFailed === 0 ? 'NONE' : 'UNKNOWN'),
      failureCategory: input.failureCategory ?? (input.testsFailed === 0 ? 'NONE' : 'UNKNOWN'),
      evidencePath: input.evidencePath,
      seed: input.seed,
      explanation: input.explanation,
      evidence: input.evidencePath !== undefined ? [input.evidencePath] : undefined,
      e2eCount: 0,
      unitCount: 1,
      totalGenerated: 0,
      code: '',
    };

    const applicableIds = new Set([2, 4, 10, 12, 13, 14]);
    const invariantsAudit = GOLDEN_RULES.map((rule) => {
      if (!applicableIds.has(rule.id)) {
        return { ruleId: String(rule.id), title: rule.name, compliant: true, detail: 'not applicable to release evidence payload' };
      }
      const result = rule.check('release', auditPayload);
      return {
        ruleId: String(rule.id),
        title: rule.name,
        compliant: result.pass,
        ...(result.violation !== undefined ? { detail: result.violation } : {}),
      };
    });

    // Rule violations escalate: evidence or categorization gaps are warnings,
    // retry masking is a blocker.
    for (const audit of invariantsAudit) {
      if (audit.compliant) continue;
      if (audit.ruleId === '2') {
        blockers.push(`Golden rule ${audit.ruleId} [${audit.title}]: ${audit.detail}`);
      } else {
        warnings.push(`Golden rule ${audit.ruleId} [${audit.title}]: ${audit.detail}`);
      }
    }

    let verdict: ReleaseGateVerdict = 'PASS';
    if (blockers.length > 0) {
      verdict = 'BLOCKED';
    } else if (warnings.length > 0) {
      verdict = 'PASS_WITH_WARNINGS';
    }
    // Unknown epistemics: failures with no triage category must never read as PASS.
    if (input.testsFailed > 0 && auditPayload.category === 'UNKNOWN' && blockers.length === 0) {
      verdict = warnings.length > 0 ? verdict : 'UNKNOWN';
    }
    // No execution evidence → the gate cannot be green. Planning-phase calls
    // report UNKNOWN with an explicit reason.
    if (input.executionEvidence === false && verdict !== 'BLOCKED') {
      verdict = 'UNKNOWN';
      warnings.push('No execution evidence supplied — planning-phase evaluation; run the suites before requesting a verdict.');
    }

    const confidenceScore = blockers.length > 0 ? 30 : warnings.length > 0 ? 85 : 98;

    return {
      verdict,
      confidenceScore,
      blockers,
      warnings,
      invariantsAudit,
      summary: blockers.length > 0
        ? `Release blocked due to ${blockers.length} critical policy violation(s).`
        : warnings.length > 0
        ? `Release permitted with ${warnings.length} advisory warning(s).`
        : 'All quality gates passed; every applicable golden rule verified against the release evidence.'
    };
  }
}

// Re-exported for server/CLI use: keep the validate import meaningful.
export { validateGoldenRules };
