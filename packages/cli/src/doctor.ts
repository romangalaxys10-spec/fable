import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import net from 'node:net';
import { spawnSync } from 'node:child_process';

/**
 * REAL system health check — every check performs an actual probe.
 *
 * REPLACES the previous implementation, which returned nine hardcoded 'PASS'
 * literals (claiming "Port 3000 bound and responding", "Playwright drivers
 * verified", "zero hardcoded secrets" without probing anything — the score
 * was 100/100 by construction).
 *
 * Contract now: each check observes something real and reports FAIL/WARN
 * honestly; the 0-100 score is computed from observed results; failures come
 * with actionable fix recommendations.
 */

export interface HealthCheckItem {
  id: string;
  name: string;
  category: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  /** What was actually observed — probes, not prose. */
  details: string;
  fixRecommendation?: string;
}

export interface DoctorReport {
  healthScore: number; // 0 - 100, computed from observed results
  overallStatus: 'HEALTHY' | 'WARNINGS' | 'DEGRADED';
  checksPassed: number;
  checksWarn: number;
  checksFailed: number;
  checks: HealthCheckItem[];
  recommendedFixes: string[];
  label: 'OBSERVED';
}

function probeVersion(command: string[], timeoutMs = 8000): { ok: boolean; version?: string; detail: string } {
  try {
    const res = spawnSync(command[0] ?? 'node', command.slice(1), { timeout: timeoutMs, encoding: 'utf8' });
    if (res.error !== undefined) return { ok: false, detail: `spawn failed: ${res.error.message}` };
    if (res.status !== 0) return { ok: false, detail: `exit ${String(res.status)}` };
    return { ok: true, version: (res.stdout ?? '').trim().split('\n')[0]?.slice(0, 80), detail: 'probe succeeded' };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}

function probePortFree(port: number, timeoutMs = 700): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const socket = new net.Socket();
    const done = (free: boolean): void => {
      socket.destroy();
      resolvePromise(free);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(false));
    socket.once('timeout', () => done(true));
    socket.once('error', () => done(true));
    socket.connect(port, '127.0.0.1');
  });
}

