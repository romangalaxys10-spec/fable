#!/usr/bin/env node
/**
 * fable retrieve — fetch task-relevant agent session traces from ALL
 * fable-family datasets on Hugging Face in one pass.
 *
 * Default registry (curated, all use the public datasets-server API, no key):
 *   armand0e/claude-fable-5-claude-code          63 raw claude-code session traces
 *   saidutta69/fable-5-premium                  11k filtered SFT sessions
 *   Crownelius/Complete-FABLE.5-traces-2M       22k deduped FABLE.5 trace rows
 *   MoreThought/Fable-5.1-Max-Reasoning-Filtered-5000x   5k filtered 5.1 reasoning rows
 *   kelexine/fable-5-sft-traces                 SFT traces with thinking + task_type
 *
 * `--discover` additionally scans the HF datasets API for datasets matching
 * "fable" that look like agent/LLM traces (cached 24h in ~/.fable/discovery.json).
 *
 * Row schemas vary across datasets; adapters normalize to
 * {promptText, docText, errors[]} before ranking.
 *
 * Usage:
 *   node retrieve.js "your task" [--top N] [--per-dataset N] [--max-rows-per-dataset N]
 *        [--dataset owner/name] [--limit-datasets N] [--discover]
 *        [--include-full-text] [--list-datasets] [--json]
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DATASETS_SERVER = 'https://datasets-server.huggingface.co';
const HF_API = 'https://huggingface.co';
const ROWS = `${DATASETS_SERVER}/rows?`;
const INFO = `${DATASETS_SERVER}/info?`;
const DISCOVERY_CACHE = path.join(os.homedir(), '.fable', 'discovery.json');
const CACHE_MAX_AGE_MS = 24 * 3600 * 1000;

const REGISTRY = [
  { id: 'armand0e/claude-fable-5-claude-code', notes: 'raw claude-code session traces (prompt + messages + tool trace)' },
  { id: 'saidutta69/fable-5-premium', notes: 'filtered Fable-5 SFT sessions (messages, model, quality scores)' },
  { id: 'Crownelius/Complete-FABLE.5-traces-2M', notes: 'deduped FABLE.5 trace rows (row_json payload)' },
  { id: 'MoreThought/Fable-5.1-Max-Reasoning-Filtered-5000x', notes: 'filtered Fable-5.1 reasoning rows (messages list)' },
  { id: 'kelexine/fable-5-sft-traces', notes: 'Fable-5 SFT traces (context, thinking, response, task_type)' },
];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const positionals = args.filter((a) => !a.startsWith('--'));

function flagVal(name, dflt) {
  const i = args.indexOf(name);
  if (i === -1) return dflt;
  const v = args[i + 1];
  return v !== undefined && !v.startsWith('--') ? v : dflt;
}

function intFlag(name, dflt) {
  const v = flagVal(name, String(dflt));
  return /^\d+$/.test(v) ? parseInt(v, 10) : dflt;
}

if (flags.includes('--list-datasets')) {
  printRegistry();
  process.exit(0);
}

const query = positionals[0];
if (!query) {
  console.error(
    'Usage: node retrieve.js "<task description>" [--top N] [--per-dataset N] [--max-rows-per-dataset N] ' +
      '[--dataset owner/name] [--limit-datasets N] [--discover] [--include-full-text] [--list-datasets] [--json]'
  );
  process.exit(1);
}

const topK = intFlag('--top', 5);
const perDataset = intFlag('--per-dataset', 3);
const maxRowsPerDataset = intFlag('--max-rows-per-dataset', 96);
const datasetArg = flags.includes('--dataset') ? flagVal('--dataset', '') : '';
const limitDatasets = intFlag('--limit-datasets', 0); // 0 = all
const useDiscovery = flags.includes('--discover');
const includeFullText = flags.includes('--include-full-text');
const wantJson = flags.includes('--json');

// ---------------------------------------------------------------------------
// SSRF guard: only allowlist hosts, only validated dataset ids.
// ---------------------------------------------------------------------------

const ALLOWED_HOSTS = new Set(['huggingface.co', 'datasets-server.huggingface.co']);

function assertAllowedUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new Error(`[fable] malformed URL: ${raw}`);
  }
  if (u.protocol !== 'https:') throw new Error(`[fable] only https is allowed: ${raw}`);
  if (!ALLOWED_HOSTS.has(u.hostname)) throw new Error(`[fable] host not allowed: ${u.hostname}`);
  // Extra loopback / private / reserved checks (defense in depth):
  if (/^(localhost|0\.0\.0\.0|0:0:0:0|::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|fc)/i.test(u.hostname)) {
    throw new Error(`[fable] loopback/private/reserved host rejected: ${u.hostname}`);
  }
  if (u.hostname.includes('localhost') || u.hostname.includes('metadata.')) {
    throw new Error(`[fable] internal host rejected: ${u.hostname}`);
  }
  return u;
}

/** Dataset ids like `owner/name` from the HF API; reject anything with a URL, port, or scheme. */
function assertDatasetId(id) {
  const clean = String(id || '').trim();
  if (!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(clean)) {
    throw new Error(`[fable] refusing untrusted dataset id: ${clean}`);
  }
  // The owner/name pair is only ever interpolated into pre-built https URLs
  // whose hosts are allowlisted by assertAllowedUrl.
  return clean;
}

