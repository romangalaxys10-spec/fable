import { runQADoctor } from '../packages/cli/src/doctor';
import { calculateRisk } from '../packages/core/src/risk';
import { analyzeImpact } from '../packages/core/src/impact';
import { generateEnterpriseTestSuite } from '../packages/agents/src/generator-agent';
import { clusterFailures } from '../packages/agents/src/triage-agent';
import { evaluateHealing } from '../packages/healing/src/healer';
import { GOLDEN_RULES } from '../packages/core/src/golden-rules';
import { buildStandardQualityGraph } from '../packages/graph/src/quality-graph';
import { QualityGovernanceAgent } from '../packages/agents/src/governance-agent';
import { generateTraceabilityMatrixMarkdown } from '../packages/reporting/src/matrix';
import { GroundTruthVerificationEngine } from '../packages/reverify/src';
import { evaluateTextForSlop } from '../packages/stop-slop/src';
import { StrixPentestScanner } from '../packages/strix/src';
import { CloudflareSecurityAuditor } from '../packages/security-audit/src';
import { QAForgeMCPServer } from '../packages/mcp-server/src';
import { ZeroConfigBypass } from '../packages/core/src/zero-config';

export interface AuditCheckResult {
  featureName: string;
  category: 'CORE_ENGINE' | 'QA_OPERATING_SYSTEM' | 'SECURITY_DAST' | 'TOKEN_EFFICIENCY' | 'MCP_SERVER' | 'EXPERIENCE_LAYER';
  status: 'PASS' | 'FAIL';
  executionDurationMs: number;
  proofOfCode: string;
  proofOfWork: unknown;
}

const BASE_URL = process.env.FABLE_BASE_URL ?? 'http://localhost:3000';

/** Probe whether the studio server is up, so network scanners assert the
 * honest live contract vs the honest unreachable contract — never a guess. */
