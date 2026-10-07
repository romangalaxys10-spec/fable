import React, { useState } from 'react';
import { 
  Compass, 
  Play, 
  CheckCircle, 
  XCircle, 
  Terminal, 
  Layers, 
  Clock, 
  Zap, 
  Cpu, 
  Copy, 
  Check,
  AlertTriangle
} from 'lucide-react';
import { RoutingPlan } from '../types';

export const RoutingLabTab: React.FC = () => {
  const [taskInput, setTaskInput] = useState('Optimize database query with indexing and fix intermittent connection deadlock');
  const [useLaya, setUseLaya] = useState(false);
  const [loading, setLoading] = useState(false);
  const [routingPlan, setRoutingPlan] = useState<RoutingPlan | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const presets = [
    { title: 'Token Efficiency (v3.3.0)', query: 'Optimize large codebase context, enforce AST-first reading and DTOC output compression' },
    { title: 'QA & Testing', query: 'Write Playwright E2E and API contract tests for user checkout with 4-quadrant decomposition' },
    { title: 'Concurrency Deadlock', query: 'Fix race condition and thread deadlock in queue consumer worker' },
    { title: 'Format & Lint', query: 'Quick format JSON schema file and fix trailing comma' },
    { title: 'API Integration', query: 'Build GitHub webhook listener with HMAC signature verification' },
    { title: 'Cinematic Video', query: 'Create animated storyboard video explaining software release notes' }
  ];

  const handleRoute = async (taskToRun = taskInput) => {
    if (!taskToRun.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskToRun, laya: useLaya })
      });
      const data = await res.json();
      setRoutingPlan(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-400" />
            Smart In-Skill Routing Lab (`scripts/route.py`)
          </h2>
          <p className="text-xs text-slate-400">
            Step 0 of any Fable task. Classifies task complexity and emits optimal execution path.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg cursor-pointer">
            <input 
              type="checkbox" 
              checked={useLaya} 
              onChange={(e) => setUseLaya(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-amber-400 focus:ring-0"
            />
            <span>Enable Laya MLX Batch Check</span>
          </label>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-slate-500 py-1">Sample Scenarios:</span>
        {presets.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              setTaskInput(p.query);
              handleRoute(p.query);
            }}
            className="text-xs px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
          >
            {p.title}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRoute()}
            placeholder="Describe the coding, refactor, or research task..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
          />
          <button
            onClick={() => handleRoute()}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 text-sm font-bold shadow-md shadow-amber-400/20 transition"
          >
            {loading ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-slate-950" />}
            <span>Evaluate Route</span>
          </button>
        </div>
      </div>

      {/* Result Display */}
      {routingPlan && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Mode Verdict Card */}
          <div className="lg:col-span-1 rounded-xl bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Router Verdict
              </div>
              <div className="flex items-center gap-3 my-3">
                <div className={`text-2xl font-black px-3 py-1.5 rounded-lg ${
                  routingPlan.mode === 'QA-ARCHITECT' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                  routingPlan.mode === 'ULTRA' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                  routingPlan.mode === 'SMART' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                  routingPlan.mode === 'VIDEO' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                  'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {routingPlan.mode} MODE
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {routingPlan.mode === 'QA-ARCHITECT' && 'QA-Architect mode engaged (QASkills.sh). Decomposes feature into 4 quadrants, generates Playwright/Vitest specs, and enforces zero arbitrary sleeps.'}
                {routingPlan.mode === 'ULTRA' && 'Fast-lane speed protocol selected. Answer-first discipline with minimal token overhead.'}
                {routingPlan.mode === 'BOOST' && 'Standard Fable boost pipeline: local corpus checked, followed by multi-dataset retrieval and Headroom context compression.'}
                {routingPlan.mode === 'SMART' && 'Hard-task boss fight detected. Scaffolds GVS5H ledger loop (.smart/<slug>/) with 3+ approach ideations and adversarial test verification.'}
                {routingPlan.mode === 'VIDEO' && 'Video/animation task detected. Hands off to ViMax storyboard generator & Remotion renderer.'}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-2 font-semibold">Ready CLI Commands:</span>
              <div className="space-y-2">
                {routingPlan.commands?.map((cmd, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-850 font-mono text-[11px] text-amber-300 group">
                    <span className="truncate pr-2">{cmd}</span>
                    <button
                      onClick={() => copyToClipboard(cmd)}
                      className="text-slate-400 hover:text-white p-1 rounded"
                    >
                      {copiedCmd === cmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Engine Decisions Table */}
          <div className="lg:col-span-2 rounded-xl bg-slate-900 border border-slate-800 p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Engine Activation Matrix
            </h3>
            <div className="divide-y divide-slate-800/80">
              {routingPlan.recommendations?.map((rec, idx) => {
                const isRun = rec.status === 'run';
                return (
                  <div key={idx} className="py-3 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-2.5">
                      {isRun ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="text-xs font-bold font-mono text-white">
                          {rec.engine}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {rec.reason}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      isRun ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {rec.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Universal Token Efficiency Protocol Workbench */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 border border-slate-800 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Protocol v3.3.0
              </span>
              <span className="text-xs text-slate-400">Pi + MemEx + Hernanz 60B Rules</span>
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              Universal Token Efficiency Protocol Workbench
            </h3>
            <p className="text-xs text-slate-400">
              Cuts coding agent context footprint from ~280k to ~35k tokens (8x reduction) via AST-first file reading, DTOC compression, and 5-phase context budgeting.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/token-efficiency/budget', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task: taskInput })
                  });
                  const data = await res.json();
                  alert(`⚡ Context Budget for "${taskInput.slice(0, 40)}...":\nTotal Target: ${data.total_budget_tokens?.toLocaleString()} tokens (8x savings)\nUnconstrained Baseline: ~280,000 tokens\n\nDiscovery: ${data.phase_budgets?.discovery?.tokens} tokens\nPlanning: ${data.phase_budgets?.planning?.tokens} tokens\nExecution: ${data.phase_budgets?.execution?.tokens} tokens\nVerification: ${data.phase_budgets?.verification?.tokens} tokens\nSummary: ${data.phase_budgets?.summary?.tokens} tokens`);
                } catch (e: any) {
                  alert('Failed to compute budget: ' + e.message);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Compute Task Budget</span>
            </button>
          </div>
        </div>

        {/* 5-Phase Context Budget Allocation */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase">1. DISCOVERY</div>
            <div className="text-base font-extrabold text-emerald-400 mt-0.5">~4,000</div>
            <div className="text-[11px] text-slate-500 mt-1">Structure map & keys</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase">2. PLANNING</div>
            <div className="text-base font-extrabold text-cyan-400 mt-0.5">~8,000</div>
            <div className="text-[11px] text-slate-500 mt-1">Target excerpts only</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase">3. EXECUTION</div>
            <div className="text-base font-extrabold text-amber-400 mt-0.5">~12,000</div>
            <div className="text-[11px] text-slate-500 mt-1">Active line ranges</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase">4. VERIFICATION</div>
            <div className="text-base font-extrabold text-purple-400 mt-0.5">~4,000</div>
            <div className="text-[11px] text-slate-500 mt-1">Test status & diffs</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 col-span-2 sm:col-span-1">
            <div className="text-[10px] font-semibold text-slate-400 uppercase">5. SUMMARY</div>
            <div className="text-base font-extrabold text-rose-400 mt-0.5">~2,000</div>
            <div className="text-[11px] text-slate-500 mt-1">Final result & cards</div>
          </div>
        </div>

        {/* Live Interactive DTOC Compression Simulator */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Live Dynamic Tool Output Compression (DTOC) Enforcement
            </span>
            <span className="text-[11px] text-slate-400">Limits: ls=20, logs=30, diff=100 lines</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <button
              onClick={async () => {
                const dummyLogs = Array.from({ length: 85 }, (_, i) => `[2026-10-07 12:00:${i < 10 ? '0' + i : i}] INFO worker #${i} processed chunk`).join('\n');
                const res = await fetch('/api/token-efficiency/compress', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ input: dummyLogs, type: 'logs' })
                });
                const data = await res.json();
                alert(`⚡ DTOC Compressed 85 Log Lines:\nCapped at: ${data.max_lines_limit} lines\nEstimated Tokens Saved: ~${data.tokens_saved} tokens\nWas Compressed: ${data.was_compressed}`);
              }}
              className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left text-slate-300 transition"
            >
              <strong className="block text-emerald-400 mb-0.5">Test Log Compression</strong>
              <span>Compress 85 lines of logs to tail-30 lines limit</span>
            </button>
            <button
              onClick={async () => {
                const res = await fetch('/api/token-efficiency/subagent', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ file: 'src/services/payment.ts', goal: 'Fix idempotency key timeout', lines: '45-90' })
                });
                const data = await res.json();
                alert(`🤖 6-Field Scoped Subagent Prompt:\n\n${data.scoped_prompt}`);
              }}
              className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left text-slate-300 transition"
            >
              <strong className="block text-cyan-400 mb-0.5">Generate Subagent Scope</strong>
              <span>Generate 6-field isolated task prompt for subagent</span>
            </button>
            <button
              onClick={async () => {
                const res = await fetch('/api/token-efficiency/audit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ file: 'src/components/CheckoutModal.tsx', lines: 340 })
                });
                const data = await res.json();
                alert(`🔎 AST-First Read Audit (340 lines):\nCompliant: ${data.ast_first_compliant ? 'YES' : 'NO (VIOLATION)'}\n${data.recommendation}`);
              }}
              className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left text-slate-300 transition"
            >
              <strong className="block text-amber-400 mb-0.5">Audit Read Compliance</strong>
              <span>Verify file reading compliance against &gt;100-line AST rule</span>
            </button>
          </div>
        </div>

        {/* 8 Behavioral Pillars of Token Efficiency */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-xs font-bold text-slate-200 mb-2">The 8 Pillars of Token Efficiency:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-slate-400">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <strong className="text-emerald-400 block">1. AST-First Access:</strong>
              Never cat/read &gt;100 lines. Grep first, sed target lines.
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <strong className="text-emerald-400 block">2. Search Hierarchy:</strong>
              Literal grep ➔ regex grep ➔ ast-grep ➔ targeted read.
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <strong className="text-emerald-400 block">3. DTOC Truncation:</strong>
              Hard caps on tool output: ls 20, logs 30, diff 100 lines.
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <strong className="text-emerald-400 block">4. Progressive Disclosure:</strong>
              Tier 1 Discover ➔ Tier 2 Target ➔ Tier 3 Execute.
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <strong className="text-emerald-400 block">5. Subagent Scoping:</strong>
              6-field scoped template. Never send full files.
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <strong className="text-emerald-400 block">6. Session File Cache:</strong>
              Zero repeat reads. Read only new line range deltas.
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <strong className="text-emerald-400 block">7. Context Compaction:</strong>
              Compact finished phases; recover context if &gt;80% used.
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <strong className="text-emerald-400 block">8. Memory Guard:</strong>
              V8 heap capped at 2048M, ZRAM zstd compression.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
