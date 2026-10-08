import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Zap, 
  Layers, 
  PieChart, 
  Clock, 
  CheckCircle2, 
  ExternalLink,
  Info,
  TrendingDown,
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';

export const BenchmarksAnalyticsTab: React.FC = () => {
  const [selectedGraphic, setSelectedGraphic] = useState<'ultra' | 'token' | 'corpus' | 'donut' | 'arch'>('ultra');

  const studyHighlights = [
    { metric: 'Headline Win (T4)', value: '2× Faster', detail: 'Complex file reorganization: 32s vs 65s (-51% wall clock)' },
    { metric: 'Context Compression', value: '42–44%', detail: 'Headroom compressor reduces retrieved transcript context' },
    { metric: 'Corpus Growth', value: '0 → 23 Lessons', detail: 'Cross-category knowledge transfers measured across tasks' },
    { metric: 'Routing Accuracy', value: '100%', detail: 'Zero false routing: speed tasks to ULTRA, boss fights to SMART' },
  ];

  const tasksMatrix = [
    { id: 'T4', name: 'Complex File Reorganizer', domain: 'Multi-directory refactor & imports', base: '65s', fable: '32s', delta: '-51%', mode: 'ULTRA', win: true, note: 'Answer-first protocol, zero ceremony, single-pass batch rewrite' },
    { id: 'D4', name: 'Async Architecture Refactor', domain: 'Stream pipeline & backpressure', base: '142s', fable: '78s', delta: '-45%', mode: 'BOOST', win: true, note: 'Reused D1 architectural lesson card; avoided unbuffered drain trap' },
    { id: 'L4', name: 'Concurrent Worker Deadlock', domain: 'Multi-thread IPC race condition', base: '195s', fable: '84s', delta: '-57%', mode: 'SMART', win: true, note: 'GVS5H loop wrote adversarial stress tests; fencing token resolved deadlock' },
    { id: 'X3', name: 'IPC Buffer Stream Batching', domain: 'High-throughput batch streaming', base: '92s', fable: '54s', delta: '-41%', mode: 'BOOST', win: true, note: 'Cross-transferred T3 + X1 lessons; bounded ring buffer applied' },
    { id: 'S1', name: 'Quick Regex & Syntax Fix', domain: 'Single-line regex pattern edit', base: '15s', fable: '18s', delta: '+20%', mode: 'ULTRA', win: false, note: 'Speed-of-thought task; pack preparation matches fix latency (~3s overhead)' },
    { id: 'S3', name: 'Instant Code Lookup / Trivia', domain: 'Pure conversational lookup', base: '30s', fable: '50s', delta: '+67%', mode: 'ULTRA', win: false, note: 'Honest Disclosure: Reading research packs adds latency on trivial lookup queries' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            Empirical Benchmarks (46-Run Study) &amp; Visual Analytics
          </h2>
          <p className="text-xs text-slate-400">
            Real measurements from the 46-run self-benchmark study (`benchmark_per_task.csv`). Honest disclosure of speedups and overheads.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {studyHighlights.map((s, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {s.metric}
            </span>
            <div className="text-2xl font-black text-amber-400 mt-1">{s.value}</div>
            <p className="text-xs text-slate-400 mt-1">{s.detail}</p>
          </div>
        ))}
      </div>

      {/* SVG Graphics Switcher */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedGraphic('ultra')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedGraphic === 'ultra' ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
              }`}
            >
              ⚡ ULTRA Speed Chart
            </button>
            <button
              onClick={() => setSelectedGraphic('token')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedGraphic === 'token' ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
              }`}
            >
              📊 Token Economy
            </button>
            <button
              onClick={() => setSelectedGraphic('corpus')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedGraphic === 'corpus' ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
              }`}
            >
              📈 Corpus Growth Loop
            </button>
            <button
              onClick={() => setSelectedGraphic('donut')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedGraphic === 'donut' ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
              }`}
            >
              🍩 Routing Decisions
            </button>
            <button
              onClick={() => setSelectedGraphic('arch')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedGraphic === 'arch' ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
              }`}
            >
              🏛️ Architecture Flow
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            Embedded Vector SVGs (docs/benchmarks/)
          </span>
        </div>

        {/* Display Container */}
        <div className="flex items-center justify-center p-4 rounded-xl bg-slate-950 border border-slate-850 overflow-hidden">
          {selectedGraphic === 'ultra' && (
            <img
              src="/docs/benchmarks/ultra-speed-chart.svg"
              alt="ULTRA Speed Benchmark Chart"
              className="w-full max-w-4xl h-auto rounded-lg shadow-xl"
            />
          )}

          {selectedGraphic === 'token' && (
            <img
              src="/docs/benchmarks/token-economy.svg"
              alt="Token Economy Chart"
              className="w-full max-w-4xl h-auto rounded-lg shadow-xl"
            />
          )}

          {selectedGraphic === 'corpus' && (
            <img
              src="/docs/benchmarks/corpus-growth.svg"
              alt="Corpus Growth Loop Chart"
              className="w-full max-w-4xl h-auto rounded-lg shadow-xl"
            />
          )}

          {selectedGraphic === 'donut' && (
            <img
              src="/docs/benchmarks/mode-donut.svg"
              alt="Routing Mode Donut Chart"
              className="w-full max-w-lg h-auto rounded-lg shadow-xl"
            />
          )}

          {selectedGraphic === 'arch' && (
            <img
              src="/docs/benchmarks/fable-architecture.svg"
              alt="Fable Architectural Diagram"
              className="w-full max-w-4xl h-auto rounded-lg shadow-xl"
            />
          )}
        </div>

        {/* Narrative & Honesty Disclosure */}
        <div className="p-4 rounded-lg bg-slate-950 border border-slate-850 text-xs text-slate-300 leading-relaxed">
          <strong>Key Research Takeaway:</strong> The single biggest win in the study was T4 (file reorganizer) completing in half the time (32s vs 65s). For tiny "speed-of-thought" lookup queries (S1/S3), reading an external pack added marginal latency — which is why Fable routes speed queries to <code>ULTRA</code> or <code>--local-only</code> to skip network overhead completely.
        </div>
      </div>

      {/* Task Performance Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            Empirical Task Performance Matrix (`benchmark_per_task.csv`)
          </h3>
          <span className="text-[11px] font-mono text-slate-500">46 Isolated Runs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Task ID</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Domain</th>
                <th className="py-2.5 px-3 text-right">Baseline</th>
                <th className="py-2.5 px-3 text-right">Fable</th>
                <th className="py-2.5 px-3 text-center">Delta</th>
                <th className="py-2.5 px-3 text-center">Mode</th>
                <th className="py-2.5 px-3">Verified Invariants</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {tasksMatrix.map((t) => (
                <tr key={t.id} className="hover:bg-slate-950/50 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-white">{t.id}</td>
                  <td className="py-2.5 px-3 font-semibold text-white">{t.name}</td>
                  <td className="py-2.5 px-3 text-slate-400">{t.domain}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-400">{t.base}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">{t.fable}</td>
                  <td className="py-2.5 px-3 text-center font-bold">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      t.win ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                    }`}>
                      {t.delta}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      t.mode === 'ULTRA' ? 'bg-cyan-500/10 text-cyan-300' :
                      t.mode === 'SMART' ? 'bg-rose-500/10 text-rose-300' : 'bg-amber-500/10 text-amber-300'
                    }`}>
                      {t.mode}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-300">{t.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
