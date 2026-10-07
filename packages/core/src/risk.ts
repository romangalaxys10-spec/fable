export interface RiskFactors {
  businessCriticality: number; // 1 - 5 (e.g. payment/auth = 5, landing page = 1)
  changeSurface: number;       // 1 - 5 (lines changed, files touched, public API changed)
  defectHistory: number;       // 1 - 5 (prior regression frequency)
  codeComplexity: number;      // 1 - 5 (cyclomatic/nesting/concurrency)
  integrationDepth: number;    // 1 - 5 (third-party services, DB, network)
  userImpact: number;          // 1 - 5 (breadth of end-user exposure)
  securitySensitivity: number; // 1 - 5 (tokens, PII, authz, credentials)
  dataSensitivity: number;     // 1 - 5 (DB mutation, transactions, financial state)
}

export interface RiskAnalysisResult {
  score: number; // 0 - 100
  tier: 'critical' | 'high' | 'medium' | 'low';
  factors: RiskFactors;
  topContributors: string[];
  recommendation: string;
  requiredTestLayers: ('unit' | 'integration' | 'e2e' | 'security' | 'performance')[];
}

export function calculateRisk(factors: Partial<RiskFactors>, taskOrDiffContext?: string): RiskAnalysisResult {
  const f: RiskFactors = {
    businessCriticality: factors.businessCriticality ?? 3,
    changeSurface: factors.changeSurface ?? 3,
    defectHistory: factors.defectHistory ?? 2,
    codeComplexity: factors.codeComplexity ?? 3,
    integrationDepth: factors.integrationDepth ?? 2,
    userImpact: factors.userImpact ?? 3,
    securitySensitivity: factors.securitySensitivity ?? 2,
    dataSensitivity: factors.dataSensitivity ?? 2,
  };

  const text = (taskOrDiffContext || '').toLowerCase();
  const contributors: string[] = [];

  // Deterministic domain boosts
  if (/payment|billing|stripe|checkout|charge|subscription|credit/i.test(text)) {
    f.businessCriticality = Math.max(f.businessCriticality, 5);
    f.dataSensitivity = Math.max(f.dataSensitivity, 5);
    contributors.push('Payment & financial transaction boundaries touched');
  }

  if (/auth|login|session|jwt|token|password|oauth|permission|rbac/i.test(text)) {
    f.securitySensitivity = Math.max(f.securitySensitivity, 5);
    contributors.push('Authentication or authorization security surface affected');
  }

  if (/migration|schema|database|sql|postgres|orm|delete|drop/i.test(text)) {
    f.dataSensitivity = Math.max(f.dataSensitivity, 5);
    f.integrationDepth = Math.max(f.integrationDepth, 4);
    contributors.push('Database schema or persistent mutation write path touched');
  }

  if (/async|concurrency|mutex|lock|deadlock|race|queue|stream|worker/i.test(text)) {
    f.codeComplexity = Math.max(f.codeComplexity, 5);
    contributors.push('High-concurrency or asynchronous state machine logic modified');
  }

  if (/public api|breaking|route|contract|v1|endpoint/i.test(text)) {
    f.changeSurface = Math.max(f.changeSurface, 4);
    f.userImpact = Math.max(f.userImpact, 4);
    contributors.push('Public API contract or route boundary modified');
  }

  // Raw product of normalized factors: (f_i / 5) product weighted
  // Using logarithmic / geometric sum normalization to prevent extreme skew while honoring multiplicative growth
  const weights = [
    f.businessCriticality * 0.22,
    f.changeSurface * 0.16,
    f.securitySensitivity * 0.18,
    f.dataSensitivity * 0.14,
    f.codeComplexity * 0.10,
    f.userImpact * 0.10,
    f.defectHistory * 0.05,
    f.integrationDepth * 0.05
  ];
  const weightedSum = weights.reduce((acc, val) => acc + val, 0); // max 5.0
  const normalizedScore = Math.min(100, Math.max(5, Math.round((weightedSum / 5.0) * 100)));

  let tier: 'critical' | 'high' | 'medium' | 'low';
  let recommendation = '';
  const layers: ('unit' | 'integration' | 'e2e' | 'security' | 'performance')[] = ['unit'];

  if (normalizedScore >= 80) {
    tier = 'critical';
    recommendation = 'CRITICAL RISK: Block automated merge. Enforce complete 4-quadrant verification, security audit, and targeted E2E journeys.';
    layers.push('integration', 'e2e', 'security');
  } else if (normalizedScore >= 60) {
    tier = 'high';
    recommendation = 'HIGH RISK: Run targeted regression suite, schema validation, and integration tests before deployment.';
    layers.push('integration', 'e2e');
  } else if (normalizedScore >= 35) {
    tier = 'medium';
    recommendation = 'MEDIUM RISK: Standard PR quality gate. Run fast isolated unit invariants and changed-file smoke tests.';
    layers.push('integration');
  } else {
    tier = 'low';
    recommendation = 'LOW RISK: Isolated cosmetic or documentation change. Fast-path unit test verification sufficient.';
  }

  if (contributors.length === 0) {
    if (f.changeSurface >= 4) contributors.push('Broad change surface across multiple files');
    if (f.codeComplexity >= 4) contributors.push('Elevated internal algorithmic complexity');
    if (f.businessCriticality >= 4) contributors.push('Core business domain logic modified');
    if (contributors.length === 0) contributors.push('Routine incremental feature enhancement');
  }

  return {
    score: normalizedScore,
    tier,
    factors: f,
    topContributors: contributors,
    recommendation,
    requiredTestLayers: layers,
  };
}
