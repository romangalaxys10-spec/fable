export interface AllureTestResult {
  uuid: string;
  historyId: string;
  name: string;
  status: 'passed' | 'failed' | 'broken' | 'skipped';
  statusDetails?: { message: string; trace: string };
  stage: 'finished';
  steps: { name: string; status: 'passed' | 'failed'; start: number; stop: number }[];
  attachments: { name: string; source: string; type: string }[];
  parameters: { name: string; value: string }[];
  start: number;
  stop: number;
  labels: { name: string; value: string }[];
}

export function formatAllureResult(test: {
  uuid: string;
  name: string;
  suite: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  error?: { message: string; stack?: string };
}): AllureTestResult {
  const start = Date.now() - test.durationMs;
  const stop = Date.now();
  const allureStatus = test.status === 'failed' ? 'failed' : test.status === 'skipped' ? 'skipped' : 'passed';

  return {
    uuid: test.uuid,
    historyId: `${test.suite}#${test.name}`,
    name: test.name,
    status: allureStatus,
    statusDetails: test.error ? { message: test.error.message, trace: test.error.stack || '' } : undefined,
    stage: 'finished',
    steps: [
      { name: 'Arrange test fixtures & auth session', status: 'passed', start, stop: start + 20 },
      { name: 'Execute test assertion steps', status: allureStatus, start: start + 20, stop }
    ],
    attachments: [],
    parameters: [{ name: 'framework', value: 'qaforge-engine' }],
    start,
    stop,
    labels: [
      { name: 'suite', value: test.suite },
      { name: 'framework', value: 'qaforge' },
      { name: 'language', value: 'typescript' }
    ]
  };
}
