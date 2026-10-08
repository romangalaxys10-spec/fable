const endpoints = [
  { method: 'GET', url: 'http://localhost:3000/api/status' },
  { method: 'GET', url: 'http://localhost:3000/api/qa/doctor' },
  { method: 'POST', url: 'http://localhost:3000/api/qa/risk', body: { task: 'Stripe webhook retry queue' } },
  { method: 'POST', url: 'http://localhost:3000/api/qa/impact', body: { files: ['src/services/payment.ts'] } },
  { method: 'POST', url: 'http://localhost:3000/api/qa/generate', body: { task: 'Order fulfillment flow' } },
  { method: 'POST', url: 'http://localhost:3000/api/qa/triage', body: {} },
  { method: 'POST', url: 'http://localhost:3000/api/qa/heal', body: {} },
  { method: 'GET', url: 'http://localhost:3000/api/qa/graph' },
  { method: 'POST', url: 'http://localhost:3000/api/qa/release', body: {} },
  { method: 'POST', url: 'http://localhost:3000/api/reverify/check', body: { statement: 'package.json exists', targetPath: 'package.json' } },
  { method: 'POST', url: 'http://localhost:3000/api/stop-slop/score', body: { text: 'Concrete benchmark run completed in 12ms.' } },
  { method: 'POST', url: 'http://localhost:3000/api/strix/scan', body: { target: 'http://localhost:3000' } },
  { method: 'POST', url: 'http://localhost:3000/api/security-audit/run', body: { target: 'http://localhost:3000' } },
  { method: 'POST', url: 'http://localhost:3000/api/token-efficiency/budget', body: { task: 'Refactor token engine' } }
];

async function runApiAudit() {
  const results = [];
  for (const ep of endpoints) {
    const t0 = Date.now();
    try {
      const opts = {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' }
      };
      if (ep.body) opts.body = JSON.stringify(ep.body);

      const res = await fetch(ep.url, opts);
      const data = await res.json();
      const durationMs = Date.now() - t0;
      results.push({
        endpoint: `${ep.method} ${ep.url.replace('http://localhost:3000', '')}`,
        status: res.status,
        durationMs,
        healthy: res.ok,
        sampleKey: Object.keys(data).slice(0, 3).join(', ')
      });
    } catch (err) {
      results.push({
        endpoint: ep.url,
        status: 500,
        error: err.message,
        healthy: false
      });
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

runApiAudit();
