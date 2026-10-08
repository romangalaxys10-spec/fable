/* Behavioral proof for the MCP arguments validator in QAArchitectTab.
 * Imports the REAL component module (React/lucide evaluate fine under tsx —
 * nothing renders) and exercises accept/reject paths a hostile textarea
 * payload would take. Run: npx tsx tests/qa-architect-mcp-args.test.mjs? —
 * kept as a script that exits 1 on any failed expectation. */
import assert from 'node:assert/strict';
import { validateMcpArgs } from '../src/components/QAArchitectTab';

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

check('accepts a plain object with task string', () => {
  const v = validateMcpArgs({ task: 'Stripe webhook retry queue' });
  assert.equal(v.ok, true);
});

check('accepts nested objects and arrays within depth', () => {
  const v = validateMcpArgs({ a: { b: { c: [1, 2, { d: 'x' }] } } });
  assert.equal(v.ok, true);
});

check('rejects null', () => {
  const v = validateMcpArgs(null);
  assert.equal(v.ok, false);
  assert.match(v.error ?? '', /got null/);
});

check('rejects arrays as top-level arguments', () => {
  const v = validateMcpArgs([1, 2, 3]);
  assert.equal(v.ok, false);
  assert.match(v.error ?? '', /got array/);
});

check('rejects string/primitive arguments', () => {
  const v = validateMcpArgs('run everything');
  assert.equal(v.ok, false);
  assert.match(v.error ?? '', /got string/);
});

check('rejects __proto__ key (prototype pollution attempt)', () => {
  const v = validateMcpArgs(JSON.parse('{"__proto__": {"isAdmin": true}, "task": "x"}'));
  assert.equal(v.ok, false);
  assert.match(v.error ?? '', /forbidden key "__proto__"/);
});

check('rejects constructor and prototype keys at any depth', () => {
  assert.equal(validateMcpArgs({ nested: { constructor: {} } }).ok, false);
  assert.equal(validateMcpArgs({ deep: { deeper: { prototype: 1 } } }).ok, false);
});

check('rejects nesting beyond the depth bound', () => {
  let deep: Record<string, unknown> = { leaf: true };
  for (let i = 0; i < 12; i++) deep = { wrap: deep };
  const v = validateMcpArgs(deep);
  assert.equal(v.ok, false);
  assert.match(v.error ?? '', /nesting exceeds 8/);
});

console.log(`\n${passed} validator checks passed`);
