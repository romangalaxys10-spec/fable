import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverProject } from '../../agents/src/discovery-agent';
import { getRunner } from '../../runners/src';
import { calculateRisk } from '../../core/src/risk';
import { analyzeImpact } from '../../core/src/impact';
import { generateEnterpriseTestSuite } from '../../agents/src/generator-agent';
import { triageSingleFailure, clusterFailures } from '../../agents/src/triage-agent';
import { evaluateHealing } from '../../healing/src/healer';
import { QualityGovernanceAgent } from '../../agents/src/governance-agent';

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  handler: (args: any) => Promise<any> | any;
}

const governance = new QualityGovernanceAgent();

export const MCP_TOOLS: Record<string, MCPToolDefinition> = {
  discover_project: {
    name: 'discover_project',
    description: 'Discovers project structure, frameworks, languages, test topology, and CI systems.',
    inputSchema: {
      type: 'object',
      properties: { rootDir: { type: 'string', description: 'Root directory of the project' } }
    },
    handler: (args: { rootDir?: string }) => discoverProject(args.rootDir || '.')
  },

  analyze_risk: {
    name: 'analyze_risk',
    description: 'Computes multi-factor risk score (0-100), top contributors, and required test layers.',
    inputSchema: {
      type: 'object',
      properties: { task: { type: 'string', description: 'Task, PR summary or diff context' } },
      required: ['task']
    },
    handler: (args: { task: string }) => calculateRisk({}, args.task)
  },

  list_relevant_tests: {
    name: 'list_relevant_tests',
    description: 'Performs Change Impact Analysis on modified files and lists affected test subsets.',
    inputSchema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string' } },
        commitRange: { type: 'string' }
      }
    },
    handler: async (args: { files?: string[]; commitRange?: string; repoRoot?: string }) => {
      // REAL impact analysis against the actual repository — the default file
      // list of the old implementation invented changes that did not exist.
      const repoRoot = args.repoRoot || process.cwd();
      const { analyzeImpactRepo } = await import('../../core/src/impact');
      if (args.files !== undefined && args.files.length > 0) {
        return analyzeImpact(args.files, args.commitRange, repoRoot);
      }
      return analyzeImpactRepo({ repoRoot, commitRange: args.commitRange });
    }
  },

  generate_tests: {
    name: 'generate_tests',
    description: 'Generates enterprise test cases across 8 heuristics with pyramid distribution.',
    inputSchema: {
      type: 'object',
      properties: {
        featureTitle: { type: 'string' },
        acceptanceCriteria: { type: 'array', items: { type: 'string' } },
        framework: { type: 'string', enum: ['playwright', 'vitest', 'jest', 'pytest', 'k6'] }
      },
      required: ['featureTitle']
    },
    handler: (args: { featureTitle: string; acceptanceCriteria?: string[]; framework?: any }) =>
      generateEnterpriseTestSuite({
        featureTitle: args.featureTitle,
        acceptanceCriteria: args.acceptanceCriteria || ['Nominal execution', 'Edge case handling'],
        framework: args.framework || 'vitest'
      })
  },

  run_tests: {
    name: 'run_tests',
    description: 'Executes test targets via the specified runner adapter. The returned counts come from the actual runner output — a runner that is unavailable returns status NOT_RUN, never fabricated passes.',
    inputSchema: {
      type: 'object',
      properties: {
        targets: { type: 'array', items: { type: 'string' } },
        runner: { type: 'string', enum: ['playwright', 'pytest', 'k6', 'zap', 'appium'] },
        dryRun: { type: 'boolean' }
      }
    },
    handler: async (args: { targets?: string[]; runner?: 'playwright' | 'pytest' | 'k6' | 'zap' | 'appium'; dryRun?: boolean }) => {
      const runnerType = args.runner ?? 'playwright';
      const runner = getRunner(runnerType);
      const targets = args.targets ?? [];

      if (args.dryRun === true) {
        return {
          status: 'planned',
          label: 'NOT_RUN',
          runner: runnerType,
          commandPreview: `npx ${runnerType === 'playwright' ? 'playwright test' : runnerType} ${targets.join(' ')}`.trim(),
          detail: 'dry-run: command planned, nothing executed, nothing counted'
        };
      }

      const available = await runner.isAvailable();
      if (!available) {
        return {
          status: 'NOT_RUN',
          label: 'NOT_RUN',
          reason: 'RUNNER_UNAVAILABLE',
          runner: runnerType,
          detail: `${runnerType} is not installed in this environment — install it to run live. No simulated results are returned.`
        };
      }

      const result = await runner.run(targets, {});
      return {
        status: 'executed',
        label: 'OBSERVED',
        runner: runnerType,
        commandExecuted: result.commandExecuted,
        exitCode: result.exitCode,
        totalTests: result.totalTests,
        passed: result.passed,
        failed: result.failed,
        skipped: result.skipped,
        quarantined: result.quarantined,
        durationMs: result.durationMs,
        items: result.items.slice(0, 50)
      };
    }
  },

  get_failure_evidence: {
    name: 'get_failure_evidence',
    description: 'Retrieves diagnostic evidence bundle (DOM trace, network HAR, console logs, screenshots).',
    inputSchema: {
      type: 'object',
      properties: { testId: { type: 'string' } },
      required: ['testId']
    },
    handler: (args: { testId: string; artifactsRoot?: string }) => {
      // REAL evidence lookup on disk. The old handler fabricated console logs
      // and a fake 504 — evidence that does not exist is now reported as
      // NOT_FOUND, never invented.
      const roots = [args.artifactsRoot, join(process.cwd(), '.qaforge', 'artifacts'), join(process.cwd(), 'artifacts'), join(process.cwd(), 'test-results')].filter((x): x is string => typeof x === 'string');
      const idSlug = args.testId.replace(/[^a-zA-Z0-9]/g, '_');
      for (const root of roots) {
        if (!existsSync(root)) continue;
        const files: string[] = [];
        const walk = (dir: string, depth: number): void => {
          if (depth > 4) return;
          try {
            for (const e of readdirSync(dir, { withFileTypes: true })) {
              const p = join(dir, e.name);
              if (e.isDirectory()) walk(p, depth + 1);
              else files.push(p);
            }
          } catch { /* unreadable dirs skipped */ }
        };
        walk(root, 0);
        const matches = files.filter((f) => f.includes(idSlug) || f.includes(args.testId));
        if (matches.length > 0) {
          const bundle: Record<string, unknown> = { artifactsRoot: root, files: matches.slice(0, 20) };
          for (const f of matches) {
            if (/\.zip$/.test(f)) bundle.traceZip = f;
            else if (/\.(png|jpe?g)$/.test(f)) bundle.screenshot = f;
            else if (/\.(log|txt)$/.test(f)) {
              try { bundle.consoleLogs = readFileSync(f, 'utf8').split('\n').slice(-50); } catch { /* unreadable */ }
            }
            else if (/har$|network/i.test(f)) bundle.networkLogs = f;
          }
          return { testId: args.testId, status: 'FOUND', label: 'OBSERVED', evidenceBundle: bundle };
        }
      }
      return {
        testId: args.testId,
        status: 'NOT_FOUND',
        label: 'NOT_RUN',
        searchedRoots: roots,
        detail: 'no evidence bundle found on disk for this testId — run the tests with evidence collection enabled. No synthetic evidence is provided.'
      };
    }
  },

  triage_failure: {
    name: 'triage_failure',
    description: 'Triages failure into one of 12 enterprise categories with confidence, signals, and root cause hypothesis.',
    inputSchema: {
      type: 'object',
      properties: {
        testId: { type: 'string' },
        errorMessage: { type: 'string' },
        firstAttemptFailed: { type: 'boolean' },
        retryPassed: { type: 'boolean' }
      },
      required: ['testId', 'errorMessage']
    },
    handler: (args: any) =>
      triageSingleFailure({
        testId: args.testId,
        errorMessage: args.errorMessage,
        firstAttemptFailed: args.firstAttemptFailed ?? true,
        retryPassed: args.retryPassed ?? false
      })
  },

  propose_test_heal: {
    name: 'propose_test_heal',
    description: 'Evaluates broken test locators or assertions and proposes a confidence-tiered self-healing patch.',
    inputSchema: {
      type: 'object',
      properties: {
        testFile: { type: 'string' },
        testName: { type: 'string' },
        originalSnippet: { type: 'string' },
        failedLocatorOrSelector: { type: 'string' },
        updatedDomOrSchema: { type: 'string' }
      },
      required: ['testFile', 'originalSnippet', 'failedLocatorOrSelector']
    },
    handler: (args: any) => evaluateHealing(args)
  },

  analyze_flake: {
    name: 'analyze_flake',
    description: 'Analyzes test flake history, run variance, timing sensitivity, and quarantine status.',
    inputSchema: {
      type: 'object',
      properties: { testId: { type: 'string' }, runHistory: { type: 'array' } },
      required: ['testId']
    },
    handler: (args: { testId: string; runHistory?: Array<{ status?: string; passed?: boolean; durationMs?: number }> }) => {
      // REAL flake computation from the caller's run history. The old handler
      // returned hardcoded flakeScore 78 + a made-up root cause.
      const history = args.runHistory ?? [];
      if (history.length < 5) {
        return {
          testId: args.testId,
          status: 'NOT_RUN',
          label: 'NOT_RUN',
          detail: `flake analysis needs at least 5 historical runs (received ${history.length}) — provide runHistory; no invented score is returned.`
        };
      }
      const passed = history.filter((h) => h.status === 'passed' || h.passed === true).length;
      const passRate = passed / history.length;
      const failRate = 1 - passRate;
      // Intermittency: number of outcome flips between consecutive runs.
      let flips = 0;
      for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1]?.status === 'passed' || history[i - 1]?.passed === true;
        const curr = history[i]?.status === 'passed' || history[i]?.passed === true;
        if (prev !== curr) flips += 1;
      }
      const intermittency = history.length > 1 ? flips / (history.length - 1) : 0;
      const durations = history.map((h) => h.durationMs).filter((d): d is number => typeof d === 'number');
      let variance = 0;
      if (durations.length >= 2) {
        const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
        variance = durations.reduce((acc, d) => acc + (d - mean) ** 2, 0) / durations.length;
      }
      // Documented formula: 45*failRate + 35*intermittency + 20*(normalized timing variance).
      const timingSignal = Math.min(1, Math.sqrt(variance) / Math.max(1, Math.sqrt(durations.length) * 1000));
      const flakeScore = Math.round(45 * failRate + 35 * intermittency + 20 * timingSignal);
      const verdict = flakeScore >= 70 ? 'critical_flaky' : flakeScore >= 45 ? 'flaky' : flakeScore >= 20 ? 'suspect' : 'stable';
      return {
        testId: args.testId,
        status: 'analyzed',
        label: 'OBSERVED',
        runsAnalyzed: history.length,
        passRate: Math.round(passRate * 1000) / 1000,
        intermittency: Math.round(intermittency * 1000) / 1000,
        durationVarianceMs: Math.round(variance),
        flakeScore,
        verdict,
        isQuarantined: verdict === 'critical_flaky',
        formula: 'flakeScore = 45*failRate + 35*intermittency + 20*timingVariance',
        remedy: verdict === 'stable' ? 'no action required' : 'quarantine and stabilize: replace sleeps with web-first assertions, isolate shared state, pin timing sources'
      };
    }
  },

  generate_quality_report: {
    name: 'generate_quality_report',
    description: 'Generates comprehensive quality report across JUnit XML, Allure, GitHub annotations, Slack.',
    inputSchema: {
      type: 'object',
      properties: { format: { type: 'string', enum: ['junit', 'allure', 'slack', 'github'] } }
    },
    handler: (args: { format?: string; runInput?: Record<string, unknown> }) => {
      // The old handler returned a hardcoded "PASS 96/100, 42 tests passed".
      // A report without run evidence is now an honest refusal — supply
      // runInput (test counts, triage summary) to render a real report.
      if (args.runInput === undefined || typeof args.runInput !== 'object') {
        return {
          format: args.format || 'github',
          status: 'NOT_RUN',
          label: 'NOT_RUN',
          detail: 'no run evidence supplied — a quality report must be computed from actual test results. Provide runInput { totalTests, passed, failed, triage } to render one.'
        };
      }
      const r = args.runInput as { totalTests?: number; passed?: number; failed?: number; triage?: string };
      const passed = r.passed ?? 0;
      const failed = r.failed ?? 0;
      const total = r.totalTests ?? passed + failed;
      const verdict = failed === 0 ? 'PASS' : 'FAIL';
      return {
        format: args.format || 'github',
        status: 'rendered',
        label: 'OBSERVED',
        summary: `qaforge Quality Gate: ${verdict} — ${passed}/${total} passed, ${failed} failed${r.triage !== undefined ? `, triage: ${r.triage}` : ''}`,
        computedFrom: r
      };
    }
  },

  evaluate_release: {
    name: 'evaluate_release',
    description: 'Evaluates release readiness gate and checks all 15 Golden Rules for hard blockers.',
    inputSchema: {
      type: 'object',
      properties: {
        testsPassed: { type: 'number' },
        testsFailed: { type: 'number' },
        unresolvedP0Defects: { type: 'number' },
        flakyTestsCount: { type: 'number' },
        lineCoveragePercent: { type: 'number' },
        riskScore: { type: 'number' }
      }
    },
    handler: (args: any) =>
      governance.evaluateRelease({
        testsPassed: args.testsPassed ?? 100,
        testsFailed: args.testsFailed ?? 0,
        unresolvedP0Defects: args.unresolvedP0Defects ?? 0,
        flakyTestsCount: args.flakyTestsCount ?? 0,
        lineCoveragePercent: args.lineCoveragePercent ?? 85,
        riskScore: args.riskScore ?? 45,
        securityVulnerabilities: 0,
        wcagAxeViolations: 0
      })
  }
};
