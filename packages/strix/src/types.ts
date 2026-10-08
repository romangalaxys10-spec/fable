export type OwaspCategory =
  | 'BROKEN_ACCESS_CONTROL'
  | 'SQL_INJECTION'
  | 'COMMAND_INJECTION'
  | 'SSRF'
  | 'XSS'
  | 'CSRF'
  | 'INSECURE_DESERIALIZATION'
  | 'AUTH_BYPASS'
  | 'BUSINESS_LOGIC_FLAW';

export interface ExploitPayload {
  name: string;
  category: OwaspCategory;
  cwe: string;
  attackVector: string;
  payloadString: string;
  targetEndpoint: string;
  expectedVulnerableIndicator: string | RegExp;
}

export interface ConfirmedVulnerability {
  id: string;
  title: string;
  category: OwaspCategory | 'SECURITY_MISCONFIGURATION' | 'INFORMATION_DISCLOSURE';
  cwe: string;
  cvss: number; // e.g. 8.6
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  endpoint: string;
  /** Passive evidence observed from real requests (the active-exploit PoC shape is retained for authorized runs). */
  evidence: {
    request: string;
    observedResponse: string;
  };
  proofOfConcept?: {
    command: string;
    payload: string;
    observedResponse: string;
    validatedInSandbox: boolean;
  };
  remediationAdvice: string;
  remediationPatchDiff?: string;
}

export interface PentestScanReport {
  scanTarget: string;
  totalProbesSent: number;
  confirmedVulnerabilities: ConfirmedVulnerability[];
  rejectedFalsePositivesCount: number;
  overallRiskLevel: 'SAFE' | 'VULNERABLE' | 'CRITICAL';
  scanDurationMs: number;
  /** Epistemics: ERROR reports a reachable-failure; findings are OBSERVED. */
  status?: 'OK' | 'ERROR';
  label?: 'OBSERVED' | 'NOT_RUN';
  detail?: string;
  /** Passive probes executed with their evidence (no destructive payloads). */
  probes?: Array<{ request: string; observation: string; finding: boolean }>;
  /** The active exploitation payloads this scanner DECLINES to fire without explicit operator authorization. */
  declaredActiveProbes?: ExploitPayload[];
}
