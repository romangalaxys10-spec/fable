export type ClaimStatus = 'VERIFIED' | 'REFUTED' | 'UNVERIFIED';

export interface GroundTruthClaim {
  id: string;
  statement: string;
  category: 'symbol_exists' | 'file_exists' | 'test_passes' | 'api_schema' | 'bug_reproduced';
  targetPath?: string;
  expectedPattern?: string;
  commandProbe?: string;
}

export interface VerificationResult {
  claimId: string;
  statement: string;
  status: ClaimStatus;
  evidence: string[];
  refutationReason?: string;
  timestamp: string;
}

export interface KnownFalseEntry {
  claimId: string;
  statement: string;
  refutedAt: string;
  refutingEvidence: string;
}
