import React, { useState } from 'react';
import { 
  Flame, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  Terminal, 
  FileText, 
  GitCommit, 
  Layers, 
  Zap, 
  AlertOctagon,
  Copy,
  Check
} from 'lucide-react';
import { WarRoom } from '../types';

export const SmartWarRoomTab: React.FC = () => {
  const [taskName, setTaskName] = useState('Refactor distributed locks to avoid split-brain during network partition');
  const [criteria, setCriteria] = useState([
    'Reproduce split-brain failure under simulated 200ms latency partition',
    'Introduce fencing token verification on lease renewals',
    'Verify zero stale-lock writes across 10,000 randomized lease checks'
  ]);
  const [newCrit, setNewCrit] = useState('');
  const [loading, setLoading] = useState(false);
  const [warRoom, setWarRoom] = useState<WarRoom | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'brief' | 'intel' | 'ledger'>('brief');
  const [copied, setCopied] = useState(false);

  const handleScaffold = async () => {
    if (!taskName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/smart/scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskName, criteria })
      });
      const data = await res.json();
      setWarRoom(data.war_room);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addCriterion = () => {
    if (!newCrit.trim()) return;
    setCriteria([...criteria, newCrit.trim()]);
    setNewCrit('');
  };

  const removeCriterion = (idx: number) => {
    setCriteria(criteria.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-500" />
            Smart-Mode Bridge & War Room (`scripts/boost/smart_scaffold.py`)
          </h2>
          <p className="text-xs text-slate-400">
            For tasks that aren't simple chores — but boss fights: concurrency bugs, multi-file refactors, and stubborn failures.
          </p>
        </div>
      </div>

      {/* Scaffold Builder */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">
            Boss Fight Mission Target:
          </label>
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="Describe the hard task or architectural problem..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">
            Acceptance Criteria (Hard Verification Gates):
          </label>
          <div className="space-y-2 mb-2">
            {criteria.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-850 text-xs text-slate-300">
                <span>{i + 1}. [ ] {c}</span>
                <button
                  onClick={() => removeCriterion(i)}
                  className="text-slate-500 hover:text-rose-400 text-xs px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newCrit}
              onChange={(e) => setNewCrit(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCriterion()}
              placeholder="Add another verification criterion..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500/50"
            />
            <button
              onClick={addCriterion}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
            >
              Add Criterion
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-850">
          <button
            onClick={handleScaffold}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition"
          >
            {loading ? <Clock className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
            <span>Assemble War Room (.smart/)</span>
          </button>
        </div>
      </div>

      {/* War Room Artifact Visualizer */}
      {warRoom && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
            <div>
              <span className="text-[10px] font-mono text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded border border-rose-400/20">
                ACTIVE LEDGER: {warRoom.path}
              </span>
              <h3 className="text-base font-bold text-white mt-1">GVS5H Multi-Agent Ledger Loop</h3>
            </div>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveSubTab('brief')}
                className={`px-3 py-1 rounded-md font-semibold transition ${activeSubTab === 'brief' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
              >
                task.md
              </button>
              <button
                onClick={() => setActiveSubTab('intel')}
                className={`px-3 py-1 rounded-md font-semibold transition ${activeSubTab === 'intel' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
              >
                notes.md
              </button>
              <button
                onClick={() => setActiveSubTab('ledger')}
                className={`px-3 py-1 rounded-md font-semibold transition ${activeSubTab === 'ledger' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
              >
                GVS5H Stages
              </button>
            </div>
          </div>

          {activeSubTab === 'brief' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                {warRoom.task_md}
              </div>
            </div>
          )}

          {activeSubTab === 'intel' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 font-mono text-xs text-amber-200 whitespace-pre-wrap leading-relaxed">
                {warRoom.notes_md}
              </div>
            </div>
          )}

          {activeSubTab === 'ledger' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {warRoom.gvs5h_stages.map((st) => (
                  <div key={st.id} className="p-4 rounded-xl bg-slate-950 border border-slate-850 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center">
                          {st.id}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-emerald-400">
                          {st.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-white mb-1">{st.name}</h4>
                      <p className="text-[11px] text-slate-400 leading-snug">{st.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-850 flex items-center gap-3 text-xs text-slate-400">
                <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Adversarial Rule:</strong> No worker is permitted to claim "done". Completion is only declared when deterministic verification tests pass cleanly.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
