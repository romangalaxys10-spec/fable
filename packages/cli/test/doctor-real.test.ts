import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runQADoctor } from '../src/doctor';

test('runQADoctor performs REAL probes — node version matches the running runtime', async () => {
  const report = await runQADoctor();
  assert.equal(report.label, 'OBSERVED');
  const nodeCheck = report.checks.find((c) => c.category.toLowerCase().includes('runtime') || c.id.includes('node'));
  assert.ok(nodeCheck, 'a node runtime check must exist');
  if (nodeCheck.status === 'PASS') {
    assert.match(nodeCheck.details, new RegExp(process.version.slice(1, 5).replace('.', '\\.')), `observed detail must contain the probed version, got: ${nodeCheck.details}`);
  } else {
    assert.ok(nodeCheck.details.length > 10, 'failures must describe what was observed');
  }
  for (const c of report.checks) {
    assert.ok(c.details.length > 5, `every check must record what was actually observed: ${c.id}`);
    assert.ok(!/always|hardcoded|static/i.test(c.details));
  }
});

test('healthScore is computed from check outcomes, not a constant', async () => {
  const report = await runQADoctor();
  const total = report.checks.length;
  assert.ok(total >= 10, `doctor must run a real check battery, got ${total}`);
  assert.equal(report.checksPassed + report.checksWarn + report.checksFailed, total);
  const expected = Math.round(
    ((report.checksPassed + report.checksWarn * 0.5) / total) * 100,
  );
  assert.ok(
    Math.abs(report.healthScore - expected) <= 1,
    `healthScore ${report.healthScore} must derive from ${report.checksPassed} pass / ${report.checksWarn} warn / ${report.checksFailed} fail`,
  );
  if (report.checksFailed === 0 && report.checksWarn === 0) assert.equal(report.overallStatus, 'HEALTHY');
  if (report.checksFailed > 0) assert.equal(report.overallStatus, 'DEGRADED');
});

test('FS-WRITE passes when the temp filesystem is actually writable', async () => {
  const report = await runQADoctor();
  const fsWrite = report.checks.find((c) => c.id === 'FS-WRITE');
  assert.ok(fsWrite, 'FS-WRITE check must exist');
  // mkdtempSync in this suite proves tmp is writable, so a FAIL here means the
  // probe itself is broken (regression guard for the size===4 off-by-one bug).
  assert.equal(fsWrite.status, 'PASS', `FS-WRITE probe must succeed on a writable tmp: ${fsWrite.details}`);
  assert.match(fsWrite.details, /verified a 5-byte temp file/);
});