function buildUrl(base, id, extra = {}) {
  const u = new URL(base);
  // URLSearchParams.set encodes by itself — do NOT pre-encode, or '/' becomes %252F.
  u.searchParams.set('dataset', id);
  for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, String(v));
  return assertAllowedUrl(u.toString()).toString();
}

// ---------------------------------------------------------------------------
// Registry / discovery
// ---------------------------------------------------------------------------

function printRegistry() {
  console.log('Built-in fable dataset registry:\n');
  for (const d of REGISTRY) console.log(`  ${d.id}\n    ${d.notes}`);
  const cached = loadDiscoveryCache();
  if (cached) {
    console.log(`\nDiscovered (cached ${new Date(cached.ts).toLocaleString()}, run with --discover to refresh):\n`);
    for (const d of cached.items) console.log(`  ${d.id}\n    ${d.notes}`);
  } else {
    console.log('\n(discovered datasets: none yet — run with --discover to scan the HF datasets API)');
  }
}

function loadDiscoveryCache() {
  try {
    const c = JSON.parse(fs.readFileSync(DISCOVERY_CACHE, 'utf8'));
    if (Date.now() - c.ts < CACHE_MAX_AGE_MS && Array.isArray(c.items)) return { ts: c.ts, items: c.items };
  } catch {
    /* no cache */
  }
  return null;
}

