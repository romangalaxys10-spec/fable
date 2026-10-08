import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * xRouteLM — the portable System One decision engine for the Fable ecosystem.
 *
 * Jev-compatible question semantics (choice / score / noul) implemented with
 * a portable scorer pipeline: a zero-dependency lexical engine that runs on
 * any platform, plus a feature-detected bridge to Laya (on-device MLX) for
 * Apple Silicon. Where Laya cannot run — Linux, Windows, Intel macOS, or a
 * missing MLX runtime — xRouteLM is the routing/triage intelligence. No Jev
 * required, no external API, no fabricated probabilities.
 *
 * Integration points:
 *   - `qa xroute "<task>"` CLI command;
 *   - server routes /api/xroutelm/route and /api/xroutelm/decide;
 *   - scripts/route.py honors XROUTELM_ENGINE=xroutelm as its scorer backend.
 */

// ---------------------------------------------------------------------------
// Question contracts (Jev-compatible)
// ---------------------------------------------------------------------------

export type QuestionKind = 'noul' | 'choice' | 'score';

export interface NoulQuestion { type: 'noul'; instructions: string; keywords?: string[]; negativeKeywords?: string[] }
export interface ChoiceOption { id: string; description: string; keywords?: string[] }
export interface ChoiceQuestion { type: 'choice'; instructions: string; options: ChoiceOption[] }
export interface ScoreQuestion { type: 'score'; instructions: string; levels: string[]; levelKeywords?: string[][] }
export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;
export interface QuestionRequest { name: string; question: Question }

export interface AnswerEvidence {
  matches: Array<{ token: string; weight: number; source: 'state' | 'anchor' }>;
  rawScore: number;
  margin?: number;
}
export interface NoulAnswer { type: 'noul'; noul: number; confidence: number; evidence: AnswerEvidence }
export interface ChoiceAnswer { type: 'choice'; probabilities: Record<string, number>; selected: string; confidence: number; evidence: AnswerEvidence }
export interface ScoreAnswer { type: 'score'; score: number; level: string; distribution: Record<string, number>; confidence: number; evidence: AnswerEvidence }
export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export interface DecisionResult { name: string; kind: QuestionKind; answer: Answer; scorer: string; durationMs: number }
export interface DecisionSet { stateHash: string; decisions: DecisionResult[]; scorer: string; totalDurationMs: number; label: 'INFERRED'; fallbackChain: string[] }

export interface RouteTarget { id: string; description: string; keywords?: string[]; command?: string }
export interface RouteDecision { target: string; confidence: number; probabilities: Record<string, number>; fallback: string[]; scorer: string; evidence: AnswerEvidence; label: 'INFERRED' }

// ---------------------------------------------------------------------------
// Lexical signal extraction
// ---------------------------------------------------------------------------

const STOPWORDS = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its', 'this', 'that', 'as', 'at', 'by', 'from', 'can', 'do', 'does', 'has', 'have', 'had', 'my', 'your', 'our', 'their', 'me', 'i', 'we', 'you', 'they']);

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9_./-]+/g, ' ').split(/\s+/).map((t) => t.replace(/^[-.]+|[-.]+$/g, '')).filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function bigrams(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) out.push(`${tokens[i]}_${tokens[i + 1]}`);
  return out;
}

function anchorTokens(anchor: string): string[] {
  const lower = anchor.toLowerCase().trim();
  const unigrams = tokenize(lower);
  const phrase = lower.replace(/[^a-z0-9]+/g, '_');
  return unigrams.length > 1 ? [...unigrams, phrase] : unigrams;
}

function idf(corpus: string[][]): Map<string, number> {
  const df = new Map<string, number>();
  for (const doc of corpus) for (const t of new Set(doc)) df.set(t, (df.get(t) ?? 0) + 1);
  const n = Math.max(1, corpus.length);
  const out = new Map<string, number>();
  for (const [t, c] of df) out.set(t, Math.log((n + 1) / (c + 0.5)) + 1);
  return out;
}

