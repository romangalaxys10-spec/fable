import { ITestRunner, RunnerOptions, RunnerExecutionResult } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class PytestRunner implements ITestRunner {
  readonly name = 'pytest';

  async isAvailable(): Promise<boolean> {
    try {
      await execAsync('pytest --version');
      return true;
    } catch {
      return false;
    }
  }

  async run(testTargets: string[], options: RunnerOptions = {}): Promise<RunnerExecutionResult> {
    const targets = testTargets.length > 0 ? testTargets.join(' ') : 'tests/';
    const cmd = `pytest ${targets} --json-report --json-report-file=report.json`;

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
        durationMs: 35,
        items: [{
          id: 'pytest-dry-run',
          name: 'Pytest Synthetic Contract',
          suite: 'pytest suite',
          file: targets,
          status: 'passed',
          durationMs: 35,
          retryCount: 0
        }],
        rawOutput: '[DRY-RUN] pytest command planned: ' + cmd
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
