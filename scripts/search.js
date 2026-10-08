#!/usr/bin/env node
/**
 * fable search — rank the LOCAL fable corpus against the current task.
 *
 * Usage:
 *   node search.js "your current task description" [--top N]
 *
 * Prints the best-matching stored lesson cards so you can reuse the
 * project's own past experience before reaching for external fable data.
 */

'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CORPUS_FILE = process.env.FABLE_CORPUS || path.join(os.homedir(), '.fable', 'corpus.jsonl');

const args = process.argv.slice(2);
const query = args[0];
const topK = (() => {
  const i = args.indexOf('--top');
  const v = args[i + 1];
  return /^\d+$/.test(v) ? parseInt(v, 10) : 5;
})();

if (!query) {
  console.error('Usage: node search.js "<task description>" [--top N]');
  process.exit(1);
}

const STOP = new Set(
  'the a an and or but if then else for with while you your we i is are was be to of in on at by from as it this that into over up down so not no yes can will would should could may might let us get run make use used using task code file files work works need needed want wants just also very'.split(' ')
);
function tokenize(t) {
  return String(t || '')
    .toLowerCase()
    .replace(/[^a-z0-9_\u0400-\u04FF]+/g, ' ')
    .split(' ')
    .filter((x) => x.length > 2 && !STOP.has(x));
}

function cardText(c) {
  return [c.task, c.context, c.outcome, c.key_steps, c.gotchas, c.learnings].join(' ').concat(' ');
}

let cards = [];
try {
  cards = fs
    .readFileSync(CORPUS_FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
} catch {
  console.log(`No local corpus yet (${CORPUS_FILE}). Nothing to search.`);
  process.exit(0);
}

const q = new Set(tokenize(query));
const scored = cards.map((c) => {
  const doc = new Set(tokenize(cardText(c)));
  const inter = [...q].filter((t) => doc.has(t)).length;
  return { c, score: inter / Math.max(1, q.size) };
}).sort((a, b) => b.score - a.score);

const top = scored.filter((s) => s.score > 0).slice(0, topK);
if (top.length === 0) {
  console.log('No matching stored cards for this task.');
  process.exit(0);
}

for (const { c, score } of top) {
  console.log(`\n[${(score * 100).toFixed(0)}% match] ${c.task}`);
  if (c.context) console.log(`  context:   ${c.context}`);
  console.log(`  outcome:   ${c.outcome}`);
  if (c.key_steps.length) console.log(`  steps:     ${c.key_steps.join(' → ')}`);
  if (c.learnings.length) console.log(`  learnings: ${c.learnings.join(' • ')}`);
  if (c.gotchas.length) console.log(`  gotchas:   ${c.gotchas.join(' • ')}`);
}
