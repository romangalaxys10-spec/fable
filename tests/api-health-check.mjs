// Fable API health check — an audit with assertions, not just logs.
//
// Gatekeeping semantics:
//   - Every endpoint must answer as its contract says: 200 with a JSON object
//     for computed endpoints, or an honest 400 refusal (label/status NOT_RUN)
//     for POSTs whose minimal body carries no evidence. Anything else —
//     connection errors, 500s, non-JSON bodies, silent 200s on critical
//     endpoints — is collected as a failure.
//   - Exit code 1 when any check fails; 0 when all pass. Failures are never
//     log-only.
//
// The critical endpoints (/api/qa/doctor, /api/qa/risk, /api/qa/graph) are
// asserted strictly: they must return HTTP 200 with a JSON object.

const BASE_URL = process.env.FABLE_BASE_URL ?? 'http://localhost:3000';

const endpoints = [
  { method: 'GET', path: '/api/status', expect: 'ok' },
  { method: 'GET', path: '/api/qa/doctor', expect: 'ok', critical: true },
  { method: 'POST', path: '/api/qa/risk', body: { task: 'Stripe webhook retry queue' }, expect: 'ok', critical: true },
  { method: 'POST', path: '/api/qa/impact', body: { files: ['src/services/payment.ts'] }, expect: 'ok' },
  { method: 'POST', path: '/api/qa/generate', body: { task: 'Order fulfillment flow' }, expect: 'ok' },
  { method: 'POST', path: '/api/qa/triage', body: {}, expect: 'refusal-or-ok' },
  { method: 'POST', path: '/api/qa/heal', body: {}, expect: 'refusal-or-ok' },
  { method: 'GET', path: '/api/qa/graph', expect: 'ok', critical: true },
  { method: 'POST', path: '/api/qa/release', body: {}, expect: 'refusal-or-ok' },
  { method: 'POST', path: '/api/reverify/check', body: { statement: 'package.json exists', targetPath: 'package.json' }, expect: 'ok' },
  { method: 'POST', path: '/api/stop-slop/score', body: { text: 'Concrete benchmark run completed in 12ms.' }, expect: 'ok' },
  { method: 'POST', path: '/api/strix/scan', body: { target: BASE_URL }, expect: 'ok' },
  { method: 'POST', path: '/api/security-audit/run', body: { target: BASE_URL }, expect: 'ok' },
  { method: 'POST', path: '/api/token-efficiency/budget', body: { task: 'Refactor token engine' }, expect: 'ok' }
];

function isHonestRefusal(data) {
  return data !== null && typeof data === 'object' && (data.label === 'NOT_RUN' || data.status === 'NOT_RUN');
}

// Availability gate: this audit targets a LIVE server. When none is running
// (CI job without the studio, isolated environment) the checks would all fail
// with connection errors — false negatives that mask real regressions. Probe
// first; skip honestly when the server is absent. Set FABLE_REQUIRE_SERVER=1
// to turn the skip into a hard failure (for jobs that MUST have the server).
async function serverUp(timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/status`, { signal: AbortSignal.timeout(2_000) });
      if (res.ok) return true;
    } catch {
      // not up yet — retry until the deadline
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function runApiAudit() {
  if (!(await serverUp())) {
    const message = `SKIPPED — no server reachable at ${BASE_URL} (start it with: npm run dev). Nothing was audited; no false failures are reported.`;
    if (process.env.FABLE_REQUIRE_SERVER === '1') {
      console.error(`api-health-check: ${message}`);
      console.error('FABLE_REQUIRE_SERVER=1 is set — treating the missing server as a failure.');
      process.exit(1);
    }
    console.warn(`api-health-check: ${message}`);
    process.exit(0);
  }

  const results = [];
  const failures = [];

  for (const ep of endpoints) {
    const t0 = Date.now();
    const entry = {
      endpoint: `${ep.method} ${ep.path}`,
      critical: Boolean(ep.critical)
    };
    try {
      const opts = {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30_000)
      };
      if (ep.body !== undefined) opts.body = JSON.stringify(ep.body);

      const res = await fetch(`${BASE_URL}${ep.path}`, opts);
      entry.status = res.status;
      entry.durationMs = Date.now() - t0;

      let data = null;
      try {
        data = await res.json();
        entry.sampleKey = Object.keys(data).slice(0, 3).join(', ');
      } catch {
        entry.parseError = 'response body is not JSON';
      }

      if (ep.expect === 'ok') {
        // Must be a real 200 with a JSON object payload.
        if (res.status !== 200 || data === null || typeof data !== 'object') {
          entry.healthy = false;
          entry.reason = `expected 200 with a JSON object, got ${res.status}${entry.parseError ? ` (${entry.parseError})` : ''}`;
          failures.push(`${entry.endpoint}: ${entry.reason}`);
        } else {
          entry.healthy = true;
        }
      } else {
        // refusal-or-ok: 200 with a payload, or an honest 400 NOT_RUN refusal.
        if (res.ok && data !== null && typeof data === 'object') {
          entry.healthy = true;
        } else if (res.status === 400 && isHonestRefusal(data)) {
          entry.healthy = true;
          entry.refused = true;
          entry.reason = 'honest NOT_RUN refusal (no evidence in body — no fabricated data)';
        } else {
          entry.healthy = false;
          entry.reason = `expected 200 or an honest 400 NOT_RUN refusal, got ${res.status}`;
          failures.push(`${entry.endpoint}: ${entry.reason}`);
        }
      }
    } catch (err) {
      entry.status = 0;
      entry.healthy = false;
      entry.error = err.message;
      entry.durationMs = Date.now() - t0;
      failures.push(`${entry.endpoint}: request failed — ${err.message}`);
    }
    results.push(entry);
  }

  console.log(JSON.stringify(results, null, 2));

  const passed = results.filter((r) => r.healthy && !r.refused).length;
  const refused = results.filter((r) => r.refused).length;
  console.log(`\napi-health-check: ${passed} passed, ${refused} honest refusals, ${failures.length} failed (of ${results.length})`);
  if (failures.length > 0) {
    console.error('FAILED CHECKS:');
    for (const f of failures) console.error(`  ✖ ${f}`);
    process.exit(1);
  }
  console.log('ALL CHECKS PASSED');
}

runApiAudit();