async function discoverDatasets() {
  const cached = loadDiscoveryCache();
  if (cached && !flags.includes('--refresh')) return cached.items;
  console.error('[fable] scanning HF datasets API for "fable" agent-trace datasets…');
  const url = assertAllowedUrl(`${HF_API}/api/datasets?search=fable&limit=100&full=true`);
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HF datasets API HTTP ${res.status}`);
  const items = await res.json();
  const keep = items
    .filter((d) => {
      const blob = `${d.id} ${(d.tags || []).join(' ')} ${d.cardData?.description || ''}`.toLowerCase();
      // fable-family = LLM traces / SFT / distillation of Fable-5 models,
      // NOT Aesop fables, FACEBOOK parquets, minecraft schemes, etc.
      return /fable/.test(blob) &&
        /\b(agent|trace|sft|distill|reasoning|session|coding|finetun|fine-tun)\w*/.test(blob) &&
        !/aesop|minecraft|facebook|europarl|voxpopuli|grim|datacube/i.test(blob);
    })
    .filter((d) => !REGISTRY.some((r) => r.id === d.id))
    .slice(0, 20)
    .map((d) => ({
      id: d.id,
      notes: `[discovered] likes=${d.likes ?? 0} downloads=${d.downloads ?? 0}`,
      card: (d.cardData?.description || '').slice(0, 200),
    }));
  fs.mkdirSync(path.dirname(DISCOVERY_CACHE), { recursive: true });
  fs.writeFileSync(DISCOVERY_CACHE, JSON.stringify({ ts: Date.now(), items: keep }, null, 2));
  return keep;
}

// ---------------------------------------------------------------------------
// Scoring (shared across datasets)
// ---------------------------------------------------------------------------

const STOP = new Set(
  'the a an and or but if then else for with while you your we i is are was be to of in on at by from as it this that into over under up down so not no yes can will would should could may might let us get run make use used using task code file files work works need needed want wants just also very'.split(' ')
);

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9_\u0400-\u04FF]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function bigrams(tokens) {
  const out = new Set();
  for (let i = 0; i + 1 < tokens.length; i++) out.add(tokens[i] + '_' + tokens[i + 1]);
  return out;
}

function score(queryTokens, queryBigrams, docTokens, docBigrams, idf = null) {
  const qSet = new Set(queryTokens);
  let matched = 0;
  let weightSum = 0;
  const qWeights = new Map();
  for (const t of qSet) {
    const w = idf ? (idf.get(t) ?? 1) : 1;
    qWeights.set(t, w);
    weightSum += w;
  }
  for (const t of qSet) if (docTokens.has(t)) matched += qWeights.get(t);
  let s = matched / Math.max(1, weightSum);
  let matchedBigrams = 0;
  for (const bg of queryBigrams) if (docBigrams.has(bg)) matchedBigrams++;
  s += 0.5 * (matchedBigrams / Math.max(1, queryBigrams.size));
  return s;
}

function summarizeText(text, maxLen) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  if (flat.length <= maxLen) return flat;
  return flat.slice(0, maxLen - 1).trimEnd() + '…';
}

// ---------------------------------------------------------------------------
// Schema adapters: raw row -> {promptText, docText, errors}
// ---------------------------------------------------------------------------

const LINE_NOISE = /^\d+\s+\S/; // "1 \tcontent" numbered dumps (Read-tool output)

const ERR_MARKERS = [
  /\bexit code [1-9]\b/i,
  /traceback \(most recent call last\)/i,
  /\berror:\s/,
  /\bfailed to\b/i,
  /\bfailure\b/i,
  /\berrno\b/i,
  /\bpermission denied\b/i,
  /\bcommand not found\b/i,
  /validationerror/i,
  /\bexception\b/i,
];

function lookForErrors(texts, limit = 4) {
  const out = [];
  for (const raw of texts) {
    const text = summarizeText(raw, 300);
    if (!text || LINE_NOISE.test(text.trim())) continue;
    if (ERR_MARKERS.some((re) => re.test(raw)) && raw.trim().length > 8 && !out.includes(text)) {
      out.push(text);
      if (out.length >= limit) break;
    }
  }
  if (out.length === 0) out.push('(no explicit tool failures found)');
  return out;
}

function parseMessagesList(v) {
  // Messages may be a list of {role, content(string|blocks), tool_calls} or a JSON string of the same.
  let m = v;
  if (typeof m === 'string') {
    try {
      m = JSON.parse(m);
    } catch {
      return m;
    }
  }
  if (!Array.isArray(m)) return m;
  return m;
}

function adaptRow(row, schema) {
  const s = schema || 'auto';
  if (s === 'sft' || s === 'auto') {
    if (row.instruction && row.response && s === 'sft') {
      return {
        promptText: summarizeText(row.instruction, 600),
        docText: JSON.stringify(row),
        errors: lookForErrors([String(row.response || '')].filter((x) => x !== 'undefined').map((x) => x)),
        extra: row.category || row.source || null,
      };
    }
  }
  // Session/trace shape (fable-5-claude-code, fable-5-premium, MoreThought, kelexine, Crownelius row_json)
  if (s === 'auto' && typeof row.row_json === 'string') {
    let inner = null;
    try {
      inner = JSON.parse(row.row_json);
    } catch {
      /* opaque */
    }
    return adaptRow(inner ?? row, 'auto');
  }
  const messages = parseMessagesList(row.messages);
  let promptText = summarizeText(row.prompt ?? '', 600);
  let taskNote = row.task_type || row.model || null;
  if (!promptText && Array.isArray(messages)) {
    const firstUser = messages.find((m) => m && m.role === 'user');
    promptText = summarizeText(typeof firstUser?.content === 'string' ? firstUser.content : JSON.stringify(firstUser?.content || ''), 600);
  }
  if (!promptText && row.instruction) {
    promptText = summarizeText(row.instruction, 600);
    taskNote = row.category || taskNote;
  }
  const toolTexts = Array.isArray(messages)
    ? messages.filter((m) => m && m.role === 'tool').map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? '')))
    : [typeof row.response === 'string' ? row.response : typeof row.output === 'string' ? row.output : ''];
  return {
    promptText: promptText || '(no prompt field found in this schema)',
    docText: JSON.stringify(row),
    errors: lookForErrors(toolTexts),
    extra: taskNote ? ` ${taskNote}`.trim() : null,
  };
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url, ms = 90_000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.slice(0, 120)}…`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function probeSchema(id, config, split) {
  let data;
  try {
    data = await (await fetchWithTimeout(buildUrl(ROWS, id, { config, split, offset: 0, length: 1 }))).json();
  } catch (e) {
    // Scan-size / warm-start errors: fall back to a feature-free probe;
    // the adapter will still work in 'auto' mode from whatever rows arrive.
    return { schema: 'auto', features: [], row: null, probeFailed: e.message };
  }
  const features = (data.features || []).map((f) => f.name);
  const row = data.rows?.[0]?.row;
  if (row) {
    if (typeof row.row_json === 'string') return { schema: 'trace-wrapped', features, row };
    if (Array.isArray(row.messages) || (typeof row.messages === 'string' && row.messages.startsWith('['))) {
      const m = parseMessagesList(row.messages);
      if (Array.isArray(m) && m[0] && m[0].role) return { schema: 'session', features, row };
      if (Array.isArray(m) && m[0] && typeof m[0] === 'object' && 'content' in m[0]) return { schema: 'messages-only', features, row };
    }
    if (row.instruction && (row.response || row.output)) return { schema: 'sft', features, row };
  }
  return { schema: 'opaque', features, row };
}

/** Page a dataset up to maxRows rows. Returns [{absIndex, row}]. */
async function sampleDataset(id, config, split, maxRows) {
  const rows = [];
  const pageSize = 32;
  const maxPages = Math.ceil(Math.max(maxRows, 1) / pageSize);
  let fetched = 0;
  for (let p = 0; p < maxPages && fetched < maxRows; p++) {
    const data = await (await fetchWithTimeout(buildUrl(ROWS, id, { config, split, offset: p * pageSize, length: pageSize }))).json();
    const total = data.num_rows_total;
    for (const r of data.rows) rows.push({ absIndex: r.row_idx, row: r.row ?? {} });
    fetched += data.rows.length;
    if (total && rows.length >= total) break;
    if (data.rows.length === 0) break;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Which datasets?
  let datasets;
  if (datasetArg) {
    datasets = [assertDatasetId(datasetArg)];
  } else if (useDiscovery) {
    const extra = await discoverDatasets();
    datasets = [...REGISTRY.map((d) => d.id), ...extra.map((d) => d.id)];
  } else {
    datasets = REGISTRY.map((d) => d.id);
  }
  if (limitDatasets > 0) datasets = datasets.slice(0, limitDatasets);

  const qTokens = tokenize(query);
  const qBigrams = bigrams(qTokens);

  const allResults = [];
  const datasetReports = [];

  // Dataset health cache: datasets that failed recently are retried last, so
  // one dead dataset never serializes the whole run (benchmark finding:
  // MoreThought 404'd all run and cost every task its full timeout window).
  const HEALTH = path.join(os.homedir(), '.fable', 'dataset_health.json');
  let health = {};
  try {
    const parsed = JSON.parse(fs.readFileSync(HEALTH, 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) health = parsed;
  } catch { /* first run */ }
  const markHealth = (id, ok) => {
    const prev = health[id] || {};
    // consecutive-failure streak: 2+ fails within an hour = skip candidate
    const streak = ok ? 0 : (prev.ok === false ? (prev.fail_streak || 0) + 1 : 1);
    health[id] = { ok, ts: Date.now(), fail_streak: streak };
    try {
      fs.mkdirSync(path.dirname(HEALTH), { recursive: true });
      fs.writeFileSync(HEALTH, JSON.stringify(health));
    } catch (e) {
      // visible, not silent — a dead cache must never look like a working one
      console.error(`[retrieve] note: dataset health cache write failed (${e.message})`);
    }
  };
  const recentFailStreak = (id) => {
    const h = health[id];
    return (h && h.ok === false && (Date.now() - h.ts) < 60 * 60 * 1000) ? (h.fail_streak || 1) : 0;
  };
  // healthy first, unknown next, recently-failed last (ordering matters only
  // for sequential callers; under parallel fetch the skip check below is the
  // functional part)
  const ordered = [...datasets].sort((a, b) => (recentFailStreak(a) ? 1 : 0) - (recentFailStreak(b) ? 1 : 0));

  // skip datasets with 2+ consecutive recent failures — unless --retry-failed,
  // or unless skipping would empty the pool entirely
  const retryFailed = args.includes('--retry-failed');
  const unhealthy = ordered.filter((id) => recentFailStreak(id) >= 2);
  if (!retryFailed && unhealthy.length && unhealthy.length < ordered.length) {
    for (const id of unhealthy) {
      datasetReports.push({ dataset: id, status: 'skipped-unhealthy (2+ consecutive failures in the last hour — use --retry-failed to force)', ms: 0 });
    }
  }
  const activeDatasets = unhealthy.length && unhealthy.length < ordered.length
    ? ordered.filter((id) => !unhealthy.includes(id))
    : ordered;

  async function auditOneDataset(id) {
    const t0 = Date.now();
    try {
      const infoUrl = buildUrl(INFO, id, { config: 'default', split: 'train' });
      let config = 'default';
      let split = 'train';
      try {
        const info = await (await fetchWithTimeout(infoUrl, 30_000)).json();
        const info_ = info.dataset_info?.default;
        if (info_?.splits) {
          split = Object.keys(info_.splits)[0] || 'train';
        }
      } catch {
        /* fall back to default/train */
      }
      const probe = await probeSchema(id, config, split);
      let rows;
      try {
        rows = await sampleDataset(id, config, split, maxRowsPerDataset);
      } catch (e) {
        // Parquet without a page index makes even length=1 500 on the rows API;
        // the validation split often uses the same shards, but try it before giving up.
        if (split !== 'validation') {
          rows = await sampleDataset(id, config, 'validation', maxRowsPerDataset);
        } else {
          throw e;
        }
      }
      markHealth(id, true);
      if (rows.length === 0) {
        return { report: { dataset: id, status: 'no-rows', ms: Date.now() - t0 }, ranked: [], id };
      }

      // Cheap pre-rank over scalar / prompt text, then heavy rank over full JSON
      const cheap = rows.map(({ absIndex, row }) => {
        const a = adaptRow(row, probe.schema);
        const docTokens = new Set(tokenize([a.promptText, a.extra, row.session_id, row.file_path].join(' ')));
        return { absIndex, row, a, docTokens, docBigrams: bigrams([...docTokens]), pre: score(qTokens, qBigrams, docTokens, bigrams([...docTokens])) };
      });
      const pool = cheap
        .filter((c) => c.pre > 0)
        .sort((a, b) => b.pre - a.pre)
        .slice(0, Math.max(16, perDataset * 4));

      // IDF over the pool so boilerplate shared by every transcript is de-weighted
      const df = new Map();
      for (const c of pool) {
        const fullTokens = new Set(tokenize(c.a.docText));
        c.docTokens = fullTokens;
        c.docBigrams = bigrams([...fullTokens]);
        for (const t of fullTokens) df.set(t, (df.get(t) || 0) + 1);
      }
      const N = Math.max(1, pool.length);
      const idf = new Map();
      for (const [t, d] of df) idf.set(t, Math.log(1 + N / Math.max(1, d)));

      const ranked = pool
        .map((c) => ({ ...c, score: score(qTokens, qBigrams, c.docTokens, c.docBigrams, idf) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, perDataset)
        .map((c) => ({
          dataset: id,
          abs_index: c.absIndex,
          session_id: c.row.session_id || null,
          relevance: Math.round(c.score * 1000) / 1000,
          prompt: c.a.promptText,
          note: c.a.extra,
          errors_lessons: c.a.errors,
          ...(includeFullText ? { full_text_preview: summarizeText(c.a.docText, 4000) } : {}),
        }));
      return { report: { dataset: id, status: 'ok', sampled: rows.length, matched: ranked.length, schema: probe.schema, ms: Date.now() - t0 }, ranked, id };
    } catch (err) {
      markHealth(id, false);
      const status = err.name === 'AbortError' ? 'timeout' : `error: ${err.message}`;
      return { report: { dataset: id, status, ms: Date.now() - t0 }, ranked: [], id };
    }
  }

  // Parallel dataset audit: each dataset fetches/scores independently
  // (benchmark: sequential fetches were the single largest boost cost).
  const settled = await Promise.all(activeDatasets.map((id) => auditOneDataset(id).catch((e) => ({
    report: { dataset: id, status: `error: ${e.message}`, ms: 0 }, ranked: [], id,
  }))));
  for (const s of settled) {
    datasetReports.push(s.report);
    allResults.push(...s.ranked);
  }

  // Cross-dataset ordering: round-robin so results stay diverse across
  // datasets, then break ties by relevance. --top caps the total.
  const byDataset = new Map();
  for (const r of allResults) {
    if (!byDataset.has(r.dataset)) byDataset.set(r.dataset, []);
    byDataset.get(r.dataset).push(r);
  }
  const interleaved = [];
  for (let round = 0; round < perDataset; round++) {
    for (const items of byDataset.values()) {
      if (items[round]) interleaved.push(items[round]);
    }
  }
  const final = interleaved.sort((a, b) => b.relevance - a.relevance).slice(0, topK);

  if (wantJson) {
    console.log(
      JSON.stringify({ query, datasets: datasets, per_dataset: perDataset, results: final, dataset_reports: datasetReports }, null, 2)
    );
    return;
  }

  console.log(`# Fable multi-dataset retrieval — query: ${query}`);
  console.log(`Datasets queried: ${datasets.length} | top ${final.length} shown | per-dataset cap ${perDataset}\n`);
  final.forEach((r, i) => {
    console.log(`## ${i + 1}. [${r.dataset}] session ${r.session_id ?? r.abs_index}`);
    console.log(`- relevance: ${r.relevance}${r.note ? ` | note: ${r.note}` : ''}`);
    console.log(`- prompt: ${r.prompt}`);
    console.log(`- errors/lessons: ${r.errors_lessons.join(' • ')}`);
    if (r.full_text_preview) console.log(`- full text preview:\n${r.full_text_preview}`);
    console.log('');
  });

  console.log('--- dataset report ---');
  for (const d of datasetReports) {
    console.log(`- ${d.dataset}: ${d.status}${d.sampled !== undefined ? ` (sampled ${d.sampled}, schema ${d.schema})` : ''} ${d.matched !== undefined ? `${d.matched} matched` : ''} — ${Math.round(d.ms / 100) / 10}s`);
  }
  console.log('\nRe-run with --json for machine output, --discover to add HF API-discovered fable datasets, --dataset owner/name to pin one.');
}

main().catch((err) => {
  if (err.name === 'AbortError') {
    console.error('[fable] timed out fetching a dataset (90s). Check connectivity and retry; other datasets still succeed.');
  } else {
    console.error(`[fable] fatal: ${err.message}`);
  }
  process.exit(err.message.startsWith('[fable] refusing') ? 2 : 1);
});
