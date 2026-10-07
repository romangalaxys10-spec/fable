import React, { useState } from 'react';
import { 
  Cpu, 
  Play, 
  Clock, 
  Layers, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Sliders, 
  DollarSign, 
  FileCheck2,
  TrendingDown,
  Sparkles
} from 'lucide-react';
import { BoostResult } from '../types';

export const BoostCompressionTab: React.FC = () => {
  const [taskPrompt, setTaskPrompt] = useState('Build resilient web scraper with rate-limiting, proxies, and retry logic');
  const [tokenSlider, setTokenSlider] = useState(15000);
  const [loading, setLoading] = useState(false);
  const [boostResult, setBoostResult] = useState<BoostResult | null>(null);

  const handleRunBoost = async () => {
    if (!taskPrompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/boost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskPrompt, simulateTokens: tokenSlider })
      });
      const data = await res.json();
      setBoostResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            Dual-Accelerator Boost Lab (`scripts/boost/boost.py`)
          </h2>
          <p className="text-xs text-slate-400">
            One idempotent command combines on-device relevance triage (Laya) and transcript compression (Headroom).
          </p>
        </div>
      </div>

      {/* Simulator Control */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={taskPrompt}
            onChange={(e) => setTaskPrompt(e.target.value)}
            placeholder="Enter task to execute through the boost pipeline..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
          />
          <button
            onClick={handleRunBoost}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 text-sm font-bold shadow-md shadow-amber-400/20 transition"
          >
            {loading ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-slate-950" />}
            <span>Run Boost Pipeline</span>
          </button>
        </div>

        {/* Token Slider */}
        <div className="pt-2 border-t border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Simulate Retrieved Transcripts Volume:</span>
            <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {tokenSlider.toLocaleString()} tokens
            </span>
          </div>
          <input
            type="range"
            min={4000}
            max={35000}
            step={1000}
            value={tokenSlider}
            onChange={(e) => setTokenSlider(Number(e.target.value))}
            className="w-full sm:w-64 accent-amber-400 cursor-pointer"
          />
        </div>
      </div>

      {/* Boost Pipeline Stage Card */}
      {boostResult && (
        <div className="space-y-6 animate-fadeIn">
          {/* Token Economy Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Initial Retrieved Volume
              </span>
              <div className="text-2xl font-extrabold text-white mt-1">
                {boostResult.token_economy.initial_tokens.toLocaleString()}
                <span className="text-xs font-normal text-slate-400 ml-1">tokens</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-2">Raw Hugging Face traces</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                Compressed Ingest
              </span>
              <div className="text-2xl font-extrabold text-purple-300 mt-1">
                {boostResult.token_economy.compressed_tokens.toLocaleString()}
                <span className="text-xs font-normal text-slate-400 ml-1">tokens</span>
              </div>
              <span className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1 font-semibold">
                <TrendingDown className="w-3.5 h-3.5" />
                {boostResult.token_economy.compression_ratio} Reduction
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Tokens Saved per Call
              </span>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                +{boostResult.token_economy.tokens_saved.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400 mt-2">Headroom structural + ML</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                Est. Speedup & Cost
              </span>
              <div className="text-2xl font-extrabold text-cyan-300 mt-1">
                {boostResult.token_economy.estimated_speedup}
              </div>
              <span className="text-[11px] text-slate-400 mt-2">
                {boostResult.token_economy.token_cost_reduction}
              </span>
            </div>
          </div>

          {/* Detailed Pipeline Stages */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Stage Execution Audit
            </h3>

            <div className="space-y-3">
              {boostResult.pipeline.map((st, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-slate-950 border border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">{st.stage}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {st.model && `Engine: ${st.model}`}
                        {st.engine && `Engine: ${st.engine}`}
                        {st.candidates && `Scanned ${st.candidates} external traces`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono text-slate-400 sm:text-right">
                    {st.approved !== undefined && (
                      <span className="text-emerald-400 font-semibold">
                        {st.approved} Approved / {st.rejected} Triage Discarded
                      </span>
                    )}
                    <span className="bg-slate-900 px-2.5 py-1 rounded border border-slate-800 text-amber-300">
                      {st.duration_ms} ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
