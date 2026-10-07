import { calculateRisk, RiskAnalysisResult } from './risk';
import { analyzeImpact, ImpactAnalysisResult } from './impact';
import { QALifecycleEngine, FullLifecycleExecution, LifecycleStage } from './lifecycle';
import { generateEnterpriseTestSuite, EnterpriseTestSuite } from '../../agents/src/generator-agent';
import { clusterFailures, ClusteredTriageReport, RawFailureInput } from '../../agents/src/triage-agent';
import { evaluateHealing, HealProposal, HealRequest } from '../../healing/src/healer';
import { QualityGovernanceAgent, GovernanceReleaseVerdict } from '../../agents/src/governance-agent';

export interface OrchestrationIntent {
  task: string;
  filesChanged?: string[];
  dryRun?: boolean;
}

export interface OrchestratorPlan {
  task: string;
  lifecycle: FullLifecycleExecution;
  risk: RiskAnalysisResult;
  impact: ImpactAnalysisResult;
  intelligentRoute: {
    recommendedAction: string;
    skippedHeavySuites: string[];
    invokedSuites: string[];
    priorityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  };
  generatedSuite?: EnterpriseTestSuite;
  triageReport?: ClusteredTriageReport;
  healProposal?: HealProposal;
  governanceVerdict?: GovernanceReleaseVerdict;
}

export class QAOrchestrator {
  private governance = new QualityGovernanceAgent();

  orchestrate(intent: OrchestrationIntent): OrchestratorPlan {
    const task = intent.task;
    const files = intent.filesChanged || ['src/services/payment.ts', 'src/server.ts'];
    const risk = calculateRisk({}, task);
    const impact = analyzeImpact(files);

    const lifecycle = QALifecycleEngine.createInitialLifecycle(`task_${Date.now()}`);

    // Intelligent routing heuristics:
    // - CSS-only change -> do NOT trigger 4,000 API tests
    // - Payment change -> heavy validation
    // - DB migration -> data-integrity + migration tests
    // - Auth change -> risk priority elevated
    const lower = task.toLowerCase();
    const isCssOnly = files.every(f => /\.(css|scss|less|svg|png)$/i.test(f));
    const isPayment = /payment|stripe|billing|checkout|charge/i.test(lower);
    const isDbMigration = /migration|schema|database|sql/i.test(lower) || files.some(f => /migration|schema/i.test(f));
    const isAuth = /auth|login|session|jwt|token|oauth/i.test(lower);

    let priorityLevel: OrchestratorPlan['intelligentRoute']['priorityLevel'] = 'MEDIUM';
    const skippedHeavySuites: string[] = [];
    const invokedSuites: string[] = [];
    let recommendedAction = '';

    if (isCssOnly) {
      priorityLevel = 'LOW';
      skippedHeavySuites.push('Full API Regression (4,000 suites)', 'Load / Stress Tests', 'Database Migration Verification');
      invokedSuites.push('Playwright Visual Regression & Layout Snapshots', 'Axe A11y Contrast Audit');
      recommendedAction = 'CSS-only scope detected: Suppressing heavy API & DB regression; running visual & accessibility checks only.';
    } else if (isPayment) {
      priorityLevel = 'CRITICAL';
      invokedSuites.push('Full Checkout E2E Regression', 'Payment Gateway Integration Matrix', 'Double-Spend Concurrency Check', 'Idempotency Suite');
      recommendedAction = 'Payment boundary affected: Triggering maximum depth verification with concurrency and idempotency suites.';
    } else if (isDbMigration) {
      priorityLevel = 'HIGH';
      invokedSuites.push('Schema Rollback Test', 'Data Integrity & Mutation Suite', 'Database Zero-Downtime Migration Check');
      skippedHeavySuites.push('Pure UI Theme Snapshot Tests');
      recommendedAction = 'Database mutation detected: Enforcing transaction rollback and data-integrity verification.';
    } else if (isAuth) {
      priorityLevel = 'HIGH';
      invokedSuites.push('OAuth Token Expiry Suite', 'RBAC Permission Boundary Check', 'CSRF & Session Invalidation');
      recommendedAction = 'Auth boundary affected: Elevating security and session invalidation test suites.';
    } else {
      invokedSuites.push('Standard Unit Suite', 'Targeted Integration Tests');
      recommendedAction = 'Standard feature change: Running targeted impact test subset.';
    }

    const generatedSuite = generateEnterpriseTestSuite({
      featureTitle: task,
      acceptanceCriteria: ['Nominal execution path', 'Invalid payload rejection', 'Idempotent processing']
    });

    const governanceVerdict = this.governance.evaluateRelease({
      testsPassed: 42,
      testsFailed: 0,
      unresolvedP0Defects: 0,
      flakyTestsCount: 0,
      lineCoveragePercent: 88,
      riskScore: risk.score,
      securityVulnerabilities: 0,
      wcagAxeViolations: 0
    });

    return {
      task,
      lifecycle,
      risk,
      impact,
      intelligentRoute: {
        recommendedAction,
        skippedHeavySuites,
        invokedSuites,
        priorityLevel,
      },
      generatedSuite,
      governanceVerdict
    };
  }
}
