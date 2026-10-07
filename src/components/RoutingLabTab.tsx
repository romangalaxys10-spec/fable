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
    </div>
  );
};
