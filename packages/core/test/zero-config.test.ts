import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionGate } from '../src/zero-config';

test('ExecutionGate with missing credential returns NOT_RUN — never fabricated data', () => {
  delete process.env.FABLE_TEST_API_KEY;
  const outcome = ExecutionGate.execute<string>(
    { serviceName: 'fable-test-service', requiredKeyEnvVar: 'FABLE_TEST_API_KEY' },
    () => 'live-result',
  );
  assert.equal(outcome.status, 'NOT_RUN');
  assert.equal(outcome.reason, 'REQUIRES_CREDENTIALS');
  assert.equal(outcome.result, undefined, 'no result may be synthesized when the credential is absent');
  assert.equal(outcome.label, 'NOT_RUN');
  assert.match(outcome.detail, /not executed/);
});

test('ExecutionGate treats placeholder values as missing credentials', () => {
  process.env.FABLE_TEST_API_KEY = 'placeholder_key';
  try {
    const outcome = ExecutionGate.execute({ serviceName: 'svc', requiredKeyEnvVar: 'FABLE_TEST_API_KEY' }, () => 'x');
    assert.equal(outcome.status, 'NOT_RUN');
    assert.equal(outcome.reason, 'REQUIRES_CREDENTIALS');
  } finally {
    delete process.env.FABLE_TEST_API_KEY;
  }
});

test('ExecutionGate runs live and reports OBSERVED when credential + fn exist', () => {
  process.env.FABLE_TEST_API_KEY = 'real-credential-value';
  try {
    const outcome = ExecutionGate.execute({ serviceName: 'svc', requiredKeyEnvVar: 'FABLE_TEST_API_KEY' }, () => 'live-result');
    assert.equal(outcome.status, 'OK');
    assert.equal(outcome.result, 'live-result');
    assert.equal(outcome.label, 'OBSERVED');
    assert.equal(outcome.simulated, undefined);
  } finally {
    delete process.env.FABLE_TEST_API_KEY;
  }
});

test('ExecutionGate propagates live failures with the error surfaced', () => {
  process.env.FABLE_TEST_API_KEY = 'real-credential-value';
  try {
    const outcome = ExecutionGate.execute({ serviceName: 'svc', requiredKeyEnvVar: 'FABLE_TEST_API_KEY' }, () => {
      throw new Error('connection refused');
    });
    assert.equal(outcome.status, 'ERROR');
    assert.match(outcome.error ?? '', /connection refused/);
    assert.equal(outcome.result, undefined);
  } finally {
    delete process.env.FABLE_TEST_API_KEY;
  }
});

test('explicit simulation is allowed but watermarked simulated:true on every record', () => {
  delete process.env.FABLE_TEST_API_KEY;
  const outcome = ExecutionGate.execute(
    {
      serviceName: 'svc',
      requiredKeyEnvVar: 'FABLE_TEST_API_KEY',
      simulate: [{ id: 'demo-1', value: 42 }],
    },
    () => [{ id: 'live', value: 1 }],
  );
  assert.equal(outcome.status, 'SIMULATED');
  assert.equal(outcome.simulated, true, 'watermark mandatory');
  assert.equal(outcome.label, 'NOT_RUN');
  assert.match(outcome.detail, /watermarked/);
  if (outcome.result !== undefined) {
    for (const rec of outcome.result as Array<Record<string, unknown>>) {
      (rec as { simulated?: boolean }).simulated = true; // caller-side propagation contract
    }
    assert.equal((outcome.result as Array<{ simulated?: boolean }>)[0]?.simulated, true);
  }
});
