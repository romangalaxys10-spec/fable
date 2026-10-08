import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  Tag, 
  Clock, 
  Save, 
  X,
  FileCheck,
  RefreshCw
} from 'lucide-react';
import { LessonCard } from '../types';

export const CorpusManagerTab: React.FC = () => {
  const [cards, setCards] = useState<LessonCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [newTask, setNewTask] = useState('');
  const [newContext, setNewContext] = useState('');
  const [newOutcome, setNewOutcome] = useState('');
  const [newSteps, setNewSteps] = useState('');
  const [newGotchas, setNewGotchas] = useState('');
  const [newLearnings, setNewLearnings] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/corpus');
      const data = await res.json();
      setCards(data.cards || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchCards();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/corpus/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, top: 10 })
      });
      const data = await res.json();
      setCards(data.matches || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || !newOutcome.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/corpus/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: newTask,
          context: newContext,
          outcome: newOutcome,
          key_steps: newSteps.split('\n').filter(Boolean),
          gotchas: newGotchas.split('\n').filter(Boolean),
          learnings: newLearnings.split('\n').filter(Boolean)
        })
      });
      if (res.ok) {
        setModalOpen(false);
        setNewTask('');
        setNewContext('');
        setNewOutcome('');
        setNewSteps('');
        setNewGotchas('');
        setNewLearnings('');
        fetchCards();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            Local Lesson Corpus (`scripts/search.js` & `record.js`)
          </h2>
          <p className="text-xs text-slate-400">
            Persistent experience cards distilled from completed sessions. Consulted before external datasets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCards}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            title="Refresh corpus"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            Record Lesson Card
          </button>
        </div>
      </div>

      {/* Search Header */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search local lesson cards by task, gotcha, or learning..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/50"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition"
          >
            Search Corpus
          </button>
        </div>
      </div>

      {/* Cards Stream */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card, idx) => (
          <div key={idx} className="rounded-xl bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-sm text-white leading-snug">{card.task}</h3>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {new Date(card.ts).toLocaleDateString()}
                </span>
              </div>

              {card.context && (
                <div className="text-xs text-slate-400 bg-slate-950/70 p-2 rounded mb-3 border border-slate-850">
                  <span className="text-slate-500 font-semibold">Context: </span>
                  {card.context}
                </div>
              )}

              <div className="mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Outcome
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{card.outcome}</p>
              </div>

              {card.key_steps && card.key_steps.length > 0 && (
                <div className="mb-3">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">Key Steps:</span>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {card.key_steps.map((st, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {card.gotchas && card.gotchas.length > 0 && (
                <div className="mb-3 p-2.5 rounded bg-rose-500/10 border border-rose-500/20">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-300 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Gotchas & Traps
                  </div>
                  <ul className="space-y-1 text-xs text-rose-200">
                    {card.gotchas.map((g, i) => (
                      <li key={i}>• {g}</li>
                    ))}
                  </ul>
                </div>
              )}

              {card.learnings && card.learnings.length > 0 && (
                <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 mb-1">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Distilled Learnings
                  </div>
                  <ul className="space-y-1 text-xs text-amber-200">
                    {card.learnings.map((l, i) => (
                      <li key={i}>• {l}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {cards.length === 0 && !loading && (
        <div className="p-12 text-center rounded-xl bg-slate-900 border border-slate-800">
          <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No matching lesson cards in corpus.</p>
        </div>
      )}

      {/* Modal to record card */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 w-full max-w-xl p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                Record Lesson Card (`scripts/record.js`)
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCard} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Task Name *</label>
                <input
                  type="text"
                  required
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="e.g. Fix race condition in async streaming queue"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Context / Environment</label>
                <input
                  type="text"
                  value={newContext}
                  onChange={(e) => setNewContext(e.target.value)}
                  placeholder="e.g. Node.js Worker thread IPC pipeline"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Outcome *</label>
                <input
                  type="text"
                  required
                  value={newOutcome}
                  onChange={(e) => setNewOutcome(e.target.value)}
                  placeholder="e.g. Resolved thread deadlock and 12% memory leak"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Key Steps (one per line)</label>
                <textarea
                  rows={2}
                  value={newSteps}
                  onChange={(e) => setNewSteps(e.target.value)}
                  placeholder="1) Isolated event loop drain&#10;2) Added ring buffer with atomic cursor"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400/50 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Gotchas (one per line)</label>
                  <textarea
                    rows={2}
                    value={newGotchas}
                    onChange={(e) => setNewGotchas(e.target.value)}
                    placeholder="Unhandled drain event missing"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400/50 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Learnings (one per line)</label>
                  <textarea
                    rows={2}
                    value={newLearnings}
                    onChange={(e) => setNewLearnings(e.target.value)}
                    placeholder="Always maintain monotonic high-water mark"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400/50 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Recording...' : 'Save to Corpus'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
