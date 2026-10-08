export interface EngineStatus {
  status: string;
  type?: string;
  count?: number;
  path?: string;
  latency?: string;
  hardware?: string;
  note?: string;
  engine?: string;
  compression?: string;
  loop?: string;
  dir?: string;
  policy?: string;
}

export interface SystemStatus {
  ok: boolean;
  platform: string;
  arch: string;
  nodeVersion: string;
  engines: {
    retrieval: EngineStatus;
    corpus: EngineStatus;
    laya: EngineStatus;
    headroom: EngineStatus;
    smartScaffold: EngineStatus;
    vimax: EngineStatus;
    securityGate: EngineStatus;
  };
  datasets: Array<{
    id: string;
    traces: string | number;
    type: string;
  }>;
}

export interface RoutingRecommendation {
  engine: string;
  status: 'run' | 'skip';
  reason: string;
}

export interface RoutingPlan {
  task: string;
  mode: 'ULTRA' | 'BOOST' | 'SMART' | 'VIDEO' | 'QA-ARCHITECT';
  timestamp: string;
  recommendations: RoutingRecommendation[];
  commands: string[];
}

export interface LessonCard {
  ts: string;
  task: string;
  context: string;
  outcome: string;
  key_steps: string[];
  gotchas: string[];
  learnings: string[];
  score?: number;
}

export interface FableTrace {
  dataset: string;
  id: string;
  score: number;
  task_type: string;
  prompt: string;
  solution_summary: string;
  tokens: number;
  quality_rating: string;
}

export interface RetrievalResult {
  task: string;
  total_retrieved: number;
  latency_ms: number;
  datasets_queried: number;
  results: FableTrace[];
}

export interface BoostStage {
  stage: string;
  duration_ms: number;
  status: string;
  candidates?: number;
  approved?: number;
  rejected?: number;
  model?: string;
  engine?: string;
}

export interface BoostResult {
  task: string;
  pipeline: BoostStage[];
  token_economy: {
    initial_tokens: number;
    compressed_tokens: number;
    tokens_saved: number;
    compression_ratio: string;
    estimated_speedup: string;
    token_cost_reduction: string;
  };
}

export interface WarRoomStage {
  id: number;
  name: string;
  status: 'ready' | 'pending' | 'in_progress' | 'verified';
  description: string;
}

export interface WarRoom {
  slug: string;
  path: string;
  task_md: string;
  notes_md: string;
  gvs5h_stages: WarRoomStage[];
}

export interface QASkillItem {
  id: string;
  name: string;
  title: string;
  category: string;
  path: string;
  snippet: string;
  full_content: string;
}

export interface QAArchitectPlan {
  task: string;
  role: string;
  strategy_summary: string;
  pyramid_distribution: {
    unit: string;
    integration_api: string;
    e2e_ui: string;
  };
  four_quadrants: {
    q1_positive_happy_path: string[];
    q2_negative_error_handling: string[];
    q3_boundary_resilience: string[];
    q4_security_accessibility: string[];
  };
  recommended_qa_skills: string[];
  sample_test_scaffold: string;
  quality_gates: string[];
}

export interface DoctorReport {
  healthScore: number;
  overallStatus: 'HEALTHY' | 'WARNINGS' | 'DEGRADED';
  checksPassed: number;
  checksWarn: number;
  checksFailed: number;
  checks: Array<{
    id: string;
    name: string;
    category: string;
    status: 'PASS' | 'WARN' | 'FAIL';
    details: string;
    fixRecommendation?: string;
  }>;
  recommendedFixes: string[];
}

export interface RiskAnalysisResult {
  score: number;
  tier: 'critical' | 'high' | 'medium' | 'low';
  topContributors: string[];
  recommendation: string;
  requiredTestLayers: string[];
}

export interface ImpactAnalysisResult {
  commitRange: string;
  totalFilesChanged: number;
  affectedFeatures: string[];
  affectedRoutes: string[];
  targetedTests: {
    unit: string[];
    integration: string[];
    e2e: string[];
  };
  explanation: string[];
}

export interface ClusteredTriageReport {
  totalFailures: number;
  primaryDefectsCount: number;
  cascadingFailuresCount: number;
  clusters: Array<{
    clusterId: string;
    rootCause: string;
    category: string;
    affectedCount: number;
    recommendedAction?: string;
    primaryFailure: {
      testId: string;
      category: string;
      confidence: number;
      recommendedAction: string;
    };
  }>;
}

export interface HealProposal {
  testFile: string;
  confidenceTier: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore: number;
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

