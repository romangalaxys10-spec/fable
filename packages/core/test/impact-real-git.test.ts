import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeImpactRepo, extractSymbols, discoverTests } from '../src/impact';

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
}

function initRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'fable-impact-'));
  git(root, 'init', '-b', 'main');
  git(root, 'config', 'user.email', 'test@fable.local');
  git(root, 'config', 'user.name', 'Fable Test');
  mkdirSync(join(root, 'src'), { recursive: true });
  mkdirSync(join(root, 'tests'), { recursive: true });
  writeFileSync(join(root, 'src', 'auth.ts'), 'export function login(user: string): string { return user; }\nexport function logout(): void {}\n');
  writeFileSync(join(root, 'tests', 'auth.test.ts'), "import { test } from 'node:test';\ntest('login', () => {});\n");
  git(root, 'add', '-A');
  git(root, 'commit', '-m', 'init');
  return root;
}

test('analyzeImpactRepo reads REAL git numstat numbers (no hardcoded 15/4)', async () => {
  const root = initRepo();
  try {
    // Change auth.ts: delete the logout line, add 3 new functions → real numstat = +3 / −1.
    writeFileSync(
      join(root, 'src', 'auth.ts'),
      'export function login(user: string): string { return user; }\nexport function refresh(token: string): string { return token; }\nexport function verify(token: string): boolean { return token.length > 0; }\nexport function expire(token: string): void {}\n',
    );
    git(root, 'add', '-A');
    git(root, 'commit', '-m', 'expand auth');

    const result = await analyzeImpactRepo({ repoRoot: root, commitRange: 'HEAD~1..HEAD' });

    const auth = result.changedFiles.find((f) => f.file === 'src/auth.ts');
    assert.ok(auth, 'auth.ts must appear in changed files');
    assert.equal(auth.linesAdded, 3, `linesAdded must equal the real numstat 3, got ${String(auth.linesAdded)}`);
    assert.equal(auth.linesDeleted, 1, `linesDeleted must equal the real numstat 1, got ${String(auth.linesDeleted)}`);
    assert.ok(result.evidence.some((e) => e.includes('numstat')), 'evidence must cite the numstat source');
    assert.ok(auth.symbols.includes('refresh'), 'symbols must come from the real file content');
    for (const f of result.changedFiles) {
      assert.equal(f.existsOnDisk, true, 'every reported path must exist on disk — no invented test paths');
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('analyzeImpactRepo refuses non-repo directories instead of fabricating a diff', async () => {
  const fake = mkdtempSync(join(tmpdir(), 'fable-nogit-'));
  try {
    await assert.rejects(() => analyzeImpactRepo({ repoRoot: fake }), /not a git repository/);
  } finally {
    rmSync(fake, { recursive: true, force: true });
  }
});

test('discoverTests only returns paths that exist on disk', async () => {
  const root = initRepo();
  try {
    const { tests } = discoverTests(root);
    assert.ok(tests.includes('tests/auth.test.ts'), 'real test file discovered');
    for (const t of tests) {
      assert.ok(existsSync(join(root, t)), `discovered path must exist: ${t}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('extractSymbols reads the real AST of a TypeScript file', () => {
  const root = initRepo();
  try {
    const { symbols } = extractSymbols('src/auth.ts', root);
    assert.ok(symbols.includes('login'));
    assert.ok(symbols.includes('logout'));
    assert.ok(!symbols.includes('neverDeclaredAnywhere'), 'no invented symbols');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
