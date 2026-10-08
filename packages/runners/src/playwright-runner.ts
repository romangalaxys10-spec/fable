import { ITestRunner, RunnerOptions, RunnerExecutionResult, TestResultItem } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class PlaywrightRunner implements ITestRunner {
  readonly name = 'Playwright';

  async isAvailable(): Promise<boolean> {
    try {
      await execAsync('npx playwright --version');
      return true;
    } catch {
      return false;
    }
  }

  async run(testTargets: string[], options: RunnerOptions = {}): Promise<RunnerExecutionResult> {
    const targets = testTargets.length > 0 ? testTargets.join(' ') : 'tests/';
    const args: string[] = ['npx playwright test', targets];

    if (options.headless === false) args.push('--headed');
    if (options.retries !== undefined) args.push(`--retries=${options.retries}`);
    if (options.grep) args.push(`-g "${options.grep}"`);
    if (options.shards) args.push(`--shard=${options.shards.current}/${options.shards.total}`);
    if (options.recordTrace) args.push(`--trace=${options.recordTrace}`);
    args.push('--reporter=json');

    const cmd = args.join(' ');

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
        durationMs: 42,
        items: [
          {
            id: 'dry-run-001',
            name: 'Dry Run Synthetic Check',
            suite: 'Playwright Suite',
            file: targets.split(' ')[0] || 'tests/sample.spec.ts',
            status: 'passed',
            durationMs: 42,
            retryCount: 0,
          }
        ],
        rawOutput: '[DRY-RUN] Command planned: ' + cmd,
      };
    }

    const start = Date.now();
    try {
      const { stdout, stderr } = await execAsync(cmd, { env: { ...process.env, ...options.env } });
      const durationMs = Date.now() - start;
      const parsed = this.parseJsonReport(stdout);
      return {
        runnerName: this.name,
        commandExecuted: cmd,
        exitCode: 0,
        ...parsed,
        durationMs,
        rawOutput: stdout + (stderr ? '\n' + stderr : ''),
      };
    } catch (err: any) {
      const durationMs = Date.now() - start;
      const stdout = err.stdout || '';
      const stderr = err.stderr || err.message;
      const parsed = this.parseJsonReport(stdout);
      return {
        runnerName: this.name,
        commandExecuted: cmd,
        exitCode: err.code || 1,
        ...parsed,
        durationMs,
        rawOutput: stdout + '\n' + stderr,
      };
    }
  }

  private parseJsonReport(stdout: string): {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    quarantined: number;
    items: TestResultItem[];
  } {
    try {
      const data = JSON.parse(stdout);
      const items: TestResultItem[] = [];
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      let quarantined = 0;

      if (data.suites) {
        const traverse = (s: any) => {
          if (s.specs) {
            for (const spec of s.specs) {
              for (const test of spec.tests || []) {
                const res = test.results?.[0];
                const status = res?.status === 'passed' ? 'passed' : res?.status === 'skipped' ? 'skipped' : 'failed';
                if (status === 'passed') passed++;
                else if (status === 'skipped') skipped++;
                else failed++;

                items.push({
                  id: spec.id || `${spec.file}#${spec.title}`,
                  name: spec.title,
                  suite: s.title || 'Suite',
                  file: spec.file,
                  status,
                  durationMs: res?.duration || 0,
                  retryCount: (test.results?.length || 1) - 1,
                  error: res?.error ? { message: res.error.message, stack: res.error.stack } : undefined,
                  evidence: {
                    screenshotPath: res?.attachments?.find((a: any) => a.name === 'screenshot')?.path,
                    traceZipPath: res?.attachments?.find((a: any) => a.name === 'trace')?.path,
                  }
                });
              }
            }
          }
          if (s.suites) {
            for (const child of s.suites) traverse(child);
          }
        };
        for (const root of data.suites) traverse(root);
      }

      return {
        totalTests: items.length,
        passed,
        failed,
        skipped,
        quarantined,
        items
      };
    } catch {
      return {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        quarantined: 0,
        items: []
      };
    }
  }
}
