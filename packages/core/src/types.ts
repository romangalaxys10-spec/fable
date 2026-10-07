import { z } from 'zod';

export const SafetyClassificationSchema = z.enum(['READ-ONLY', 'LOW-RISK WRITE', 'HIGH-RISK']);
export type SafetyClassification = z.infer<typeof SafetyClassificationSchema>;

export const FailureCategorySchema = z.enum([
  'REAL_REGRESSION',
  'TEST_DEFECT',
  'TEST_DATA_DEFECT',
  'ENVIRONMENT_FAILURE',
  'NETWORK_FAILURE',
  'DEPENDENCY_FAILURE',
  'FLAKE',
  'TIMING_FAILURE',
  'SELECTOR_FAILURE',
  'ASSERTION_FAILURE',
  'CONFIGURATION_FAILURE',
  'UNKNOWN'
]);
export type FailureCategory = z.infer<typeof FailureCategorySchema>;

export const ConfidenceTierSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export type ConfidenceTier = z.infer<typeof ConfidenceTierSchema>;

export const VerificationStatusSchema = z.enum([
  'NOT VERIFIED',
  'NOT RUN',
  'INFERRED',
  'OBSERVED',
  'CONFIRMED'
]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const ReleaseGateVerdictSchema = z.enum([
  'PASS',
  'PASS_WITH_WARNINGS',
  'BLOCKED',
  'FAIL',
  'UNKNOWN'
]);
export type ReleaseGateVerdict = z.infer<typeof ReleaseGateVerdictSchema>;

export interface ExplainabilityModel<T = any> {
  input: string | Record<string, any>;
  reasoningObjective: string;
  evidence: string[];
  output: T;
  confidence: number; // 0 - 100
  fallback?: string;
  assumptions?: string[];
}

export interface TestEvent {
  runId: string;
  testId: string;
  timestamp: string;
  status: 'passed' | 'failed' | 'quarantined' | 'skipped';
  durationMs: number;
  framework: 'playwright' | 'vitest' | 'jest' | 'k6' | 'cypress';
  environment: string;
  browser?: string;
  device?: string;
  commit?: string;
  branch?: string;
  retryIndex: number;
  failureCategory?: FailureCategory;
  errorSignature?: string;
}
