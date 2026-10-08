export type LifecycleStage =
  | 'DISCOVER'
  | 'MODEL'
  | 'PLAN'
  | 'GENERATE'
  | 'VALIDATE'
  | 'EXECUTE'
  | 'OBSERVE'
  | 'TRIAGE'
  | 'HEAL_FIX'
  | 'VERIFY'
  | 'MEASURE'
  | 'LEARN';

export interface LifecycleStepResult {
  stage: LifecycleStage;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  summary: string;
  evidence: string[];
  durationMs: number;
}

export interface FullLifecycleExecution {
  taskId: string;
  currentStage: LifecycleStage;
  steps: LifecycleStepResult[];
  overallStatus: 'SUCCESS' | 'BLOCKED' | 'WARNING';
}

export class QALifecycleEngine {
  private static readonly STAGES: LifecycleStage[] = [
    'DISCOVER',
    'MODEL',
    'PLAN',
    'GENERATE',
    'VALIDATE',
    'EXECUTE',
    'OBSERVE',
    'TRIAGE',
    'HEAL_FIX',
    'VERIFY',
    'MEASURE',
    'LEARN'
  ];

  static getOrderedStages(): LifecycleStage[] {
    return [...this.STAGES];
  }

  static createInitialLifecycle(taskId: string): FullLifecycleExecution {
    return {
      taskId,
      currentStage: 'DISCOVER',
      steps: this.STAGES.map(stage => ({
        stage,
        status: 'PENDING',
        summary: `Awaiting execution of ${stage} stage`,
        evidence: [],
        durationMs: 0
      })),
      overallStatus: 'SUCCESS'
    };
  }
}
