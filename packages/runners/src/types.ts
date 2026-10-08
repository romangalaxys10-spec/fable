export interface RunnerOptions {
  headless?: boolean;
  retries?: number;
  timeoutMs?: number;
  shards?: { current: number; total: number };
  grep?: string;
  env?: Record<string, string>;
  recordTrace?: 'on' | 'off' | 'retain-on-failure';
  recordVideo?: 'on' | 'off' | 'retain-on-failure';
  dryRun?: boolean;
}

export interface TestResultItem {
  id: string;
  name: string;
  suite: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped' | 'quarantined';
  durationMs: number;
  retryCount: number;
  error?: {
    message: string;
    stack?: string;
    diff?: { expected: string; actual: string };
    location?: { file: string; line: number; column: number };
  };
  evidence?: {
    traceZipPath?: string;
    screenshotPath?: string;
    consoleLogs?: string[];
    networkHarPath?: string;
  };
}

export interface RunnerExecutionResult {
  runnerName: string;
  commandExecuted: string;
  exitCode: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  quarantined: number;
  durationMs: number;
  items: TestResultItem[];
  rawOutput: string;
}

export interface ITestRunner {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  run(testTargets: string[], options?: RunnerOptions): Promise<RunnerExecutionResult>;
}
