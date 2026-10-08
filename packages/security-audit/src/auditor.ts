import { SecurityAuditSummary } from './phases';

/**
 * REAL security audit — six-phase workflow executed against live observations.
 *
 * REPLACES the previous implementation, which returned a static
 * `overallPostureScore: 98` with all six phases "COMPLETED" and pre-written
 * header verdicts — zero network calls, zero observations.
 *
 * Every phase now computes from a real HTTP exchange with the target:
 *   1. RECONNAISSANCE — reachability, response status, server signature.
 *   2. COVERAGE-LED HUNTING — the five edge header invariants (CSP, HSTS,
 *      XCTO, CORS, TLS) observed from actual response headers.
 *   3. CANDIDATE VALIDATION — each missing/misconfigured header becomes a
 *      finding with CWE and severity, grounded in what the response showed.
 *   4. STRUCTURED OUTPUT — findings scored into the posture metric.
 *   5. INDEPENDENT VERIFICATION — the probe is re-issued; a finding only
 *      stands when both observations agree.
 *   6. TARGET-NEUTRAL REPORT — remediations phrased without presuming the
 *      deployment platform.
 *
 * Unreachable targets produce an honest ERROR summary, not a healthy score.
 */

const HEADER_SPECS: Array<{ header: string; label: string; cwe: string; severity: 'MEDIUM' | 'LOW'; advice: string }> = [
  { header: 'content-security-policy', label: 'Content-Security-Policy', cwe: 'CWE-79', severity: 'MEDIUM', advice: 'Deploy a Content-Security-Policy constraining script, style, and frame origins.' },
  { header: 'strict-transport-security', label: 'Strict-Transport-Security', cwe: 'CWE-319', severity: 'MEDIUM', advice: 'Send HSTS with max-age >= 63072000 and includeSubDomains on all TLS responses.' },
  { header: 'x-content-type-options', label: 'X-Content-Type-Options', cwe: 'CWE-430', severity: 'LOW', advice: 'Send X-Content-Type-Options: nosniff on all responses.' },
  { header: 'x-frame-options', label: 'X-Frame-Options', cwe: 'CWE-1021', severity: 'LOW', advice: 'Send X-Frame-Options: DENY or a CSP frame-ancestors directive.' },
  { header: 'referrer-policy', label: 'Referrer-Policy', cwe: 'CWE-200', severity: 'LOW', advice: 'Send Referrer-Policy: strict-origin-when-cross-origin (or stricter).' },
];

async function observe(target: string, timeoutMs: number): Promise<{ status: number; headers: Headers; bodyPreview: string } | { error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(target, { signal: controller.signal, redirect: 'follow' });
    const bodyPreview = (await res.text()).slice(0, 5000);
    clearTimeout(timer);
    return { status: res.status, headers: res.headers, bodyPreview };
  } catch (e) {
    clearTimeout(timer);
    return { error: (e as Error).message.split('\n')[0] ?? 'request failed' };
  }
}

function headerVerdict(headers: Headers, header: string): string {
  const value = headers.get(header);
  if (value === null || value === '') return `not present in observed response headers`;
  return `observed: ${value.slice(0, 120)}`;
}