async function serverReachable(timeoutMs = 3_000): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/status`, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function runFullQAAudit(): Promise<{
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  overallVerdict: '100% VERIFIED' | 'DEFECTS_FOUND';
  results: AuditCheckResult[];
}> {
  const results: AuditCheckResult[] = [];
  const record = (
    featureName: string,
    category: AuditCheckResult['category'],
    pass: boolean,
    t0: number,
    proofOfCode: string,
    proofOfWork: unknown
  ) => {
    results.push({ featureName, category, status: pass ? 'PASS' : 'FAIL', executionDurationMs: Date.now() - t0, proofOfCode, proofOfWork });
  };

  // 1. Doctor System Health — async engine; honest pass = no FAIL probes.
  // WARNINGS is the expected steady state on a dev machine (WARN = honest
  // "not observed yet"), DEGRADED is not.
  const t1 = Date.now();
  const doctor = await runQADoctor();
  record(
    'System Health Diagnostics (qa doctor)',
    'CORE_ENGINE',
    doctor.checksFailed === 0 && doctor.checks.length >= 8 && doctor.label === 'OBSERVED',
    t1,
    'packages/cli/src/doctor.ts:runQADoctor',
    { healthScore: doctor.healthScore, overallStatus: doctor.overallStatus, checksPassed: doctor.checksPassed, checksWarn: doctor.checksWarn, checksFailed: doctor.checksFailed, totalChecks: doctor.checks.length }
  );

  // 2. 8-Factor Mathematical Risk Engine
  const t2 = Date.now();
  const risk = calculateRisk({}, 'Payment gateway integration with Stripe webhooks');
  record(
    '8-Factor Risk Analysis (qa risk)',
    'QA_OPERATING_SYSTEM',
    risk.score > 0 && risk.tier === 'high' && risk.topContributors.length > 0,
    t2,
    'packages/core/src/risk.ts:calculateRisk',
    { score: risk.score, tier: risk.tier, topContributors: risk.topContributors }
  );

  // 3. Real-git Change Impact Analysis — run against files that exist so the
  // probe exercises the real numstat path, not the not-a-repo refusal.
  const t3 = Date.now();
  const impact = analyzeImpact(['server.ts', 'packages/core/src/risk.ts']);
  record(
    'Git-Numstat Change Impact Analysis (qa impact)',
    'QA_OPERATING_SYSTEM',
    impact.totalFilesChanged === 2 && impact.affectedFeatures.length > 0 && impact.label === 'OBSERVED',
    t3,
    'packages/core/src/impact.ts:analyzeImpact',
    { totalFilesChanged: impact.totalFilesChanged, affectedFeatures: impact.affectedFeatures, label: impact.label, targetedTests: impact.targetedTests }
  );

  // 4. Test Suite Generator Across 8 Heuristics — honesty invariants included:
  // no invented seed, every case traces to a real criterion.
  const t4 = Date.now();
  const suite = generateEnterpriseTestSuite({
    featureTitle: 'User Checkout & Idempotent Payment Flow',
    acceptanceCriteria: ['Valid nominal execution', 'Idempotent replay rejection', 'Zero data leaks'],
  });
  const allTraced = suite.testCases.every((tc) => typeof tc.tracesTo === 'string' && tc.tracesTo.length > 0);
  record(
    'Enterprise Test Suite Generator (qa generate)',
    'QA_OPERATING_SYSTEM',
    suite.heuristicsEnumerated.length === 8 && suite.testCases.length >= 3 && allTraced && suite.seed === undefined,
    t4,
    'packages/agents/src/generator-agent.ts:generateEnterpriseTestSuite',
    { testCasesCount: suite.testCases.length, pyramid: suite.pyramidDistribution, heuristics: suite.heuristicsEnumerated, seed: suite.seed, allTraced }
  );

  // 5. 15 Golden Rules Invariant Enforcement
  const t5 = Date.now();
  const sleepCheck = GOLDEN_RULES.find((r) => r.id === 3)?.check('generate', { code: 'await page.waitForTimeout(5000);' });
  const assertionCheck = GOLDEN_RULES.find((r) => r.id === 1)?.check('heal', { assertionWeakened: true });
  record(
    '15 Non-Negotiable Golden Rules (qa review)',
    'QA_OPERATING_SYSTEM',
    GOLDEN_RULES.length === 15 && sleepCheck?.pass === false && assertionCheck?.pass === false,
    t5,
    'packages/core/src/golden-rules.ts:GOLDEN_RULES',
    { totalRules: GOLDEN_RULES.length, sleepViolationCaught: sleepCheck?.violation, assertionViolationCaught: assertionCheck?.violation }
  );

  // 6. Failure Triage & Root Cause Clustering
  const t6 = Date.now();
  const triage = clusterFailures([
    { testId: 'tests/e2e/checkout.spec.ts', errorMessage: 'Timeout 30000ms exceeded waiting for locator button.btn-pay', firstAttemptFailed: true, retryPassed: false },
    { testId: 'tests/integration/auth.test.ts', errorMessage: 'Socket hangup ECONNRESET', firstAttemptFailed: true, retryPassed: true },
  ]);
  const clustersGrounded = triage.clusters.every((c) => c.rootCause.length > 0 && c.affectedCount >= 1);
  record(
    '12-Category Failure Triage (qa triage)',
    'QA_OPERATING_SYSTEM',
    triage.totalFailures === 2 && triage.clusters.length === 2 && clustersGrounded,
    t6,
    'packages/agents/src/triage-agent.ts:clusterFailures',
    { totalFailures: triage.totalFailures, clusters: triage.clusters.map((c) => ({ id: c.clusterId, category: c.category, rootCause: c.rootCause })) }
  );

  // 7. Confidence-Tiered Self-Healing — heal-then-verify, both paths:
  // without a rerun callback the patch stays `proposed` (never applied
  // unverified); with a passing rerun it becomes `applied`.
  const t7 = Date.now();
  const SNAPSHOT = [
    '- button "Proceed to checkout"',
    '- textbox "Email address"',
    '- link "View cart"',
    '<button data-testid="checkout-cta">Checkout</button>',
    '<label for="email-input">Email</label>',
  ].join('\n');
  const healBase = {
    testFile: 'tests/checkout.spec.ts',
    testName: 'guest checkout completes',
    originalSnippet: "await page.locator('#checkout').click();",
    failedLocatorOrSelector: '#checkout',
    updatedDomOrSchema: SNAPSHOT,
    failureCategory: 'SELECTOR_FAILURE',
  };
  const proposed = await evaluateHealing(healBase);
  const applied = await evaluateHealing({ ...healBase, rerun: async () => true });
  record(
    'Self-Healing Engine (qa heal)',
    'QA_OPERATING_SYSTEM',
    proposed.confidenceTier === 'HIGH' && proposed.status === 'proposed' && proposed.invariantChecks.verifiedByRerun === false
      && applied.status === 'applied' && applied.invariantChecks.verifiedByRerun === true,
    t7,
    'packages/healing/src/healer.ts:evaluateHealing',
    { proposed: { tier: proposed.confidenceTier, status: proposed.status, verifiedByRerun: proposed.invariantChecks.verifiedByRerun }, applied: { status: applied.status, verifiedByRerun: applied.invariantChecks.verifiedByRerun } }
  );

  // 8. Quality Traceability Matrix Generator
  const t8 = Date.now();
  const matrix = generateTraceabilityMatrixMarkdown([
    { id: 'REQ-01', title: 'Payment Processing', riskTier: 'CRITICAL', quadrantsCovered: ['POSITIVE', 'NEGATIVE', 'SECURITY'], linkedTestIds: ['TC-1', 'TC-2'], status: 'VERIFIED' },
  ]);
  record(
    'Quality Traceability Matrix (qa matrix)',
    'QA_OPERATING_SYSTEM',
    matrix.includes('REQ-01') && matrix.includes('CRITICAL') && matrix.includes('TC-1'),
    t8,
    'packages/reporting/src/matrix.ts:generateTraceabilityMatrixMarkdown',
    { matrixGeneratedLength: matrix.length, sampleRow: 'REQ-01 Payment Processing' }
  );

  // 9. Release Gate Governance — honesty property: complete evidence earns
  // the fewest warnings; omitting execution evidence strictly downgrades.
  const t9 = Date.now();
  const governance = new QualityGovernanceAgent();
  const releaseEvidence = {
    testsPassed: 42, testsFailed: 0, unresolvedP0Defects: 0, flakyTestsCount: 0,
    lineCoveragePercent: 92, riskScore: 35, securityVulnerabilities: 0, wcagAxeViolations: 0,
    executionEvidence: true, evidencePath: 'evidence/run-latest/', seed: 'release-2026-10-08',
    explanation: 'Verdict computed from a verified CI run; evidence bundle and seed recorded.',
  };
  const full = governance.evaluateRelease(releaseEvidence);
  const bare = governance.evaluateRelease({ ...releaseEvidence, executionEvidence: undefined, evidencePath: undefined, seed: undefined, explanation: undefined });
  record(
    'Release Gate Governance (qa release)',
    'QA_OPERATING_SYSTEM',
    full.blockers.length === 0 && full.confidenceScore >= 85 && bare.warnings.length > full.warnings.length,
    t9,
    'packages/agents/src/governance-agent.ts:QualityGovernanceAgent',
    { withEvidence: { verdict: full.verdict, confidence: full.confidenceScore, warnings: full.warnings.length }, withoutEvidence: { verdict: bare.verdict, confidence: bare.confidenceScore, warnings: bare.warnings.length } }
  );

  // 10. Reverify Ground Truth Verification Harness
  const t10 = Date.now();
  const reverify = new GroundTruthVerificationEngine();
  const verifiedClaim = reverify.verifyClaim({ id: 'c1', statement: 'package.json exists on disk', category: 'file_exists', targetPath: 'package.json' });
  const refutedClaim = reverify.verifyClaim({ id: 'c2', statement: 'nonexistent_file_xyz.ts exists', category: 'file_exists', targetPath: 'nonexistent_file_xyz.ts' });
  record(
    'Ground Truth Verification Harness (qa reverify)',
    'SECURITY_DAST',
    verifiedClaim.status === 'VERIFIED' && refutedClaim.status === 'REFUTED',
    t10,
    'packages/reverify/src/engine.ts:GroundTruthVerificationEngine',
    { verifiedClaimStatus: verifiedClaim.status, refutedClaimStatus: refutedClaim.status, knownFalseCount: reverify.getKnownFalseEntries().length }
  );

  // 11. Stop-Slop Anti-AI Human Craft Engine
  const t11 = Date.now();
  const cleanScore = evaluateTextForSlop('We reduced SQLite write latency by 140ms by enabling WAL mode.');
  const slopScore = evaluateTextForSlop("In today's fast-paced digital world, this game changer robust solution elevates workflows.");
  record(
    'Stop-Slop Human Craft Scorer (qa slop)',
    'CORE_ENGINE',
    cleanScore.score >= 45 && slopScore.score < 40 && slopScore.detectedViolations.length >= 2,
    t11,
    'packages/stop-slop/src/scorer.ts:evaluateTextForSlop',
    { cleanScore: cleanScore.score, slopScore: slopScore.score, slopViolationsCaught: slopScore.detectedViolations.length }
  );

  // 12. Strix Autonomous DAST — honest in both worlds: a reachable target is
  // probed for real (>= 4 probes, findings only from observed responses); an
  // unreachable target gets zero probes, zero invented findings, and an
  // explicit unreachable detail.
  const t12 = Date.now();
  const strix = new StrixPentestScanner();
  const up = await serverReachable();
  const pentestReport = await strix.scanTarget(BASE_URL);
  const strixPass = up
    ? pentestReport.totalProbesSent >= 4 && ['SAFE', 'VULNERABLE'].includes(pentestReport.overallRiskLevel)
    : pentestReport.totalProbesSent === 0 && pentestReport.overallRiskLevel === 'SAFE' && /unreachable/i.test(pentestReport.detail);
  record(
    `Strix Autonomous DAST (qa strix) — ${up ? 'live target' : 'unreachable target'}`,
    'SECURITY_DAST',
    strixPass,
    t12,
    'packages/strix/src/dast-scanner.ts:StrixPentestScanner',
    { targetReachable: up, probesSent: pentestReport.totalProbesSent, risk: pentestReport.overallRiskLevel, detail: pentestReport.detail, findings: pentestReport.confirmedVulnerabilities.length, falsePositivesRejected: pentestReport.rejectedFalsePositivesCount }
  );

  // 13. Cloudflare 6-Phase Security Audit — same reachable/unreachable honesty.
  const t13 = Date.now();
  const cf = new CloudflareSecurityAuditor();
  const auditSummary = await cf.runAudit(BASE_URL);
  const cfPass = up
    ? auditSummary.phasesCompleted.length === 6 && auditSummary.overallPostureScore >= 0 && auditSummary.overallPostureScore <= 100
    : auditSummary.phasesCompleted.length === 6 && auditSummary.overallPostureScore === 0;
  record(
    `Cloudflare 6-Phase Security Audit (qa sec-audit) — ${up ? 'live target' : 'unreachable target'}`,
    'SECURITY_DAST',
    cfPass,
    t13,
    'packages/security-audit/src/auditor.ts:CloudflareSecurityAuditor',
    { targetReachable: up, postureScore: auditSummary.overallPostureScore, phasesCompleted: auditSummary.phasesCompleted.length, edgeCsp: auditSummary.edgeHeaderInvariants.csp.status }
  );

  // 14. Model Context Protocol Server (11 MCP Tools)
  const t14 = Date.now();
  const mcp = new QAForgeMCPServer();
  const mcpTools = mcp.listTools();
  const toolCallResult = await mcp.callTool('analyze_risk', { task: 'Database migration with altered foreign key constraints' });
  record(
    'Model Context Protocol Server (11 Tools)',
    'MCP_SERVER',
    mcpTools.length === 11 && toolCallResult.score > 0,
    t14,
    'packages/mcp-server/src/server.ts:QAForgeMCPServer',
    { toolsRegisteredCount: mcpTools.length, sampleToolCallOutput: { tool: 'analyze_risk', score: toolCallResult.score, tier: toolCallResult.tier } }
  );

  // 15. Zero-Config Bypass Proxy — v2.2.0 honesty contract: missing
  // credentials is a status (NOT_RUN), never a simulated dataset. The old
  // fabricated fallback (simulatedSafe: true) must stay gone.
  const t15 = Date.now();
  const bypassResult = ZeroConfigBypass.executeWithBypass({
    serviceName: 'Enterprise External Security Provider',
    requiredKeyEnvVar: 'EXTERNAL_SECRET_API_KEY_NOT_SET',
    fallbackSimulation: { simulatedSafe: true, codeCoverage: 100 },
  });
  const zc = bypassResult as Record<string, unknown>;
  record(
    'Zero-Config Token & Key Bypass Proxy',
    'CORE_ENGINE',
    zc.status === 'NOT_RUN' && zc.reason === 'REQUIRES_CREDENTIALS' && zc.label === 'NOT_RUN' && zc.simulatedSafe === undefined,
    t15,
    'packages/core/src/zero-config.ts:ZeroConfigBypass',
    { status: zc.status, reason: zc.reason, label: zc.label, detail: zc.detail, fabricatedFallbackAbsent: zc.simulatedSafe === undefined }
  );

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  return {
    totalChecks: results.length,
    passedChecks: passed,
    failedChecks: failed,
    overallVerdict: failed === 0 ? '100% VERIFIED' : 'DEFECTS_FOUND',
    results,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runFullQAAudit().then((report) => {
    console.log(JSON.stringify(report, null, 2));
    if (report.failedChecks > 0) {
      console.error(`e2e-system-audit: ${report.failedChecks} of ${report.totalChecks} checks FAILED — exiting 1`);
      process.exitCode = 1;
    } else {
      console.error(`e2e-system-audit: all ${report.totalChecks} checks passed`);
    }
  });
}
