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
  Info
} from 'lucide-react';

export const BenchmarksAnalyticsTab: React.FC = () => {
  const [selectedGraphic, setSelectedGraphic] = useState<'ultra' | 'token' | 'corpus' | 'donut' | 'arch'>('ultra');

  const studyHighlights = [
    { metric: 'Headline Win', value: '2x Faster', detail: 'T4 File Reorganizer completed in 32s vs 65s (-51% wall clock)' },
    { metric: 'Context Compression', value: '42-44%', detail: 'Headroom compressor reduces retrieved transcript context' },
    { metric: 'Corpus Growth', value: '0 → 23 Lessons', detail: 'Cross-category knowledge transfer measured in 46-run study' },
    { metric: 'Routing Accuracy', value: '100%', detail: 'Zero false routing: speed tasks to ULTRA, boss fights to SMART' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            Empirical Benchmarks & Vector Illustrations
          </h2>
          <p className="text-xs text-slate-400">
            Real measurements from the 46-run self-benchmark study. Honest disclosure of speedups and overheads.
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
            Embedded SVG Vector Graphics
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
    </div>
  );
};
