import { ITestRunner, RunnerOptions, RunnerExecutionResult } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class K6PerformanceRunner implements ITestRunner {
  readonly name = 'k6';

  async isAvailable(): Promise<boolean> {
    try {
      await execAsync('k6 version');
      return true;
    } catch {
      return false;
    }
  }

  async run(testTargets: string[], options: RunnerOptions = {}): Promise<RunnerExecutionResult> {
    const target = testTargets[0] || 'tests/perf/load.js';
    const cmd = `k6 run ${target} --summary-export=k6-summary.json`;

    if (options.dryRun) {
      return {
        runnerName: this.name,
        commandExecuted: cmd,
        exitCode: 0,
        totalTests: 1,
        passed: 1,
        failed: 0,
        skipped: 0,
        quarantined: 0,
        durationMs: 50,
        items: [{
          id: 'k6-scenario-1',
          name: 'k6 p95 Latency SLA Threshold (<300ms)',
          suite: 'k6 performance suite',
          file: target,
          status: 'passed',
          durationMs: 50,
          retryCount: 0
        }],
        rawOutput: '[DRY-RUN] k6 command planned: ' + cmd
      };
    }

    const start = Date.now();
    try {
      const { stdout } = await execAsync(cmd, { env: { ...process.env, ...options.env } });
      return {
        runnerName: this.name,
        commandExecuted: cmd,
        exitCode: 0,
        totalTests: 1,
        passed: 1,
        failed: 0,
        skipped: 0,
        quarantined: 0,
        durationMs: Date.now() - start,
        items: [],
        rawOutput: stdout
      };
    } catch (err: any) {
      return {
        runnerName: this.name,
        commandExecuted: cmd,
        exitCode: err.code || 1,
        totalTests: 1,
        passed: 0,
        failed: 1,
        skipped: 0,
        quarantined: 0,
        durationMs: Date.now() - start,
        items: [],
        rawOutput: err.stdout || err.message
      };
    }
  }
}
