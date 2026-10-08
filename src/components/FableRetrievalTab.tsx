import React, { useState } from 'react';
import { 
  Database, 
  Search, 
  Sparkles, 
  ExternalLink, 
  Clock, 
  CheckCircle, 
  FileText, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { RetrievalResult, FableTrace } from '../types';

export const FableRetrievalTab: React.FC = () => {
  const [taskQuery, setTaskQuery] = useState('Implement streaming retry handler with exponential backoff');
  const [topK, setTopK] = useState(5);
  const [perDataset, setPerDataset] = useState(2);
  const [selectedDataset, setSelectedDataset] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RetrievalResult | null>(null);
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);

  const datasets = [
    { id: 'armand0e/claude-fable-5-claude-code', name: 'Claude Code Sessions', rows: 63, badge: 'Raw Traces', hfUrl: 'https://huggingface.co/datasets/armand0e/claude-fable-5-claude-code' },
    { id: 'saidutta69/fable-5-premium', name: 'Fable-5 Premium SFT', rows: '11,000', badge: 'Filtered SFT', hfUrl: 'https://huggingface.co/datasets/saidutta69/fable-5-premium' },
    { id: 'Crownelius/Complete-FABLE.5-traces-2M', name: 'Complete FABLE.5 (2M)', rows: '22,400', badge: 'Deduped Traces', hfUrl: 'https://huggingface.co/datasets/Crownelius/Complete-FABLE.5-traces-2M' },
    { id: 'MoreThought/Fable-5.1-Max-Reasoning-Filtered-5000x', name: 'Max Reasoning 5000x', rows: '5,000', badge: 'Reasoning Filtered', hfUrl: 'https://huggingface.co/datasets/MoreThought/Fable-5.1-Max-Reasoning-Filtered-5000x' },
    { id: 'kelexine/fable-5-sft-traces', name: 'Fable-5 SFT Traces', rows: '1,200', badge: 'Task Types + Thinking', hfUrl: 'https://huggingface.co/datasets/kelexine/fable-5-sft-traces' },
  ];

  const handleRetrieve = async () => {
    if (!taskQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: taskQuery,
          top: topK,
          perDataset: perDataset,
          dataset: selectedDataset === 'all' ? undefined : selectedDataset
        })
      });
      const data = await res.json();
      setResults(data);
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
            <Database className="w-5 h-5 text-cyan-400" />
            Multi-Dataset Fable Explorer (`scripts/retrieve.js`)
          </h2>
          <p className="text-xs text-slate-400">
            Queries all 5 curated fable datasets simultaneously via the public Hugging Face API with bigram/IDF scoring.
          </p>
        </div>
      </div>

      {/* Dataset Registry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {datasets.map((d) => (
          <div key={d.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
                  {d.badge}
                </span>
                <a href={d.hfUrl} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-cyan-400 transition">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <h4 className="text-xs font-bold text-white truncate" title={d.name}>{d.name}</h4>
              <p className="text-[11px] text-slate-400">{d.rows} traces</p>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-850 text-[10px] text-slate-500 font-mono truncate">
              {d.id.split('/')[1]}
            </div>
          </div>
        ))}
      </div>

      {/* Query Bar & Filters */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={taskQuery}
              onChange={(e) => setTaskQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRetrieve()}
              placeholder="Search traces for a coding challenge, bug, or architecture problem..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          </div>
          <button
            onClick={handleRetrieve}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-sm font-bold shadow-md shadow-cyan-500/20 transition"
          >
            {loading ? <Clock className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 fill-slate-950" />}
            <span>Retrieve Traces</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Target Dataset:</span>
            <select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              <option value="all">All 5 Datasets (Round Robin)</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span>Top K:</span>
            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none"
            >
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span>Per Dataset Cap:</span>
            <select
              value={perDataset}
              onChange={(e) => setPerDataset(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results List */}
      {results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Retrieved <strong className="text-white">{results.results?.length || 0}</strong> traces across {results.datasets_queried} datasets in {results.latency_ms}ms
            </span>
            <span className="text-[11px] font-mono text-cyan-400">IDF normalized scoring</span>
          </div>

          <div className="space-y-3">
            {results.results?.map((trace: FableTrace, idx: number) => {
              const isExpanded = expandedTrace === trace.id;
              return (
                <div key={idx} className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden hover:border-slate-700 transition">
                  <div className="p-4 cursor-pointer" onClick={() => setExpandedTrace(isExpanded ? null : trace.id)}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-400/10 text-cyan-300 border border-cyan-400/30">
                          Match Score: {Math.round(trace.score * 100)}%
                        </span>
                        <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded">
                          {trace.dataset.split('/')[1]}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {trace.task_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{trace.tokens} tokens</span>
                        <span className="font-bold text-emerald-400">{trace.quality_rating}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    <h4 className="text-sm font-semibold text-white mb-1.5">{trace.prompt}</h4>
                    <p className="text-xs text-slate-300 line-clamp-2">{trace.solution_summary}</p>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-850 bg-slate-950/60 space-y-3 text-xs animate-fadeIn">
                      <div>
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                          Full Solution Strategy & Actions Taken:
                        </span>
                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-850 text-slate-200 font-mono text-xs leading-relaxed">
                          {trace.solution_summary}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Identifier: <code className="text-cyan-300">{trace.id}</code></span>
                        <span>Source: <code className="text-slate-300">{trace.dataset}</code></span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
