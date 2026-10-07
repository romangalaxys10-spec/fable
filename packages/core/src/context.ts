import { z } from 'zod';

export const QAContextModelSchema = z.object({
  application: z.object({
    name: z.string().default('app'),
    type: z.enum(['web', 'api', 'fullstack', 'cli', 'mobile', 'library']).default('fullstack'),
    framework: z.string().default('react/express/vite'),
    language: z.enum(['typescript', 'javascript', 'python', 'java', 'go']).default('typescript'),
    rootPath: z.string().default('.'),
  }),
  risk: z.object({
    overall: z.number().min(0).max(100).default(50),
    tier: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
    contributors: z.array(z.string()).default([]),
    areas: z.array(z.object({
      name: z.string(),
      score: z.number(),
      reason: z.string(),
    })).default([]),
  }),
  requirements: z.array(z.object({
    id: z.string(),
    title: z.string(),
    acceptanceCriteria: z.array(z.string()),
    criticality: z.enum(['P0', 'P1', 'P2', 'P3']).default('P1'),
  })).default([]),
  changedFiles: z.array(z.object({
    path: z.string(),
    status: z.enum(['added', 'modified', 'deleted', 'renamed']),
    symbolsTouched: z.array(z.string()).default([]),
    linesAdded: z.number().default(0),
    linesDeleted: z.number().default(0),
  })).default([]),
  affectedFeatures: z.array(z.string()).default([]),
  existingTests: z.array(z.object({
    id: z.string(),
    path: z.string(),
    framework: z.string(),
    layer: z.enum(['unit', 'integration', 'e2e', 'performance', 'security', 'a11y']),
    associatedFeatures: z.array(z.string()),
    lastStatus: z.enum(['passed', 'failed', 'quarantined', 'unknown']).default('unknown'),
  })).default([]),
  coverage: z.object({
    linePercent: z.number().min(0).max(100).default(0),
    branchPercent: z.number().min(0).max(100).default(0),
    criticalPathPercent: z.number().min(0).max(100).default(0),
    uncoveredHighRiskFiles: z.array(z.string()).default([]),
  }).default({
    linePercent: 0,
    branchPercent: 0,
    criticalPathPercent: 0,
    uncoveredHighRiskFiles: [],
  }),
  knownFlakes: z.array(z.object({
    testId: z.string(),
    flakeRate: z.number(),
    taxonomy: z.enum(['timing', 'shared_state', 'non_deterministic_data', 'resource_contention']),
    quarantined: z.boolean().default(true),
  })).default([]),
  knownDefects: z.array(z.object({
    id: z.string(),
    title: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    status: z.enum(['open', 'in_progress', 'verified_fixed']),
  })).default([]),
  environments: z.array(z.string()).default(['local', 'ci']),
  dependencies: z.record(z.string()).default({}),
  testData: z.object({
    factories: z.array(z.string()).default([]),
    deterministicSeeds: z.record(z.string()).default({}),
    cleanupRegistered: z.boolean().default(true),
  }).default({
    factories: [],
    deterministicSeeds: {},
    cleanupRegistered: true,
  }),
  qualityGates: z.object({
    unitPassingThreshold: z.number().default(100),
    maxFlakeRate: z.number().default(0),
    maxP95LatencyMs: z.number().default(300),
    requireAxeZeroCritical: z.boolean().default(true),
  }).default({
    unitPassingThreshold: 100,
    maxFlakeRate: 0,
    maxP95LatencyMs: 300,
    requireAxeZeroCritical: true,
  }),
});

export type QAContextModel = z.infer<typeof QAContextModelSchema>;

export function createDefaultQAContext(overrides?: Partial<QAContextModel>): QAContextModel {
  return QAContextModelSchema.parse(overrides || {});
}