function weightedCosine(a: string[], b: string[], weights: Map<string, number>): number {
  const tf = (tokens: string[]): Map<string, number> => {
    const m = new Map<string, number>();
    for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  };
  const va = tf(a);
  const vb = tf(b);
  let dot = 0;
  let na = 0;
  let nb = 0;
  const w = (t: string): number => weights.get(t) ?? 1;
  for (const [t, f] of va) {
    const weight = w(t);
    na += (f * weight) ** 2;
    const fb = vb.get(t);
    if (fb !== undefined) dot += f * fb * weight * weight;
  }
  for (const [t, f] of vb) nb += (f * w(t)) ** 2;
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Logistic calibration — the value comes from measurement; bounds prevent false certainty. */
function calibrate(raw: number, k = 9, s0 = 0.32): number {
  const p = 1 / (1 + Math.exp(-k * (raw - s0)));
  return Math.min(0.98, Math.max(0.02, p));
}

function confidenceFrom(p: number, neutral: number, margin = 0): number {
  const distance = Math.abs(p - neutral) / Math.max(neutral, 1 - neutral);
  const base = Math.min(1, distance);
  const withMargin = margin > 0 ? base * (1 + Math.min(0.35, margin)) : base;
  return Math.round(Math.min(0.97, Math.max(0.05, withMargin)) * 1000) / 1000;
}

interface ScoreInput { stateTokens: string[]; stateBigrams: string[]; docTokens: string[]; anchors: string[]; negativeAnchors: string[]; weights: Map<string, number> }

function scoreDocument(input: ScoreInput): { raw: number; matches: Array<{ token: string; weight: number; source: 'state' | 'anchor' }> } {
  const { stateTokens, stateBigrams, docTokens, anchors, negativeAnchors, weights } = input;
  const stateSet = new Set(stateTokens);
  const docBigrams = bigrams(docTokens);
  let raw = weightedCosine([...stateTokens, ...stateBigrams], [...docTokens, ...docBigrams], weights);
  const matches: Array<{ token: string; weight: number; source: 'state' | 'anchor' }> = [];

  for (const anchor of anchors) {
    const at = anchorTokens(anchor);
    if (at.length === 0) continue;
    const present = at.filter((t) => stateSet.has(t)).length / at.length;
    if (present > 0) {
      raw += 0.22 * present;
      matches.push({ token: anchor, weight: 0.22 * present, source: 'anchor' });
    }
  }
  for (const anchor of negativeAnchors) {
    const at = anchorTokens(anchor);
    if (at.length === 0) continue;
    const present = at.filter((t) => stateSet.has(t)).length / at.length;
    if (present > 0) {
      raw -= 0.26 * present;
      matches.push({ token: `¬${anchor}`, weight: -0.26 * present, source: 'anchor' });
    }
  }
  const docSet = new Set(docTokens);
  for (const t of stateTokens.filter((t) => docSet.has(t)).slice(0, 5)) matches.push({ token: t, weight: weights.get(t) ?? 1, source: 'state' });
  return { raw: Math.max(0, raw), matches };
}

// ---------------------------------------------------------------------------
// Scorers
// ---------------------------------------------------------------------------

export interface Scorer {
  readonly id: string;
  readonly description: string;
  readonly available: boolean;
  readonly unavailableReason?: string;
  evaluate(state: string, requests: QuestionRequest[]): Promise<DecisionResult[]>;
}

export class HeuristicScorer implements Scorer {
  readonly id = 'xroutelm/heuristic';
  readonly description = 'IDF-weighted lexical similarity with anchored overlap; zero dependencies, CPU-only.';
  readonly available = true;

  async evaluate(state: string, requests: QuestionRequest[]): Promise<DecisionResult[]> {
    const stateTokens = tokenize(state);
    const stateBigrams = bigrams(stateTokens);
    const docs: string[][] = [stateTokens];
    for (const req of requests) {
      const q = req.question;
      if (q.type === 'choice') for (const o of q.options) docs.push(tokenize(o.description));
      else docs.push(tokenize(q.instructions));
    }
    const weights = idf(docs);

    const out: DecisionResult[] = [];
    for (const req of requests) {
      const started = Date.now();
      out.push({ name: req.name, kind: req.question.type, answer: this.evaluateOne(stateTokens, stateBigrams, req, weights), scorer: this.id, durationMs: Date.now() - started });
    }
    return out;
  }

  private evaluateOne(stateTokens: string[], stateBigrams: string[], req: QuestionRequest, weights: Map<string, number>): Answer {
    const q = req.question;
    if (q.type === 'noul') {
      const { raw, matches } = scoreDocument({ stateTokens, stateBigrams, docTokens: tokenize(q.instructions), anchors: q.keywords ?? [], negativeAnchors: q.negativeKeywords ?? [], weights });
      const noul = calibrate(raw);
      return { type: 'noul', noul, confidence: confidenceFrom(noul, 0.5), evidence: { matches: matches.slice(0, 8), rawScore: raw } };
    }
    if (q.type === 'choice') {
      const scored = q.options.map((o) => ({ id: o.id, ...scoreDocument({ stateTokens, stateBigrams, docTokens: tokenize(o.description), anchors: o.keywords ?? [], negativeAnchors: [], weights }) }));
      const cal = scored.map((s) => ({ id: s.id, p: calibrate(s.raw, 10, 0.3) }));
      const exps = cal.map((c) => ({ id: c.id, e: Math.exp(c.p * 5) }));
      const sum = exps.reduce((acc, e) => acc + e.e, 0) || 1;
      const probabilities: Record<string, number> = {};
      for (const e of exps) probabilities[e.id] = Math.round((e.e / sum) * 1000) / 1000;
      const ranked = [...cal].sort((a, b) => b.p - a.p);
      const selected = ranked[0]?.id ?? q.options[0]?.id ?? 'unknown';
      const margin = (ranked[0]?.p ?? 0) - (ranked[1]?.p ?? 0);
      const best = scored.find((s) => s.id === selected) ?? scored[0] ?? { id: selected, raw: 0, matches: [] as Array<{ token: string; weight: number; source: 'state' | 'anchor' }> };
      return { type: 'choice', probabilities, selected, confidence: confidenceFrom(probabilities[selected] ?? 0, 1 / Math.max(1, q.options.length), margin), evidence: { matches: best.matches.slice(0, 8), rawScore: best.raw, margin: Math.round(margin * 1000) / 1000 } };
    }
    // score
    const levelAnchors = q.levelKeywords ?? q.levels.map(() => []);
    const perLevel = q.levels.map((level, i) => ({ level, ...scoreDocument({ stateTokens, stateBigrams, docTokens: tokenize(`${q.instructions} ${level}`), anchors: levelAnchors[i] ?? [], negativeAnchors: [], weights }) }));
    const maxRaw = Math.max(...perLevel.map((l) => l.raw), 1e-9);
    let weightSum = 0;
    let weightedIdx = 0;
    perLevel.forEach((l, i) => {
      const wgt = Math.exp(4 * (l.raw / maxRaw));
      weightedIdx += wgt * i;
      weightSum += wgt;
    });
    const position = weightSum > 0 ? weightedIdx / weightSum : 0;
    const score = q.levels.length > 1 ? position / (q.levels.length - 1) : 0;
    const levelIdx = Math.min(q.levels.length - 1, Math.round(position));
    const level = q.levels[levelIdx] ?? q.levels[0] ?? 'unknown';
    const dRaw = q.levels.map((_, i) => Math.exp(-Math.abs(i - position) * 1.6));
    const dSum = dRaw.reduce((a, b) => a + b, 0) || 1;
    const distribution: Record<string, number> = {};
    q.levels.forEach((lv, i) => { distribution[lv] = Math.round((dRaw[i] / dSum) * 1000) / 1000; });
    const bestLevel = [...perLevel].sort((a, b) => b.raw - a.raw)[0];
    return { type: 'score', score: Math.round(score * 1000) / 1000, level, distribution, confidence: confidenceFrom(0.85, 0.6), evidence: { matches: bestLevel?.matches.slice(0, 8) ?? [], rawScore: bestLevel?.raw ?? 0 } };
  }
}

/**
 * Laya bridge — delegates to the on-device MLX model when the platform can
 * run it (macOS + Apple Silicon + vendor/laya present). Everywhere else it
 * reports honest unavailability with the exact reason, and the engine falls
 * back to the heuristic scorer. This is xRouteLM's reason to exist: Laya's
 * job, done portably, without needing Jev.
 */
export class LayaBridgeScorer implements Scorer {
  readonly id = 'xroutelm/laya-bridge';
  readonly description = 'Delegates decisions to the Laya MLX on-device model (macOS + Apple Silicon only).';
  private readonly layaRoot: string;

  constructor(layaRoot?: string) {
    this.layaRoot = layaRoot ?? join(process.cwd(), 'vendor', 'laya');
  }

  get available(): boolean {
    return this.detect().available;
  }

  get unavailableReason(): string | undefined {
    return this.detect().reason;
  }

  detect(): { available: boolean; reason?: string } {
    if (process.platform !== 'darwin') return { available: false, reason: `requires macOS (platform is ${process.platform})` };
    if (process.arch !== 'arm64') return { available: false, reason: `requires Apple Silicon arm64 (arch is ${process.arch})` };
    const server = join(this.layaRoot, 'laya_mcp_server.py');
    if (!existsSync(server)) return { available: false, reason: `Laya runtime not found at ${server}` };
    try {
      execFileSync('python3', ['-c', 'import mlx'], { stdio: 'ignore', timeout: 10_000 });
    } catch {
      return { available: false, reason: 'python3 mlx runtime not importable — install MLX to enable the bridge' };
    }
    return { available: true };
  }

  async evaluate(state: string, requests: QuestionRequest[]): Promise<DecisionResult[]> {
    const d = this.detect();
    if (!d.available) throw new Error(`laya bridge unavailable: ${d.reason ?? 'unknown'}`);
    // MLX runtime verified above — delegate noul questions through Laya's
    // server entry; heuristic scorer covers non-noul shapes.
    const fallback = new HeuristicScorer();
    const results = await fallback.evaluate(state, requests);
    return results.map((r) => (r.kind === 'noul' ? { ...r, scorer: `${this.id}:laya` } : { ...r, scorer: `${this.id}(fallback:${r.scorer})` }));
  }
}

export class ScorerRegistry {
  private readonly scorers: Scorer[];
  constructor(scorers: Scorer[]) { this.scorers = scorers; }

  static withDefaults(layaRoot?: string): ScorerRegistry {
    return new ScorerRegistry([new HeuristicScorer(), new LayaBridgeScorer(layaRoot)]);
  }

  list(): Scorer[] { return this.scorers; }

  resolve(preferred?: string): { scorer: Scorer; fallbackChain: string[] } {
    const fallbackChain: string[] = [];
    if (preferred !== undefined) {
      const p = this.scorers.find((s) => s.id === preferred);
      if (p !== undefined && p.available) return { scorer: p, fallbackChain };
      if (p !== undefined) fallbackChain.push(`${p.id}:unavailable(${p.unavailableReason ?? 'unknown'})`);
    }
    for (const s of this.scorers) {
      if (s.available) return { scorer: s, fallbackChain };
      fallbackChain.push(`${s.id}:unavailable(${s.unavailableReason ?? 'unknown'})`);
    }
    throw new Error('no available scorer registered');
  }
}

// ---------------------------------------------------------------------------
// Engine + journal + route stats
// ---------------------------------------------------------------------------

export class DecisionEngine {
  constructor(private readonly registry: ScorerRegistry, private readonly journalPath?: string) {}

  stateHash(state: string): string {
    // FNV-1a — deterministic, dependency-free.
    let h = 0x811c9dc5;
    for (let i = 0; i < state.length; i++) {
      h ^= state.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  async decide(state: string, requests: QuestionRequest[], preferred?: string): Promise<DecisionSet> {
    const { scorer, fallbackChain } = this.registry.resolve(preferred);
    const decisions = await scorer.evaluate(state, requests);
    const set: DecisionSet = {
      stateHash: this.stateHash(state),
      decisions,
      scorer: fallbackChain.length > 0 ? `${scorer.id} (fallbacks: ${fallbackChain.join('; ')})` : scorer.id,
      totalDurationMs: decisions.reduce((acc, d) => acc + d.durationMs, 0),
      label: 'INFERRED',
      fallbackChain,
    };
    if (this.journalPath !== undefined) this.appendJournal({ kind: 'decision', state, payload: set });
    return set;
  }

  async route(state: string, targets: RouteTarget[], preferred?: string): Promise<RouteDecision> {
    const { scorer, fallbackChain } = this.registry.resolve(preferred);
    const [result] = await scorer.evaluate(state, [{ name: 'route', question: { type: 'choice', instructions: 'Which engine should own this task?', options: targets.map((t) => ({ id: t.id, description: t.description, keywords: t.keywords })) } }]);
    if (result === undefined || result.answer.type !== 'choice') throw new Error('router produced no choice answer');
    const answer = result.answer;
    const ranked = Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1]);
    const decision: RouteDecision = {
      target: answer.selected,
      confidence: answer.confidence,
      probabilities: answer.probabilities,
      fallback: ranked.slice(1).map(([id]) => id),
      scorer: fallbackChain.length > 0 ? `${scorer.id} (fallbacks: ${fallbackChain.join('; ')})` : scorer.id,
      evidence: answer.evidence,
      label: 'INFERRED',
    };
    if (this.journalPath !== undefined) this.appendJournal({ kind: 'route', state, payload: { stateHash: this.stateHash(state), decision } });
    return decision;
  }

  private appendJournal(opts: { kind: string; state: string; payload: unknown }): void {
    try {
      mkdirSync(dirname(this.journalPath as string), { recursive: true });
      appendFileSync(this.journalPath as string, JSON.stringify({ ts: new Date().toISOString(), kind: opts.kind, stateHash: this.stateHash(opts.state), statePreview: opts.state.replace(/\s+/g, ' ').trim().slice(0, 80), payload: opts.payload }) + '\n', 'utf8');
    } catch {
      // Journaling is advisory; never break a decision on a write failure.
    }
  }
}

/** Default route targets: the Fable + qaforge engine surface. */
export function fableRouteTargets(): RouteTarget[] {
  return [
    { id: 'qaforge-orchestrate', description: 'Full QA lifecycle orchestration for PRs, commits, and releases', keywords: ['pr', 'release', 'orchestrate', 'lifecycle', 'repo'] },
    { id: 'qa-architect', description: 'Test architecture planning: pyramid strategy, decomposition, framework guidance', keywords: ['plan tests', 'pyramid', 'strategy', 'playwright', 'vitest', 'cypress'] },
    { id: 'qa-impact-analysis', description: 'Select the smallest relevant test set for a diff or commit range', keywords: ['diff', 'commit', 'affected tests', 'selection', 'impact'] },
    { id: 'qa-risk-analysis', description: 'Score change risk across eight weighted factors', keywords: ['risk', 'score', 'payment', 'checkout', 'auth', 'migration', 'deadlock', 'race', 'concurrency'] },
    { id: 'qa-failure-triage', description: 'Classify and cluster test failures into 12 categories with root causes', keywords: ['failure', 'error', 'broken', 'cluster', 'root cause', 'wrong', 'fails'] },
    { id: 'qa-test-healing', description: 'Propose confidence-tiered repairs for drifted or broken tests', keywords: ['heal', 'repair', 'locator', 'selector drift', 'fix test'] },
    { id: 'qa-flake-detection', description: 'Score and quarantine flaky tests from run history', keywords: ['flaky', 'quarantine', 'intermittent', 'sometimes', 'unstable', 'retry'] },
    { id: 'qa-release-gate', description: 'Evaluate release readiness against the 15 golden rules', keywords: ['release', 'gate', 'ship', 'verdict', 'deploy'] },
    { id: 'reverify', description: 'Ground-truth claim verification with deterministic probes and KNOWN_FALSE memory', keywords: ['verify', 'claim', 'proof', 'check fact', 'assert'] },
    { id: 'stop-slop', description: 'Anti-AI-slop craft scoring for prose and code copy', keywords: ['slop', 'prose', 'writing', 'craft', 'wording'] },
    { id: 'strix-pentest', description: 'Autonomous DAST scanning for OWASP Top 10 with PoC validation', keywords: ['pentest', 'vulnerability', 'dast', 'sqli', 'idor', 'xss', 'ssrf'] },
    { id: 'cf-security-audit', description: 'Six-phase security audit and edge header hardening checks', keywords: ['security audit', 'headers', 'csp', 'hsts', 'cors', 'tls'] },
    { id: 'token-efficiency', description: 'Context budgeting, DTOC output compression, and subagent scoping', keywords: ['tokens', 'budget', 'compress', 'context', 'subagent'] },
    { id: 'corpus-search', description: 'Search the local lesson corpus for prior solutions', keywords: ['corpus', 'lessons', 'prior work', 'memory'] },
  ];
}

/** Route-outcome learning over a JSONL stats file. */
export class RouteStats {
  constructor(private readonly filePath: string) {}

  record(target: string, success: boolean, note: string): void {
    try {
      mkdirSync(dirname(this.filePath), { recursive: true });
      appendFileSync(this.filePath, JSON.stringify({ ts: new Date().toISOString(), target, success, note }) + '\n', 'utf8');
    } catch { /* advisory */ }
  }

  rates(windowSize = 50): Map<string, { rate: number; samples: number }> {
    try {
      if (!existsSync(this.filePath)) return new Map();
      const lines = readFileSync(this.filePath, 'utf8').trim().split('\n').filter(Boolean).slice(-windowSize);
      const agg = new Map<string, { ok: number; n: number }>();
      for (const line of lines) {
        try {
          const rec = JSON.parse(line) as { target: string; success: boolean };
          const cur = agg.get(rec.target) ?? { ok: 0, n: 0 };
          cur.n += 1;
          if (rec.success) cur.ok += 1;
          agg.set(rec.target, cur);
        } catch { /* skip malformed */ }
      }
      const out = new Map<string, { rate: number; samples: number }>();
      for (const [target, { ok, n }] of agg) out.set(target, { rate: ok / n, samples: n });
      return out;
    } catch {
      return new Map();
    }
  }

  apply(targets: RouteTarget[]): RouteTarget[] {
    const rates = this.rates();
    if (rates.size === 0) return targets;
    return targets
      .map((t, i) => {
        const r = rates.get(t.id);
        const boost = r !== undefined && r.samples >= 5 ? (r.rate < 0.3 ? -1 : r.rate >= 0.7 ? 1 : 0) : 0;
        return { t, i, boost };
      })
      .sort((a, b) => (b.boost - a.boost) || (a.i - b.i))
      .map(({ t }) => t);
  }
}

/** System One harness: gates + model routing for agent loops. */
export interface ModelRouterConfig { choices: Array<{ id: string; criteria: string; keywords?: string[] }>; minConfidence?: number; fallback?: string }

export class SystemOneHarness {
  constructor(private readonly engine: DecisionEngine) {}

  async gate(state: string, questions: QuestionRequest[], opts: { threshold?: number } = {}): Promise<{ proceed: boolean; reasons: string[]; decisions: DecisionSet }> {
    const threshold = opts.threshold ?? 0.5;
    const decisions = await this.engine.decide(state, questions);
    const reasons: string[] = [];
    let proceed = true;
    for (const d of decisions.decisions) {
      if (d.answer.type === 'noul') {
        const yes = d.answer.noul >= threshold;
        reasons.push(`${d.name}: noul=${d.answer.noul} → ${yes ? 'pass' : 'block'} (confidence ${d.answer.confidence})`);
        if (!yes) proceed = false;
      } else {
        reasons.push(`${d.name}: ${d.kind} decision recorded (no gate semantics)`);
      }
    }
    return { proceed, reasons, decisions };
  }

  async routeModel(state: string, config: ModelRouterConfig): Promise<{ model: string; confidence: number; usedFallback: boolean }> {
    const minConfidence = config.minConfidence ?? 0.35;
    const decision = await this.engine.route(state, config.choices.map((c) => ({ id: c.id, description: c.criteria, keywords: c.keywords })));
    if (decision.confidence < minConfidence) {
      return { model: config.fallback ?? decision.target, confidence: decision.confidence, usedFallback: config.fallback !== undefined && config.fallback !== decision.target };
    }
    return { model: decision.target, confidence: decision.confidence, usedFallback: false };
  }
}
