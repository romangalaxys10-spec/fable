export type AuditPhase =
  | 'PHASE_1_RECONNAISSANCE'
  | 'PHASE_2_COVERAGE_LED_HUNTING'
  | 'PHASE_3_CANDIDATE_VALIDATION'
  | 'PHASE_4_STRUCTURED_OUTPUT'
  | 'PHASE_5_INDEPENDENT_VERIFICATION'
  | 'PHASE_6_TARGET_NEUTRAL_REPORT';

export interface AuditFinding {
  id: string;
  title: string;
  cwe: string;
  cvss: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  phaseIdentified: AuditPhase;
  independentVerificationPassed: boolean;
  affectedAsset: string;
  remediationGuidance: string;
}

export interface SecurityAuditSummary {
  auditTarget: string;
  overallPostureScore: number; // 0 - 100
  /** Epistemics label: OBSERVED when computed from real probes. */
  label?: 'OBSERVED' | 'NOT_RUN';
  status?: 'OK' | 'ERROR';
  detail?: string;
  phasesCompleted: { phase: AuditPhase; status: 'COMPLETED' | 'SKIPPED'; findingsCount: number }[];
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  edgeHeaderInvariants: {
    csp: { present: boolean; status: string };
    hsts: { present: boolean; status: string };
    xContentTypeOptions: { present: boolean; status: string };
    cors: { wildcardWithCredentials: boolean; status: string };
    tlsMinimum: { version: string; compliant: boolean };
  };
  recommendations: string[];
}
