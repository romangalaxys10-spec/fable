import { getRunner, RunnerExecutionResult, RunnerOptions } from '../../runners/src';

export class ExecutionAgent {
  async execute(params: {
    runner: 'playwright' | 'pytest' | 'k6' | 'zap' | 'appium';
    targets: string[];
    options?: RunnerOptions;
  }): Promise<RunnerExecutionResult> {
    const runner = getRunner(params.runner);
    return await runner.run(params.targets, params.options || { dryRun: true });
  }

  async runSuite(targets: string[], dryRun = true): Promise<RunnerExecutionResult[]> {
    const runner = getRunner('playwright');
    const result = await runner.run(targets, { dryRun });
    return [result];
  }
}
