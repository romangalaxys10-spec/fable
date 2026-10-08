import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

/**
 * REAL change-impact analysis — evidence in, evidence out.
 *
 * The previous implementation of this module fabricated its outputs
 * (hardcoded linesAdded: 15 / linesDeleted: 4, symbols invented from file
 * names, test paths like tests/unit/auth.test.ts guessed from substrings).
 * Every line below now works against the actual repository:
 *
 *   - diff stats come from `git diff --numstat <range>` (real +/- lines);
 *   - symbols are extracted with the TypeScript compiler API (or Python's
 *     `def`/`class` shape) from the changed files' real content;
 *   - affected features/routes derive from path + symbol evidence, each
 *     explanation citing what was actually seen;
 *   - targeted tests are DISCOVERED on disk and mapped through the import
 *     graph — a test path that does not exist is never emitted;
 *   - anything that cannot be measured is reported honestly (zeros with a
 *     "not measured" note, empty sets with a reason), never invented.
 */

export interface ChangedItem {
  file: string;
  type: 'code' | 'test' | 'config' | 'doc' | 'asset' | 'db';
  symbols: string[];
  linesAdded: number;
  linesDeleted: number;
  /** How the diff stats were obtained — every number is traceable. */
  statsSource: 'git-numstat' | 'not-measured';
  existsOnDisk: boolean;
}

export interface ImpactAnalysisResult {
  commitRange: string;
  repoRoot: string;
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
  /** Tests discovered in the repo but not selected — proves the discovery ran. */
  discoveredTestsNotSelected: string[];
  explanation: string[];
  /** Epistemics label for the report envelope. */
  label: 'OBSERVED' | 'INFERRED';
  evidence: string[];
}

// ---------------------------------------------------------------------------
// Git plumbing
// ---------------------------------------------------------------------------

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

interface NumstatRow {
  file: string;
  added: number;
  deleted: number;
  binary: boolean;
}

function realDiff(repoRoot: string, commitRange: string): { rows: NumstatRow[]; evidence: string[] } {
  const evidence: string[] = [];
  try {
    const out = git(['diff', '--numstat', commitRange], repoRoot);
    const rows: NumstatRow[] = [];
    for (const line of out.split('\n')) {
      if (!line.trim()) continue;
      const [a, d, ...rest] = line.split('\t');
      const file = rest.join('\t');
      if (!file) continue;
      const binary = a === '-' || d === '-';
      rows.push({
        file: file.replace(/^"|"$/g, ''),
        added: binary ? 0 : Number.parseInt(a ?? '0', 10) || 0,
        deleted: binary ? 0 : Number.parseInt(d ?? '0', 10) || 0,
        binary,
      });
    }
    evidence.push(`git diff --numstat ${commitRange} → ${rows.length} file row(s)`);
    return { rows, evidence };
  } catch (e) {
    evidence.push(`git diff failed (${(e as Error).message.split('\n')[0]}) — diff stats will be reported as not-measured`);
    return { rows: [], evidence };
  }
}

// ---------------------------------------------------------------------------
// Symbol extraction (real content, TS compiler API / Python shape)
// ---------------------------------------------------------------------------

export function extractSymbols(file: string, repoRoot: string): { symbols: string[]; note: string } {
  const abs = resolve(repoRoot, file);
  if (!existsSync(abs)) return { symbols: [], note: `${file}: not on disk — no symbols extracted (none invented)` };
  const ext = extname(file).toLowerCase();
  let text: string;
  try {
    text = readFileSync(abs, 'utf8');
  } catch {
    return { symbols: [], note: `${file}: unreadable — no symbols extracted` };
  }

  if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.mts' || ext === '.cts') {
    try {
      const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ext === '.tsx' || ext === '.jsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const symbols: string[] = [];
      const visit = (node: ts.Node): void => {
        if (ts.isFunctionDeclaration(node) && node.name) symbols.push(node.name.text);
        else if (ts.isClassDeclaration(node) && node.name) symbols.push(node.name.text);
        else if (ts.isInterfaceDeclaration(node) && node.name) symbols.push(node.name.text);
        else if (ts.isTypeAliasDeclaration(node) && node.name) symbols.push(node.name.text);
        else if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name)) symbols.push(node.name.text);
        else if (ts.isVariableStatement(node)) {
          for (const decl of node.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) symbols.push(decl.name.text);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
      const unique = [...new Set(symbols)].slice(0, 40);
      return { symbols: unique, note: `${file}: ${unique.length} symbol(s) via TypeScript AST` };
    } catch {
      // fall through to regex shape
    }
  }

  if (ext === '.py') {
    const symbols: string[] = [];
    for (const m of text.matchAll(/^(?:async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)|^class\s+([A-Za-z_][A-Za-z0-9_]*)/gm)) {
      symbols.push(m[1] ?? m[2] ?? '');
    }
    const unique = [...new Set(symbols.filter(Boolean))].slice(0, 40);
    return { symbols: unique, note: `${file}: ${unique.length} symbol(s) via Python def/class pattern` };
  }

  return { symbols: [], note: `${file}: extension ${ext || '(none)'} — no symbol extraction applicable` };
}

