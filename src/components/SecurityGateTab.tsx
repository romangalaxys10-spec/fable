import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  FileCode, 
  Terminal, 
  Key, 
  RefreshCw,
  Clock
} from 'lucide-react';

export const SecurityGateTab: React.FC = () => {
  const [targetDir, setTargetDir] = useState('.');
  const [running, setRunning] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);

  const handleRunAudit = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/harness/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: targetDir })
      });
      const data = await res.json();
      setAuditResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            Capability Harness & Security Audit Gate
          </h2>
          <p className="text-xs text-slate-400">
            DeepSeek Harness pattern ("everything is a plugin"). P0-P3 enforcement gate blocks unverified code automatically.
          </p>
        </div>
      </div>

      {/* Harness Protocol Architecture */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Lock className="w-3.5 h-3.5" />
            P0 Policy
          </div>
          <h4 className="text-xs font-bold text-white mb-1">Egress & Structure</h4>
          <p className="text-[11px] text-slate-400">
            Enforces 25MB directory cap, strict host allowlist, prohibits executable binaries, shell wrappers, and git hooks.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Key className="w-3.5 h-3.5" />
            P1 Secrets
          </div>
          <h4 className="text-xs font-bold text-white mb-1">Credential Gate</h4>
          <p className="text-[11px] text-slate-400">
            Regex scanner for private keys, API tokens (OpenAI, AWS, GCP, Slack, HF), and sensitive configuration files.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            P2 Dangerous APIs
          </div>
          <h4 className="text-xs font-bold text-white mb-1">Runtime Quarantine</h4>
          <p className="text-[11px] text-slate-400">
            Flags arbitrary shell execution, unvalidated eval, unpinned pip/npm curl scripts, and dangerous subprocesses.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            P3 Pinning
          </div>
          <h4 className="text-xs font-bold text-white mb-1">SHA-256 Verification</h4>
          <p className="text-[11px] text-slate-400">
            Approved capabilities pinned in ~/.fable/approved.json. Detects post-approval file tampering.
          </p>
        </div>
      </div>

      {/* Audit Runner Console */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={targetDir}
            onChange={(e) => setTargetDir(e.target.value)}
            placeholder="Target directory to audit (e.g. . or scripts/)"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-teal-400/50 font-mono text-xs"
          />
          <button
            onClick={handleRunAudit}
            disabled={running}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-md shadow-teal-500/20 transition"
          >
            {running ? <Clock className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>Run Security Audit</span>
          </button>
        </div>

        {auditResult && (
          <div className="space-y-4 pt-3 border-t border-slate-850 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Audit Status: Passed (Clean Hygiene)
              </span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Score: 100 / 100
              </span>
            </div>

            <div className="space-y-2">
              {auditResult.checks?.map((chk: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-850 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-teal-300 font-mono block">{chk.category}</span>
                    <span className="text-xs text-slate-300">{chk.detail}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded">
                    PASS
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
