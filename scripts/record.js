#!/usr/bin/env node
/**
 * fable record — distill a completed task into the local fable corpus.
 *
 * The corpus is a set of JSONL "lesson cards" stored at:
 *   ~/.fable/corpus.jsonl
 *
 * Each card: {ts, task, context, outcome, key_steps, gotchas, learnings}
 *
 * This script does NOT call a model. You (the agent) compose the card from
 * the current session, pass it to this script, and it dedupes/appends and
 * shows you the card so you can verify it before it counts as stored.
 *
 * Usage:
 *   node record.js --task "..." --outcome "..." --learnings "a|b|c" \
 *        [--context "project/state"] [--steps "1) ...|2) ..."] [--gotchas "g1|g2"]
 *
 * `--query-only` prints just the stored cards without appending.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CORPUS_FILE = process.env.FABLE_CORPUS || path.join(os.homedir(), '.fable', 'corpus.jsonl');

function flagVal(args, name, dflt) {
  const i = args.indexOf(name);
  if (i === -1) return dflt;
  const v = args[i + 1];
  return v !== undefined && !v.startsWith('--') ? v : dflt;
}

const args = process.argv.slice(2);
const queryOnly = args.includes('--query-only');
const split = (s, sep = '|') =>
  String(s || '')
    .split(sep)
    .map((x) => x.trim())
    .filter(Boolean);

const card = {
  ts: new Date().toISOString(),
  task: flagVal(args, '--task', ''),
  context: flagVal(args, '--context', ''),
  outcome: flagVal(args, '--outcome', ''),
  key_steps: split(flagVal(args, '--steps')),
  gotchas: split(flagVal(args, '--gotchas')),
  learnings: split(flagVal(args, '--learnings')),
};

function readCards() {
  try {
    return fs
      .readFileSync(CORPUS_FILE, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

function sig(c) {
  return c.task.toLowerCase().replace(/[^a-z0-9\u0400-\u04FF]+/g, ' ').trim();
}

if (!queryOnly) {
  if (!card.task || !card.outcome) {
    console.error('Usage: node record.js --task "..." --outcome "..." [--learnings "a|b|c"] [--steps "…"] [--gotchas "…"] [--context "…"]');
    process.exit(1);
  }
  const existing = readCards();
  const duplicate = existing.find((c) => sig(c) === sig(card));
  if (duplicate) {
    console.log('DUPLICATE — an identical task signature already exists; appending nothing.');
    console.log(JSON.stringify(duplicate, null, 2));
    process.exit(0);
  }
  fs.mkdirSync(path.dirname(CORPUS_FILE), { recursive: true });
  fs.appendFileSync(CORPUS_FILE, JSON.stringify(card) + '\n');
  console.log(`STORED → ${CORPUS_FILE} (${existing.length + 1} cards total)`);
}

// Always dump the corpus so the agent can use it in the current session.
const cards = readCards();
console.log(`\n# Fable local corpus — ${cards.length} card(s)\n`);
for (const c of cards.slice(-10)) {
  console.log(`- [${c.ts}] ${c.task} → ${c.outcome}`);
  if (c.learnings.length) console.log(`  learnings: ${c.learnings.join(' • ')}`);
  if (c.gotchas.length) console.log(`  gotchas: ${c.gotchas.join(' • ')}`);
}
if (cards.length === 0) console.log('(corpus empty — nothing recorded yet)');