// ---------------------------------------------------------------------------
// Test discovery (real files on disk)
// ---------------------------------------------------------------------------

const TEST_FILE_RE = /\.(test|spec)\.[jt]sx?$/;

export function discoverTests(repoRoot: string, maxDepth = 6): { tests: string[]; note: string } {
  const tests: string[] = [];
  const skip = new Set(['node_modules', '.git', 'dist', 'build', 'vendor', '.next', 'coverage']);
  const walk = (dir: string, depth: number): void => {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith('.') || skip.has(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else if (e.isFile() && (TEST_FILE_RE.test(e.name) || /tests?\/.*\.py$/.test(relative(repoRoot, p)) || /_test\.(py|go)$/.test(e.name))) {
        tests.push(relative(repoRoot, p).split(sep).join('/'));
      }
    }
  };
  walk(repoRoot, 0);
  return { tests: tests.sort(), note: `discovered ${tests.length} test file(s) on disk` };
}

/** Parse import/require specifiers from a JS/TS/Py file's real content. */
function importsOf(file: string, repoRoot: string): string[] {
  const abs = resolve(repoRoot, file);
  if (!existsSync(abs)) return [];
  try {
    const text = readFileSync(abs, 'utf8');
    const specs: string[] = [];
    for (const m of text.matchAll(/(?:import[^'"]*?from\s*|require\(\s*|import\(\s*)['"]([^'"]+)['"]/g)) specs.push(m[1] ?? '');
    if (file.endsWith('.py')) {
      for (const m of text.matchAll(/^\s*(?:from|import)\s+([A-Za-z_][A-Za-z0-9_.]*)/gm)) specs.push(m[1] ?? '');
    }
    return specs.filter(Boolean);
  } catch {
    return [];
  }
}

/** Resolve a relative import specifier to a repo-relative path if possible. */
function resolveImport(spec: string, fromFile: string, repoRoot: string): string | null {
  if (!spec.startsWith('.') && !spec.startsWith('/')) return null;
  const base = resolve(dirname(resolve(repoRoot, fromFile)), spec);
  const candidates = [
    base,
    `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.mjs`,
    join(base, 'index.ts'), join(base, 'index.js'),
  ];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return relative(repoRoot, c).split(sep).join('/');
  }
  return null;
}

function classifyType(file: string): ChangedItem['type'] {
  if (/\.(md|txt|rst)$/i.test(file)) return 'doc';
  if (/\.(svg|png|jpe?g|gif|ico|webp|woff2?|ttf)$/i.test(file)) return 'asset';
  if (TEST_FILE_RE.test(file) || /_test\.(py|go)$/.test(file)) return 'test';
  if (/(^|\/)(config|\.)([^/]*\/)*(package\.json|tsconfig|vite\.config|\.env)/i.test(file) || /\.config\.[jt]s$/.test(file) || /package\.json$/.test(file)) return 'config';
  if (/(migration|schema|migrations\/)/i.test(file) || /\.sql$/i.test(file)) return 'db';
  return 'code';
}

// ---------------------------------------------------------------------------
// Feature/route/tier evidence rules (path + symbol based, each explained)
// ---------------------------------------------------------------------------

interface DomainRule {
  feature: string;
  tier: 'critical' | 'high' | 'medium' | 'low';
  testLayer: 'unit' | 'integration' | 'e2e';
  match: (file: string, symbols: string[]) => boolean;
  why: (file: string, symbols: string[]) => string;
}

const DOMAIN_RULES: DomainRule[] = [
  {
    feature: 'Authentication & Session Management',
    tier: 'critical',
    testLayer: 'e2e',
    match: (f, s) => /(^|\/)(auth|login|session|jwt|oauth|password)/i.test(f) || s.some((x) => /authenticat|session|login|token/i.test(x)),
    why: (f) => `${f}: auth/session path boundary`,
  },
  {
    feature: 'Checkout & Payment Gateway',
    tier: 'critical',
    testLayer: 'e2e',
    match: (f, s) => /(^|\/)(payment|checkout|billing|order|cart)/i.test(f) || s.some((x) => /payment|charge|invoice|total/i.test(x)),
    why: (f) => `${f}: payment/order mutation surface`,
  },
  {
    feature: 'Data Layer & Migrations',
    tier: 'high',
    testLayer: 'integration',
    match: (f) => /(^|\/)(db|database|migration|migrations|schema|models?)\//i.test(f) || /\.sql$/i.test(f),
    why: (f) => `${f}: database/schema path`,
  },
  {
    feature: 'API Routing & Contract Gateway',
    tier: 'high',
    testLayer: 'integration',
    match: (f, s) => /(^|\/)(api|routes?|server|controllers?|handlers?)\//i.test(f) || s.some((x) => /router|handler|controller/i.test(x)),
    why: (f) => `${f}: HTTP route/controller path`,
  },
  {
    feature: 'User Interface & Presentation',
    tier: 'medium',
    testLayer: 'unit',
    match: (f) => /(^|\/)(components?|ui|views?|pages?|screens?)\//i.test(f) || /\.(tsx|jsx)$/i.test(f),
    why: (f) => `${f}: UI component path`,
  },
];

// ---------------------------------------------------------------------------
// Main entry: REAL analysis against a real repo
// ---------------------------------------------------------------------------

export interface AnalyzeImpactOptions {
  /** Absolute (or cwd-relative) path to the git repository to analyze. */
  repoRoot: string;
  /** Default 'HEAD~1..HEAD'. */
  commitRange?: string;
  /** Optional explicit file list (skips git; stats come from numstat of the worktree diff when possible). */
  files?: string[];
}

export async function analyzeImpactRepo(opts: AnalyzeImpactOptions): Promise<ImpactAnalysisResult> {
  const repoRoot = resolve(opts.repoRoot);
  const commitRange = opts.commitRange ?? 'HEAD~1..HEAD';
  const evidence: string[] = [];
  const explanation: string[] = [];

  if (!existsSync(join(repoRoot, '.git'))) {
    throw new Error(`not a git repository: ${repoRoot} — impact analysis requires a real repo, refusing to fabricate a diff`);
  }

  const { rows, evidence: diffEvidence } = realDiff(repoRoot, commitRange);
  evidence.push(...diffEvidence);

  let fileList: string[];
  if (opts.files !== undefined && opts.files.length > 0) {
    fileList = opts.files;
    evidence.push(`file list provided by caller (${fileList.length} file(s)) — numstat matched by path where available`);
  } else {
    try {
      fileList = git(['diff', '--name-only', commitRange], repoRoot).split('\n').map((l) => l.trim()).filter(Boolean);
      evidence.push(`git diff --name-only ${commitRange} → ${fileList.length} changed file(s)`);
    } catch (e) {
      fileList = [];
      explanation.push(`could not list changed files: ${(e as Error).message.split('\n')[0]}`);
    }
  }

  const changedFiles: ChangedItem[] = [];
  const affectedFeatures = new Set<string>();
  const affectedRoutes = new Set<string>();
  const tiers: Record<'critical' | 'high' | 'medium' | 'low', Set<string>> = {
    critical: new Set(), high: new Set(), medium: new Set(), low: new Set(),
  };
  const layerTargets: Record<'unit' | 'integration' | 'e2e', Set<string>> = {
    unit: new Set(), integration: new Set(), e2e: new Set(),
  };
  const changedImportClosure = new Set<string>();

  const numstatByFile = new Map(rows.map((r) => [r.file, r] as const));

  for (const raw of fileList) {
    const file = raw.trim().replace(/\\/g, '/');
    if (!file) continue;
    const num = numstatByFile.get(file);
    const { symbols, note } = extractSymbols(file, repoRoot);
    if (note) evidence.push(note);
    const exists = existsSync(resolve(repoRoot, file));
    changedFiles.push({
      file,
      type: classifyType(file),
      symbols,
      linesAdded: num?.added ?? 0,
      linesDeleted: num?.deleted ?? 0,
      statsSource: num !== undefined ? 'git-numstat' : 'not-measured',
      existsOnDisk: exists,
    });

    // Import closure of changed code (bounded to direct imports).
    for (const spec of importsOf(file, repoRoot)) {
      const target = resolveImport(spec, file, repoRoot);
      if (target !== null) changedImportClosure.add(target);
    }

    if (num === undefined) explanation.push(`${file}: no numstat row for ${commitRange} (file may be untracked in range) — lines reported as 0, not guessed`);

    let matched = false;
    for (const rule of DOMAIN_RULES) {
      if (!rule.match(file, symbols)) continue;
      matched = true;
      affectedFeatures.add(rule.feature);
      tiers[rule.tier].add(file);
      explanation.push(`${rule.feature}: ${rule.why(file, symbols)}`);
      if (/api|routes?|server|controllers?/i.test(file)) affectedRoutes.add(file);
      break;
    }
    const type = classifyType(file);
    if (!matched) {
      if (type === 'doc' || type === 'asset') {
        tiers.low.add(file);
        explanation.push(`${file}: ${type} change — no business logic surface observed`);
      } else if (type === 'test') {
        tiers.low.add(file);
        explanation.push(`${file}: test-only change`);
      } else if (type === 'config') {
        tiers.medium.add(file);
        explanation.push(`${file}: configuration change — behavior can shift without code diffs`);
      } else if (type === 'db') {
        tiers.high.add(file);
        explanation.push(`${file}: schema/migration surface`);
      } else {
        tiers.medium.add(file);
        explanation.push(`${file}: standard module change (no domain rule matched its path or symbols)`);
      }
    }
  }

  // ---- Real test discovery + mapping (the anti-fabrication core) ----
  const { tests, note: discoveryNote } = discoverTests(repoRoot);
  evidence.push(discoveryNote);
  const discoveredNotSelected = new Set(tests);

  const selectedByLayer: Record<'unit' | 'integration' | 'e2e', string[]> = { unit: [], integration: [], e2e: [] };
  const changedPaths = new Set(changedFiles.map((c) => c.file));

  for (const test of tests) {
    const specs = importsOf(test, repoRoot);
    const resolved = specs.map((s) => resolveImport(s, test, repoRoot)).filter((x): x is string => x !== null);
    const touchesChanged = resolved.some((r) => changedPaths.has(r) || changedImportClosure.has(r));
    const nameHits = [...changedPaths].some((c) => {
      const base = c.split('/').pop() ?? c;
      const stem = base.replace(/\.[^.]+$/, '');
      return stem.length > 3 && test.toLowerCase().includes(stem.toLowerCase());
    });
    if (!touchesChanged && !nameHits) continue;
    discoveredNotSelected.delete(test);

    // Layer by evidence: path convention first, import closure second.
    const layer: 'unit' | 'integration' | 'e2e' =
      /(^|\/)(e2e|integration)\//.test(test) ? (/e2e\//.test(test) ? 'e2e' : 'integration') :
      /\.(e2e|integration)\./.test(test) ? (/\.e2e\./.test(test) ? 'e2e' : 'integration') :
      resolved.length > 0 ? 'integration' : 'unit';

    selectedByLayer[layer].push(test);
    const how = touchesChanged ? 'imports changed module' : 'name matches changed file';
    evidence.push(`selected ${test} (${layer}) — ${how}`);
  }

  // Distribute domain layer targets only into layers that actually have tests.
  for (const rule of DOMAIN_RULES) {
    if (!affectedFeatures.has(rule.feature)) continue;
    const bucket = selectedByLayer[rule.testLayer];
    if (bucket.length > 0) continue; // already real tests for this layer
    const fallback = selectedByLayer.unit.length > 0 ? selectedByLayer.unit : selectedByLayer.integration.length > 0 ? selectedByLayer.integration : selectedByLayer.e2e;
    if (fallback.length === 0) {
      explanation.push(`${rule.feature}: ${rule.testLayer} coverage requested but no matching tests discovered on disk — reported as a gap, not invented`);
    }
  }

  const anyChange = changedFiles.length > 0;
  if (!anyChange) explanation.push('clean diff — no changed files in range');

  const evidenceLabel: 'OBSERVED' | 'INFERRED' = anyChange ? 'OBSERVED' : 'INFERRED';

  return {
    commitRange,
    repoRoot,
    totalFilesChanged: changedFiles.length,
    changedFiles,
    affectedFeatures: [...affectedFeatures],
    affectedRoutes: [...affectedRoutes],
    impactTiers: {
      critical: [...tiers.critical],
      high: [...tiers.high],
      medium: [...tiers.medium],
      low: [...tiers.low],
      unaffected: discoveredNotSelected.size > 0 ? [`${discoveredNotSelected.size} discovered test file(s) unaffected by this range`] : [],
    },
    targetedTests: {
      unit: selectedByLayer.unit,
      integration: selectedByLayer.integration,
      e2e: selectedByLayer.e2e,
    },
    discoveredTestsNotSelected: [...discoveredNotSelected],
    explanation,
    label: evidenceLabel,
    evidence,
  };
}

/**
 * Legacy entry kept for compatibility: analyzes a caller-provided file list
 * against the real working tree. When a repoRoot is available prefer
 * analyzeImpactRepo (real numstat). Files are read from disk; stats are
 * 0/not-measured unless numstat applies — never invented.
 */
export function analyzeImpact(filesOrDiff: string[] | string, commitRange = 'HEAD~1..HEAD', repoRoot?: string): ImpactAnalysisResult {
  const fileList: string[] = Array.isArray(filesOrDiff)
    ? filesOrDiff
    : filesOrDiff.split('\n').map((l) => l.replace(/^[\s\d+-]*\t?/, '').trim()).filter((l) => l.length > 0 && !l.startsWith('diff --git'));

  const root = repoRoot ?? process.cwd();
  // Best effort: real numstat for the provided files when the range resolves.
  const rows = existsSync(join(root, '.git')) ? realDiff(root, commitRange).rows : [];
  const numstatByFile = new Map(rows.map((r) => [r.file, r] as const));
  const { tests, note } = discoverTests(root);
  const evidence: string[] = [note];

  const changedFiles: ChangedItem[] = [];
  const affectedFeatures = new Set<string>();
  const affectedRoutes = new Set<string>();
  const tiers: Record<'critical' | 'high' | 'medium' | 'low', Set<string>> = { critical: new Set(), high: new Set(), medium: new Set(), low: new Set() };
  const explanation: string[] = [];

  for (const raw of fileList) {
    const file = raw.trim().replace(/\\/g, '/');
    if (!file) continue;
    const num = numstatByFile.get(file);
    const { symbols, note: symNote } = extractSymbols(file, root);
    if (symNote) evidence.push(symNote);
    const type = classifyType(file);
    changedFiles.push({
      file,
      type,
      symbols,
      linesAdded: num?.added ?? 0,
      linesDeleted: num?.deleted ?? 0,
      statsSource: num !== undefined ? 'git-numstat' : 'not-measured',
      existsOnDisk: existsSync(resolve(root, file)),
    });

    let matched = false;
    for (const rule of DOMAIN_RULES) {
      if (!rule.match(file, symbols)) continue;
      matched = true;
      affectedFeatures.add(rule.feature);
      tiers[rule.tier].add(file);
      explanation.push(`${rule.feature}: ${rule.why(file, symbols)}`);
      if (/api|routes?|server|controllers?/i.test(file)) affectedRoutes.add(file);
      break;
    }
    if (!matched) {
      if (type === 'doc' || type === 'asset') {
        tiers.low.add(file);
        explanation.push(`${file}: ${type} change — no business logic surface observed`);
      } else {
        tiers.medium.add(file);
        explanation.push(`${file}: standard module change (no domain rule matched its path or symbols)`);
      }
    }
  }

  // Real mapping: only tests that exist on disk and import a changed file.
  const changedPaths = new Set(changedFiles.map((c) => c.file));
  const unit: string[] = [];
  const integration: string[] = [];
  const e2e: string[] = [];
  for (const test of tests) {
    const resolved = importsOf(test, root).map((s) => resolveImport(s, test, root)).filter((x): x is string => x !== null);
    const nameHits = [...changedPaths].some((c) => {
      const stem = (c.split('/').pop() ?? c).replace(/\.[^.]+$/, '');
      return stem.length > 3 && test.toLowerCase().includes(stem.toLowerCase());
    });
    if (!resolved.some((r) => changedPaths.has(r)) && !nameHits) continue;
    const layer: 'unit' | 'integration' | 'e2e' = /e2e\//.test(test) || /\.e2e\./.test(test) ? 'e2e' : /integration\//.test(test) || resolved.length > 0 ? 'integration' : 'unit';
    (layer === 'e2e' ? e2e : layer === 'integration' ? integration : unit).push(test);
    evidence.push(`selected ${test} (${layer}) — imports changed module or name matches`);
  }

  return {
    commitRange,
    repoRoot: root,
    totalFilesChanged: changedFiles.length,
    changedFiles,
    affectedFeatures: [...affectedFeatures],
    affectedRoutes: [...affectedRoutes],
    impactTiers: {
      critical: [...tiers.critical],
      high: [...tiers.high],
      medium: [...tiers.medium],
      low: [...tiers.low],
      unaffected: [],
    },
    targetedTests: { unit, integration, e2e },
    discoveredTestsNotSelected: tests.filter((t) => !unit.includes(t) && !integration.includes(t) && !e2e.includes(t)),
    explanation,
    label: changedFiles.length > 0 ? 'OBSERVED' : 'INFERRED',
    evidence,
  };
}