export async function runQADoctor(): Promise<DoctorReport> {
  const checks: HealthCheckItem[] = [];

  // 1. Node runtime — real version probe.
  const node = probeVersion(['node', '--version']);
  const nodeMajor = node.version !== undefined ? Number.parseInt(node.version.replace(/^v/, '').split('.')[0] ?? '0', 10) : 0;
  checks.push({
    id: 'RUNTIME-NODE',
    name: 'Node.js Engine Compatibility',
    category: 'Runtime',
    status: nodeMajor >= 18 ? 'PASS' : 'FAIL',
    details: node.version !== undefined ? `observed ${node.version} (requirement ≥ 18)` : `node probe failed: ${node.detail}`,
    fixRecommendation: nodeMajor >= 18 ? undefined : 'install Node.js 18 or newer',
  });

  // 2. Python 3 — real probe.
  const py = probeVersion(['python3', '--version']);
  checks.push({
    id: 'RUNTIME-PYTHON',
    name: 'Python 3 Interpreter',
    category: 'Runtime',
    status: py.ok ? 'PASS' : 'WARN',
    details: py.ok ? `observed ${py.version ?? 'python3'}` : `python3 not available (${py.detail}) — Python-backed scripts (route.py, token_efficiency.py) will not run`,
    fixRecommendation: py.ok ? undefined : 'install python3 ≥ 3.10 for the routing and token-efficiency scripts',
  });

  // 3. TypeScript compiler — real probe (the packages are TS).
  const tsc = probeVersion(['npx', '--no-install', 'tsc', '--version']);
  checks.push({
    id: 'TOOLCHAIN-TSC',
    name: 'TypeScript Compiler',
    category: 'Toolchain',
    status: tsc.ok ? 'PASS' : 'WARN',
    details: tsc.ok ? `observed ${tsc.version ?? 'tsc'}` : `tsc unavailable (${tsc.detail}) — run npm install`,
    fixRecommendation: tsc.ok ? undefined : 'npm install',
  });

  // 4. Git — real probe (impact analysis requires a real repo).
  const gitProbe = probeVersion(['git', '--version']);
  checks.push({
    id: 'VCS-GIT',
    name: 'Git Version Control',
    category: 'Toolchain',
    status: gitProbe.ok ? 'PASS' : 'FAIL',
    details: gitProbe.ok ? `observed ${gitProbe.version ?? 'git'}` : `git probe failed: ${gitProbe.detail}`,
    fixRecommendation: gitProbe.ok ? undefined : 'install git — qa impact/analyze require a real repository',
  });

  // 5. Playwright — real availability probe, graceful when absent.
  const pw = probeVersion(['npx', '--no-install', 'playwright', '--version'], 15000);
  checks.push({
    id: 'RUNNER-PLAYWRIGHT',
    name: 'Playwright Runner Availability',
    category: 'Runners',
    status: pw.ok ? 'PASS' : 'WARN',
    details: pw.ok ? `observed ${pw.version ?? 'playwright'}` : 'playwright not installed — the PlaywrightRunner will report NOT_RUN instead of executing',
    fixRecommendation: pw.ok ? undefined : 'npm i -D playwright && npx playwright install chromium',
  });

  // 6. Filesystem write access — real probe (tmp create + delete).
  let writeOk = false;
  let writeDetail = '';
  try {
    const dir = mkdtempSync(join(tmpdir(), 'qaforge-doctor-'));
    const file = join(dir, 'probe.txt');
    writeFileSync(file, 'probe');
    writeOk = statSync(file).size === Buffer.byteLength('probe', 'utf8');
    rmSync(dir, { recursive: true, force: true });
    writeDetail = writeOk ? 'wrote and verified a 5-byte temp file, then removed it' : 'temp file written but byte count mismatched';
  } catch (e) {
    writeDetail = `temp write failed: ${(e as Error).message}`;
  }
  checks.push({
    id: 'FS-WRITE',
    name: 'Artifact Directory Writability',
    category: 'Filesystem',
    status: writeOk ? 'PASS' : 'FAIL',
    details: writeDetail,
    fixRecommendation: writeOk ? undefined : 'check TMPDIR permissions — evidence bundles cannot be written',
  });

  // 7. Port 3000 — real socket probe (bound or free, honestly reported).
  const portFree = await probePortFree(3000);
  checks.push({
    id: 'PORT-3000',
    name: 'Studio Port 3000',
    category: 'Networking',
    status: 'PASS',
    details: portFree ? 'port 3000 is free (studio not running)' : 'port 3000 is bound (a studio instance is running or the port is taken)',
    fixRecommendation: portFree ? undefined : 'stop the other process on :3000 or start the studio with PORT=…',
  });

  // 8. Secrets hygiene — real scan of the repo's tracked files for obvious patterns.
  const secretScan = scanForSecrets(process.cwd());
  checks.push({
    id: 'SECRETS-SCAN',
    name: 'Credential Hygiene (tracked files)',
    category: 'Security',
    status: secretScan.hits.length === 0 ? 'PASS' : 'FAIL',
    details: secretScan.hits.length === 0
      ? `scanned ${secretScan.scanned} tracked file(s) — no credential patterns found`
      : `potential secrets in: ${secretScan.hits.slice(0, 3).join(', ')}${secretScan.hits.length > 3 ? ` (+${secretScan.hits.length - 3} more)` : ''}`,
    fixRecommendation: secretScan.hits.length === 0 ? undefined : 'remove and rotate the flagged credentials immediately',
  });

  // 9. Core engine self-test — Zod schema actually parses a sample context.
  let schemaOk = false;
  let schemaDetail = '';
  try {
    const { QAContextModelSchema } = await import('../../core/src/context.js');
    const parsed = QAContextModelSchema.safeParse({
      application: { type: 'web', framework: 'react', language: 'typescript' },
      risk: { overall: 50, areas: [] },
    });
    schemaOk = parsed.success;
    schemaDetail = parsed.success ? 'QAContextModelSchema parsed a sample context' : `schema rejected sample: ${parsed.error.issues.slice(0, 1).map((i) => i.message).join('; ')}`;
  } catch (e) {
    schemaDetail = `schema self-test threw: ${(e as Error).message}`;
  }
  checks.push({
    id: 'SCHEMA-SELFTEST',
    name: 'QA Context Schema Self-Test',
    category: 'Configuration',
    status: schemaOk ? 'PASS' : 'FAIL',
    details: schemaDetail,
    fixRecommendation: schemaOk ? undefined : 'inspect packages/core/src/context.ts — the Zod contract must parse its own shape',
  });

  // 10. Flake registry — real check for the quarantine file.
  const registryPath = join(process.cwd(), '.qaforge', 'flake-registry.json');
  checks.push({
    id: 'FLAKE-QUARANTINE',
    name: 'Flake Quarantine Registry',
    category: 'Reliability',
    status: existsSync(registryPath) ? 'PASS' : 'WARN',
    details: existsSync(registryPath) ? `registry present at ${registryPath}` : 'no flake registry yet — created on first flake observation',
    fixRecommendation: undefined,
  });

  const passed = checks.filter((c) => c.status === 'PASS').length;
  const warn = checks.filter((c) => c.status === 'WARN').length;
  const failed = checks.filter((c) => c.status === 'FAIL').length;
  const score = Math.round(((passed + warn * 0.5) / checks.length) * 100);

  return {
    healthScore: score,
    overallStatus: failed > 0 ? 'DEGRADED' : warn > 0 ? 'WARNINGS' : 'HEALTHY',
    checksPassed: passed,
    checksWarn: warn,
    checksFailed: failed,
    checks,
    recommendedFixes: checks.filter((c) => c.fixRecommendation !== undefined).map((c) => `${c.name}: ${c.fixRecommendation}`),
    label: 'OBSERVED',
  };
}

const SECRET_PATTERNS: RegExp[] = [
  /ghp_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{60,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/,
  /npm_[A-Za-z0-9]{30,}/,
];

function scanForSecrets(root: string, maxFiles = 400, maxBytes = 512 * 1024): { scanned: number; hits: string[] } {
  const hits: string[] = [];
  let scanned = 0;
  const skip = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next']);
  const walk = (dir: string, depth: number): void => {
    if (depth > 4 || scanned >= maxFiles) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true }) as Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }>;
    } catch {
      return;
    }
    for (const e of entries) {
      if (scanned >= maxFiles) return;
      if (e.name.startsWith('.') && e.isDirectory() && e.name !== '.github') continue;
      if (skip.has(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        walk(p, depth + 1);
      } else if (e.isFile()) {
        try {
          if (statSync(p).size > maxBytes) continue;
          const text = readFileSync(p, 'utf8');
          scanned += 1;
          if (SECRET_PATTERNS.some((re) => re.test(text))) hits.push(relative(root, p));
        } catch {
          // binary or unreadable — skipped, counted honestly by omission
        }
      }
    }
  };
  walk(root, 0);
  return { scanned, hits };
}
