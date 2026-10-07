import React from 'react';
import { 
  Zap, 
  ArrowRight, 
  Cpu, 
  Database, 
  BookOpen, 
  Flame, 
  Video, 
  ShieldCheck, 
  Gauge, 
  Sparkles,
  FileCode,
  Terminal,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { SystemStatus } from '../types';

interface OverviewTabProps {
  status: SystemStatus | null;
  onNavigate: (tabId: string) => void;
  onQuickRun: (task: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ status, onNavigate, onQuickRun }) => {
  const samplePrompts = [
    { label: 'Boss Fight Task', text: 'Resolve multi-threaded race condition in async streaming queue', mode: 'SMART' },
    { label: 'Speed-of-Thought', text: 'Quick fix typo in regex pattern for ISO date formatting', mode: 'ULTRA' },
    { label: 'External Knowledge', text: 'Implement Webhook retry with exponential backoff & jitter', mode: 'BOOST' },
    { label: 'Cinematic Story', text: 'Generate storyboard and video animation for developer onboarding', mode: 'VIDEO' }
  ];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 p-6 sm:p-8">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Empirical Self-Improvement Layer for AI Coding Agents
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Stop fine-tuning models on trivia. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
              Give your agent judgement & war room memory.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6">
            Fable connects 5+ Hugging Face agent trace datasets, accelerates them with local relevance triage
            and context compression, routes hard tasks to an adversarial multi-agent ledger, and distills every win into an instant local corpus.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('routing')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-bold shadow-lg shadow-amber-400/20 transition"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              Launch Task Router
            </button>
            <button
              onClick={() => onNavigate('benchmarks')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold border border-slate-700 transition"
            >
              <Gauge className="w-4 h-4 text-amber-400" />
              View 46-Run Study Benchmarks
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Quick Launchers */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            Quick Test Prompts
          </span>
          <span className="text-xs text-slate-500">Click to route and test pipeline</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onQuickRun(p.text)}
              className="text-left p-3 rounded-lg bg-slate-950 border border-slate-800/80 hover:border-amber-400/50 hover:bg-slate-900/80 transition group"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-amber-400">{p.label}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  p.mode === 'SMART' ? 'bg-rose-500/20 text-rose-300' :
                  p.mode === 'ULTRA' ? 'bg-cyan-500/20 text-cyan-300' :
                  p.mode === 'VIDEO' ? 'bg-purple-500/20 text-purple-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {p.mode}
                </span>
              </div>
              <p className="text-xs text-slate-300 line-clamp-2 group-hover:text-white transition">
                {p.text}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Visual Pipeline Flow */}
      <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            Architectural Pipeline Flow
          </h2>
          <p className="text-xs text-slate-400">How tasks traverse Fable's knowledge and accelerator chain</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">Phase 1</div>
              <h3 className="font-bold text-sm text-white mb-1">Local Corpus Check</h3>
              <p className="text-xs text-slate-400">Consult project's own verified lesson cards first (~0.04s, zero network).</p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-850 flex items-center justify-between text-xs text-emerald-400">
              <span>scripts/search.js</span>
              <BookOpen className="w-4 h-4" />
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-1">Phase 2</div>
              <h3 className="font-bold text-sm text-white mb-1">Multi-Dataset Retrieve</h3>
              <p className="text-xs text-slate-400">5+ Hugging Face fable datasets queried in parallel with IDF ranking.</p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-850 flex items-center justify-between text-xs text-cyan-400">
              <span>scripts/retrieve.js</span>
              <Database className="w-4 h-4" />
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1">Phase 3</div>
              <h3 className="font-bold text-sm text-white mb-1">Dual Acceleration</h3>
              <p className="text-xs text-slate-400">Laya binary triage + Headroom compression (~44% token reduction).</p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-850 flex items-center justify-between text-xs text-purple-400">
              <span>boost.py</span>
              <Cpu className="w-4 h-4" />
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1">Phase 4</div>
              <h3 className="font-bold text-sm text-white mb-1">Smart War Room</h3>
              <p className="text-xs text-slate-400">For hard tasks: GVS5H loop, 3 distinct ideations & adversarial test-specs.</p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-850 flex items-center justify-between text-xs text-rose-400">
              <span>smart_scaffold.py</span>
              <Flame className="w-4 h-4" />
            </div>
          </div>

          {/* Step 5 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">Phase 5</div>
              <h3 className="font-bold text-sm text-white mb-1">Distill & Compounding</h3>
              <p className="text-xs text-slate-400">Completed task distilled into lesson card, closing the self-improving loop.</p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-850 flex items-center justify-between text-xs text-emerald-400">
              <span>record.js</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* 10 Core Engines Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">10 Integrated Production Modules</h2>
            <p className="text-xs text-slate-400">Zero third-party checkout hunting — all engines vendored or native</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-white flex items-center gap-2 text-sm">
                <Database className="w-4 h-4 text-cyan-400" />
                1. Multi-Dataset Retrieval
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">
                5+ HF Datasets
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Queries Claude-Code traces, Fable-5 Premium, 2M trace rows, and reasoning datasets via the public Hugging Face API with bigram/IDF normalization.
            </p>
            <div className="text-[11px] font-mono text-slate-500 bg-slate-950 p-2 rounded">
              node scripts/retrieve.js "task" --top 5
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-white flex items-center gap-2 text-sm">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                2. Local Lesson Corpus
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                Deduped Cards
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Maintains distilled cards with task context, outcomes, steps, gotchas, and learnings at ~/.fable/corpus.jsonl for zero-latency retrieval.
            </p>
            <div className="text-[11px] font-mono text-slate-500 bg-slate-950 p-2 rounded">
              node scripts/search.js "task"
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-white flex items-center gap-2 text-sm">
                <Cpu className="w-4 h-4 text-amber-400" />
                3. Dual Accelerator Boost
              </span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                10-40ms Triage
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              On-device Laya MLX decision engine filters noise; Headroom neural & light-dedupe compress transcripts before context loading.
            </p>
            <div className="text-[11px] font-mono text-slate-500 bg-slate-950 p-2 rounded">
              python3 scripts/boost/boost.py --task "..."
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-white flex items-center gap-2 text-sm">
                <Flame className="w-4 h-4 text-rose-400" />
                4. Smart War Room Bridge
              </span>
              <span className="text-[10px] font-mono text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded">
                GVS5H Ledger
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Scaffolds war room briefs for boss fights: mission brief (task.md), intel (notes.md), 3+ distinct approach ideations, and adversarial verification.
            </p>
            <div className="text-[11px] font-mono text-slate-500 bg-slate-950 p-2 rounded">
              python3 scripts/boost/smart_scaffold.py
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-white flex items-center gap-2 text-sm">
                <Video className="w-4 h-4 text-purple-400" />
                5. Video & Motion Studio
              </span>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded">
                ViMax + Remotion
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Translates ideas/scripts into storyboards, keyframes, and clips via ViMax; renders programmatic React motion graphics with Remotion.
            </p>
            <div className="text-[11px] font-mono text-slate-500 bg-slate-950 p-2 rounded">
              skills/video/SKILL.md
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-white flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                6. Capability & Security Gate
              </span>
              <span className="text-[10px] font-mono text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded">
                P0-P3 Policy
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Everything is a plugin: safe capability finding, stub generation, P0 host allowlist, P1 secrets scan, and SHA256 integrity verification.
            </p>
            <div className="text-[11px] font-mono text-slate-500 bg-slate-950 p-2 rounded">
              python3 scripts/harness/audit.py
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