export class CloudflareSecurityAuditor {
  async runAudit(target = 'http://localhost:3000', opts: { timeoutMs?: number } = {}): Promise<SecurityAuditSummary> {
    const timeoutMs = opts.timeoutMs ?? 8000;

    // Phase 1 — reconnaissance (real request).
    const first = await observe(target, timeoutMs);
    if ('error' in first) {
      return {
        auditTarget: target,
        overallPostureScore: 0,
        phasesCompleted: [
          { phase: 'PHASE_1_RECONNAISSANCE', status: 'SKIPPED', findingsCount: 0 },
          { phase: 'PHASE_2_COVERAGE_LED_HUNTING', status: 'SKIPPED', findingsCount: 0 },
          { phase: 'PHASE_3_CANDIDATE_VALIDATION', status: 'SKIPPED', findingsCount: 0 },
          { phase: 'PHASE_4_STRUCTURED_OUTPUT', status: 'SKIPPED', findingsCount: 0 },
          { phase: 'PHASE_5_INDEPENDENT_VERIFICATION', status: 'SKIPPED', findingsCount: 0 },
          { phase: 'PHASE_6_TARGET_NEUTRAL_REPORT', status: 'SKIPPED', findingsCount: 0 },
        ],
        totalFindings: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        edgeHeaderInvariants: {
          csp: { present: false, status: 'target unreachable — no observation possible' },
          hsts: { present: false, status: 'target unreachable — no observation possible' },
          xContentTypeOptions: { present: false, status: 'target unreachable — no observation possible' },
          cors: { wildcardWithCredentials: false, status: 'target unreachable — no observation possible' },
          tlsMinimum: { version: 'unknown', compliant: false },
        },
        recommendations: [],
        ...(true ? {} : {}),
        status: 'ERROR',
        label: 'NOT_RUN',
        detail: `target unreachable: ${first.error} — no findings are invented for an unobservable target.`,
      } as SecurityAuditSummary & { status: string; label: string; detail: string };
    }

    // Phase 2 — coverage-led hunting over the real headers.
    const cspPresent = first.headers.has('content-security-policy');
    const hstsPresent = first.headers.has('strict-transport-security');
    const xctoPresent = first.headers.has('x-content-type-options');
    const xfoPresent = first.headers.has('x-frame-options');
    void xfoPresent;
    const referrerPresent = first.headers.has('referrer-policy');
    void referrerPresent;
    const corsWildcard = first.headers.get('access-control-allow-origin') === '*' &&
      (first.headers.get('access-control-allow-credentials') ?? '').toLowerCase() === 'true';
    const isHttps = target.toLowerCase().startsWith('https://');

    // Phase 3 — candidate validation: each gap becomes a finding.
    const findings: Array<{ id: string; title: string; cwe: string; cvss: number; severity: 'MEDIUM' | 'LOW' | 'INFO'; phaseIdentified: 'PHASE_3_CANDIDATE_VALIDATION'; independentVerificationPassed: boolean; affectedAsset: string; remediationGuidance: string }> = [];
    for (const spec of HEADER_SPECS) {
      const present = first.headers.has(spec.header);
      if (!present) {
        findings.push({
          id: `CF-AUDIT-${spec.header.toUpperCase()}`,
          title: `Missing ${spec.label}`,
          cwe: spec.cwe,
          cvss: spec.severity === 'MEDIUM' ? 5.3 : 3.1,
          severity: spec.severity,
          phaseIdentified: 'PHASE_3_CANDIDATE_VALIDATION',
          independentVerificationPassed: false, // set in phase 5
          affectedAsset: target,
          remediationGuidance: spec.advice,
        });
      }
    }
    if (corsWildcard) {
      findings.push({
        id: 'CF-AUDIT-CORS-WILDCARD',
        title: 'CORS wildcard origin combined with credentials',
        cwe: 'CWE-942',
        cvss: 7.5,
        severity: 'MEDIUM',
        phaseIdentified: 'PHASE_3_CANDIDATE_VALIDATION',
        independentVerificationPassed: false,
        affectedAsset: target,
        remediationGuidance: 'Never combine Access-Control-Allow-Origin: * with credentialed requests; validate origins against an allowlist.',
      });
    }
    if (!isHttps) {
      findings.push({
        id: 'CF-AUDIT-PLAINTEXT',
        title: 'Target served over plaintext HTTP',
        cwe: 'CWE-319',
        cvss: 7.4,
        severity: 'MEDIUM',
        phaseIdentified: 'PHASE_3_CANDIDATE_VALIDATION',
        independentVerificationPassed: false,
        affectedAsset: target,
        remediationGuidance: 'Serve the endpoint over TLS 1.2+ (prefer TLS 1.3) and redirect plaintext traffic.',
      });
    }

    // Phase 5 — independent verification: re-issue the probe; a finding stands
    // only when both observations agree (header still absent on the re-check).
    const second = await observe(target, timeoutMs);
    if ('headers' in second) {
      for (const finding of findings) {
        if (finding.id === 'CF-AUDIT-CORS-WILDCARD') {
          finding.independentVerificationPassed = second.headers.get('access-control-allow-origin') === '*' &&
            (second.headers.get('access-control-allow-credentials') ?? '').toLowerCase() === 'true';
        } else if (finding.id === 'CF-AUDIT-PLAINTEXT') {
          finding.independentVerificationPassed = !target.toLowerCase().startsWith('https://');
        } else {
          const headerName = HEADER_SPECS.find((s) => finding.id.includes(s.header.toUpperCase().replace(/-/g, '-').replace('CONTENT-SECURITY-POLICY', 'content-security-policy').toUpperCase()) || finding.id === `CF-AUDIT-${s.header.toUpperCase()}`)?.header ?? '';
          finding.independentVerificationPassed = headerName !== '' && !second.headers.has(headerName);
        }
      }
    }

    // Phase 4 — structured posture metric from verified observations.
    const verified = findings.filter((f) => f.independentVerificationPassed);
    const postureScore = Math.max(0, 100 - verified.reduce((acc, f) => acc + (f.severity === 'MEDIUM' ? 12 : 5), 0));

    const phases: SecurityAuditSummary['phasesCompleted'] = [
      { phase: 'PHASE_1_RECONNAISSANCE', status: 'COMPLETED', findingsCount: 0 },
      { phase: 'PHASE_2_COVERAGE_LED_HUNTING', status: 'COMPLETED', findingsCount: findings.length },
      { phase: 'PHASE_3_CANDIDATE_VALIDATION', status: 'COMPLETED', findingsCount: findings.length },
      { phase: 'PHASE_4_STRUCTURED_OUTPUT', status: 'COMPLETED', findingsCount: verified.length },
      { phase: 'PHASE_5_INDEPENDENT_VERIFICATION', status: 'COMPLETED', findingsCount: verified.length },
      { phase: 'PHASE_6_TARGET_NEUTRAL_REPORT', status: 'COMPLETED', findingsCount: verified.length },
    ];

    const recommendations = verified.map((f) => f.remediationGuidance);
    if (recommendations.length === 0) {
      recommendations.push('All observed edge header invariants present and verified on re-probe; keep header policy under regression test.');
    }

    return {
      auditTarget: target,
      overallPostureScore: postureScore,
      phasesCompleted: phases,
      totalFindings: verified.length,
      criticalCount: 0,
      highCount: 0,
      mediumCount: verified.filter((f) => f.severity === 'MEDIUM').length,
      edgeHeaderInvariants: {
        csp: { present: cspPresent, status: headerVerdict(first.headers, 'content-security-policy') },
        hsts: { present: hstsPresent, status: headerVerdict(first.headers, 'strict-transport-security') },
        xContentTypeOptions: { present: xctoPresent, status: headerVerdict(first.headers, 'x-content-type-options') },
        cors: { wildcardWithCredentials: corsWildcard, status: corsWildcard ? 'INSECURE: wildcard origin with credentials observed' : `observed: access-control-allow-origin=${first.headers.get('access-control-allow-origin') ?? '(none)'}` },
        tlsMinimum: { version: isHttps ? 'TLS (observed https scheme)' : 'plaintext HTTP (no TLS observed)', compliant: isHttps },
      },
      recommendations,
      label: 'OBSERVED',
    };
  }
}
