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
  category: OwaspCategory;
  cwe: string;
  cvss: number; // e.g. 8.6
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  endpoint: string;
  proofOfConcept: {
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
}
