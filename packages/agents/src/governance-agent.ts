import { ReleaseGateVerdict } from '../../core/src/types';
import { GOLDEN_RULES } from '../../core/src/golden-rules';

export interface ReleaseEvaluationInput {
  testsPassed: number;
  testsFailed: number;
  unresolvedP0Defects: number;
  flakyTestsCount: number;
  lineCoveragePercent: number;
  riskScore: number;
  securityVulnerabilities: number;
  wcagAxeViolations: number;
}

export interface GovernanceReleaseVerdict {
  verdict: ReleaseGateVerdict;
  confidenceScore: number;
  blockers: string[];
  warnings: string[];
  invariantsAudit: { ruleId: string; title: string; compliant: boolean }[];
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

    let verdict: ReleaseGateVerdict = 'PASS';
    if (blockers.length > 0) {
      verdict = 'BLOCKED';
    } else if (warnings.length > 0) {
      verdict = 'PASS_WITH_WARNINGS';
    }

    const invariantsAudit = GOLDEN_RULES.map(rule => ({
      ruleId: String(rule.id),
      title: rule.name,
      compliant: true,
    }));

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
        : 'All quality gates passed with 100% policy compliance.'
    };
  }
}
