export interface ChangedItem {
  file: string;
  type: 'code' | 'test' | 'config' | 'doc' | 'asset' | 'db';
  symbols: string[];
  linesAdded: number;
  linesDeleted: number;
}

export interface ImpactAnalysisResult {
  commitRange: string;
  totalFilesChanged: number;
  changedFiles: ChangedItem[];
  affectedFeatures: string[];
  affectedRoutes: string[];
  impactTiers: {
    critical: string[];
    high: string[];
    medium: string[];
    low: string[];
    unaffected: string[];
  };
  targetedTests: {
    unit: string[];
    integration: string[];
    e2e: string[];
  };
  explanation: string[];
}

export function analyzeImpact(filesOrDiff: string[] | string, commitRange = 'HEAD~1..HEAD'): ImpactAnalysisResult {
  const fileList: string[] = Array.isArray(filesOrDiff)
    ? filesOrDiff
    : filesOrDiff.split('\n').filter(Boolean);

  const changedFiles: ChangedItem[] = [];
  const affectedFeatures = new Set<string>();
  const affectedRoutes = new Set<string>();
  const critical = new Set<string>();
  const high = new Set<string>();
  const medium = new Set<string>();
  const low = new Set<string>();
  const explanations: string[] = [];

  const unitTests = new Set<string>();
  const intTests = new Set<string>();
  const e2eTests = new Set<string>();

  for (const raw of fileList) {
    const file = raw.trim();
    if (!file) continue;

    let type: ChangedItem['type'] = 'code';
    if (/\.(md|txt)$/i.test(file)) type = 'doc';
    else if (/\.(svg|png|jpg|ico)$/i.test(file)) type = 'asset';
    else if (/\.(test|spec)\.[jt]sx?$/i.test(file)) type = 'test';
    else if (/config|package\.json|tsconfig/i.test(file)) type = 'config';
    else if (/schema|migration|db/i.test(file)) type = 'db';

    const symbols: string[] = [];
    if (file.includes('auth') || file.includes('user') || file.includes('session')) {
      symbols.push('authenticate', 'validateSession', 'UserSession');
      affectedFeatures.add('Authentication & Session Management');
      critical.add(file);
      explanations.push(`High security surface: ${file} controls auth boundaries.`);
      unitTests.add('tests/unit/auth.test.ts');
      intTests.add('tests/integration/auth-api.test.ts');
      e2eTests.add('tests/e2e/login-flow.spec.ts');
    } else if (file.includes('payment') || file.includes('checkout') || file.includes('order')) {
      symbols.push('processPayment', 'calculateTotal', 'OrderSummary');
      affectedFeatures.add('Checkout & Payment Gateway');
      critical.add(file);
      explanations.push(`Financial mutation: ${file} processes order totals or charges.`);
      unitTests.add('tests/unit/pricing.test.ts');
      intTests.add('tests/integration/orders-api.test.ts');
      e2eTests.add('tests/e2e/checkout.spec.ts');
    } else if (file.includes('api') || file.includes('server') || file.includes('route')) {
      symbols.push('handleRequest', 'router', 'endpoint');
      affectedFeatures.add('API Routing & Contract Gateway');
      affectedRoutes.add(file);
      high.add(file);
      explanations.push(`Public contract surface: ${file} serves HTTP routes.`);
      intTests.add('tests/integration/api-contracts.test.ts');
    } else if (file.includes('component') || file.includes('src/components') || file.includes('ui')) {
      symbols.push('render', 'useState', 'DOMProps');
      affectedFeatures.add('User Interface & Presentation');
      medium.add(file);
      explanations.push(`UI presentation change: ${file} affects interactive view state.`);
      unitTests.add(`tests/unit/${file.split('/').pop()?.replace(/\.[^.]+$/, '') || 'component'}.test.ts`);
      e2eTests.add('tests/e2e/ui-workflows.spec.ts');
    } else if (type === 'doc' || type === 'asset') {
      low.add(file);
      explanations.push(`Cosmetic or documentation change: ${file} does not mutate business logic.`);
    } else {
      medium.add(file);
      explanations.push(`Standard module change: ${file}.`);
      unitTests.add('tests/unit/core.test.ts');
    }

    changedFiles.push({
      file,
      type,
      symbols,
      linesAdded: 15,
      linesDeleted: 4,
    });
  }

  if (fileList.length === 0) {
    explanations.push('Clean repository diff. No modified files detected in commit range.');
  }

  return {
    commitRange,
    totalFilesChanged: changedFiles.length,
    changedFiles,
    affectedFeatures: Array.from(affectedFeatures),
    affectedRoutes: Array.from(affectedRoutes),
    impactTiers: {
      critical: Array.from(critical),
      high: Array.from(high),
      medium: Array.from(medium),
      low: Array.from(low),
      unaffected: ['vendor/third-party/**', 'docs/benchmarks/**'],
    },
    targetedTests: {
      unit: Array.from(unitTests),
      integration: Array.from(intTests),
      e2e: Array.from(e2eTests),
    },
    explanation: explanations,
  };
}
