import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Layers, 
  Sparkles, 
  Copy, 
  Check, 
  Code2, 
  Terminal, 
  Search, 
  AlertTriangle, 
  Clock, 
  Play, 
  Flame, 
  Bug, 
  BookOpen,
  Activity,
  GitBranch,
  Stethoscope,
  HeartPulse,
  Wrench,
  Cpu,
  Share2,
  Lock,
  ArrowRight,
  RefreshCw,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { 
  QASkillItem, 
  QAArchitectPlan,
  DoctorReport,
  RiskAnalysisResult,
  ImpactAnalysisResult,
  ClusteredTriageReport,
  HealProposal
} from '../types';

export const QAArchitectTab: React.FC = () => {
  const [activeSubView, setActiveSubView] = useState<'workbench' | 'planner' | 'catalog' | 'golden_rules'>('workbench');
  
  // Planner State
  const [taskPrompt, setTaskPrompt] = useState('Build Playwright E2E and API contract suite for multi-step checkout workflow');
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plan, setPlan] = useState<QAArchitectPlan | null>(null);

  // Live Workbench States
  const [doctorData, setDoctorData] = useState<DoctorReport | null>(null);
  const [doctorLoading, setDoctorLoading] = useState(false);

  const [riskPrompt, setRiskPrompt] = useState('Refactor checkout payment processing logic and Stripe webhook integration');
  const [riskData, setRiskData] = useState<RiskAnalysisResult | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);

  const [impactData, setImpactData] = useState<ImpactAnalysisResult | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  const [triageData, setTriageData] = useState<ClusteredTriageReport | null>(null);
  const [triageLoading, setTriageLoading] = useState(false);

  const [healData, setHealData] = useState<HealProposal | null>(null);
  const [healLoading, setHealLoading] = useState(false);

  // Catalog State
  const [skills, setSkills] = useState<QASkillItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchSkill, setSearchSkill] = useState('');
  const [inspectedSkill, setInspectedSkill] = useState<QASkillItem | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);

  // Load initial data
  useEffect(() => {
    fetch('/api/qa/skills')
      .then((res) => res.json())
      .then((data) => setSkills(data.skills || []))
      .catch((err) => console.error('Failed to load QA skills:', err));

    handleRunDoctor();
    handleRunRisk();
    handleRunImpact();
    handleRunTriage();
    handleRunHeal();
  }, []);

  const handleRunDoctor = async () => {
    setDoctorLoading(true);
    try {
      const res = await fetch('/api/qa/doctor');
      const data = await res.json();
      setDoctorData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setDoctorLoading(false);
    }
  };

  const handleRunRisk = async () => {
    setRiskLoading(true);
    try {
      const res = await fetch('/api/qa/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: riskPrompt }),
      });
      const data = await res.json();
      setRiskData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setRiskLoading(false);
    }
  };

  const handleRunImpact = async () => {
    setImpactLoading(true);
    try {
      const res = await fetch('/api/qa/impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: ['src/services/payment.ts', 'src/components/CheckoutModal.tsx', 'src/server.ts']
        })
      });
      const data = await res.json();
      setImpactData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setImpactLoading(false);
    }
  };

  const handleRunTriage = async () => {
    setTriageLoading(true);
    try {
      const res = await fetch('/api/qa/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      setTriageData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setTriageLoading(false);
    }
  };

  const handleRunHeal = async () => {
    setHealLoading(true);
    try {
      const res = await fetch('/api/qa/heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      setHealData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setHealLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!taskPrompt.trim()) return;
    setPlannerLoading(true);
    try {
      const res = await fetch('/api/qa/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskPrompt }),
      });
      const data = await res.json();
      setPlan(data);
    } catch (err) {
      console.error(err);
    } finally {
      setPlannerLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const categories = ['all', ...Array.from(new Set(skills.map((s) => s.category)))];

  const filteredSkills = skills.filter((s) => {
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;
    const matchesQuery = !searchSkill.trim() || 
      s.title.toLowerCase().includes(searchSkill.toLowerCase()) || 
      s.id.toLowerCase().includes(searchSkill.toLowerCase()) || 
      s.snippet.toLowerCase().includes(searchSkill.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 sm:p-7">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              qaforge v2.0 AI-Native QA Operating System
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Deterministic First, AI Second
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              15 Golden Rules Enforced
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            QA-Architect & qaforge OS
          </h2>
          <p className="mt-2 text-slate-300 text-sm sm:text-base leading-relaxed">
            Turn your coding agent into an elite QA organization. Features quantitative 8-factor risk analysis, 
            AST change impact test selection, 12-category failure clustering, confidence-tiered self-healing, and flagship AI/agent evaluation.
          </p>

          {/* Sub Navigation */}
          <div className="flex flex-wrap items-center gap-2 mt-5">
            <button
              onClick={() => setActiveSubView('workbench')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeSubView === 'workbench'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              Live OS Workbench (Impact, Risk, Triage, Heal)
            </button>
            <button
              onClick={() => setActiveSubView('planner')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeSubView === 'planner'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              4-Quadrant Strategy Planner
            </button>
            <button
              onClick={() => setActiveSubView('catalog')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeSubView === 'catalog'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Layer A Skills Catalog ({skills.length})
            </button>
            <button
              onClick={() => setActiveSubView('golden_rules')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeSubView === 'golden_rules'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              15 Golden Rules & Safety Policy
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: LIVE WORKBENCH */}
      {activeSubView === 'workbench' && (
        <div className="space-y-6">
          {/* Top Row: Doctor Health & Risk Engine */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* qa doctor Diagnostic Card */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">qa doctor System Health</h3>
                      <p className="text-xs text-slate-400">Environment & runner runtime verification</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRunDoctor}
                    disabled={doctorLoading}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${doctorLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {doctorData && (
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-extrabold text-emerald-400">{doctorData.healthScore}/100</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        {doctorData.overallStatus}
                      </span>
                      <span className="text-xs text-slate-400 ml-auto">
                        Passed: {doctorData.checksPassed} | Warn: {doctorData.checksWarn} | Fail: {doctorData.checksFailed}
                      </span>
                    </div>

                    <div className="max-h-52 overflow-y-auto space-y-2 pr-1 text-xs">
                      {doctorData.checks.map((c) => (
                        <div key={c.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-slate-200">
                              <span className="text-slate-400 font-mono">[{c.category}]</span> {c.name}
                            </div>
                            <div className="text-slate-400 text-xs mt-0.5">{c.details}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* qa risk Engine Card */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">qa risk (8-Factor Engine)</h3>
                      <p className="text-xs text-slate-400">Mathematical risk score (0-100) with top contributors</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={riskPrompt}
                    onChange={(e) => setRiskPrompt(e.target.value)}
                    placeholder="Describe code change or touched domain..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleRunRisk}
                    disabled={riskLoading}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shrink-0"
                  >
                    {riskLoading ? 'Calculating...' : 'Recalculate'}
                  </button>
                </div>

                {riskData && (
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-3">
                      <span className={`text-3xl font-extrabold ${riskData.score >= 80 ? 'text-rose-400' : riskData.score >= 60 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {riskData.score}/100
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded uppercase bg-amber-500/20 text-amber-300">
                        {riskData.tier} Risk
                      </span>
                      <span className="text-xs text-slate-400 ml-auto">
                        Layers: {riskData.requiredTestLayers.join(' · ')}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5">
                      <div className="font-semibold text-slate-300">Top Risk Contributors:</div>
                      {riskData.topContributors.map((c, i) => (
                        <div key={i} className="text-slate-400 flex items-center gap-1.5">
                          <span className="text-amber-400 font-bold">+</span> {c}
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-slate-400 italic">
                      {riskData.recommendation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Change Impact (qa impact) & Failure Triage (qa triage) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* qa impact Analysis */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">qa impact (Change Impact)</h3>
                    <p className="text-xs text-slate-400">Targeted test selection based on AST & symbol diff</p>
                  </div>
                </div>
                <button
                  onClick={handleRunImpact}
                  disabled={impactLoading}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${impactLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {impactData && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                    <span>Commit Range: <code className="text-indigo-400">{impactData.commitRange}</code></span>
                    <span>{impactData.totalFilesChanged} files modified</span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-slate-400 font-semibold">Affected Features:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {impactData.affectedFeatures.map((f, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="font-semibold text-slate-300">Targeted Minimal Test Subset:</div>
                    <div className="text-slate-400">
                      <span className="text-emerald-400 font-bold">Unit:</span> {impactData.targetedTests.unit.join(', ')}
                    </div>
                    <div className="text-slate-400">
                      <span className="text-cyan-400 font-bold">Integration:</span> {impactData.targetedTests.integration.join(', ')}
                    </div>
                    <div className="text-slate-400">
                      <span className="text-purple-400 font-bold">E2E:</span> {impactData.targetedTests.e2e.join(', ')}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* qa triage Clustering */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Bug className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">qa triage (12-Category Triage)</h3>
                    <p className="text-xs text-slate-400">Root cause clustering: Real Defect vs Flake vs Cascade</p>
                  </div>
                </div>
                <button
                  onClick={handleRunTriage}
                  disabled={triageLoading}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${triageLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {triageData && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                    <span>Total Failures Ingested: <strong className="text-white">{triageData.totalFailures}</strong></span>
                    <span className="text-rose-400 font-semibold">{triageData.primaryDefectsCount} Primary Root Causes</span>
                  </div>

                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {triageData.clusters.map((c, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-rose-300">[{c.category}]</span>
                          <span className="text-slate-500 font-mono text-[11px]">{c.affectedCount} tests affected</span>
                        </div>
                        <div className="text-slate-300 font-medium">{c.rootCause}</div>
                        <div className="text-slate-400 text-[11px] pt-1">
                          <strong className="text-emerald-400">Action:</strong> {c.recommendedAction || c.primaryFailure.recommendedAction}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Self-Healing Workbench */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">qa heal (Confidence-Tiered Self-Healing)</h3>
                  <p className="text-xs text-slate-400">Repairs brittle selectors with strict invariant checks (Never weaken assertions)</p>
                </div>
              </div>
              <button
                onClick={handleRunHeal}
                disabled={healLoading}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${healLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {healData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300">Confidence Tier:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      {healData.confidenceTier} ({healData.confidenceScore}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Target File:</span> <code className="text-indigo-400">{healData.testFile}</code>
                  </div>
                  <div className="text-slate-300">
                    <strong>Rationale:</strong> {healData.rationale}
                  </div>
                  <div className="pt-1">
                    <span className="text-slate-400">Auto-Apply Safe:</span>{' '}
                    <strong className={healData.canAutoApply ? 'text-emerald-400' : 'text-amber-400'}>
                      {healData.canAutoApply ? 'YES (High Confidence)' : 'NO (Manual Review Required)'}
                    </strong>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-semibold text-slate-300">Non-Negotiable Invariant Audit:</div>
                  <div className="space-y-1 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Assertion Weakening Prohibited: <strong>VERIFIED</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Timeout Increase Prohibited: <strong>VERIFIED</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Regression Masking Prevented: <strong>VERIFIED</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Golden Rules Compliance: <strong>PASSED</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: 4-QUADRANT STRATEGY PLANNER */}
      {activeSubView === 'planner' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Generate 4-Quadrant Test Decomposition & Scaffolds
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={taskPrompt}
                onChange={(e) => setTaskPrompt(e.target.value)}
                placeholder="Feature or test requirement (e.g. User OAuth checkout and payment verification)"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleGeneratePlan}
                disabled={plannerLoading}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                {plannerLoading ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Planning...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Generate Plan
                  </>
                )}
              </button>
            </div>
          </div>

          {plan && (
            <div className="space-y-6">
              {/* Test Pyramid Distribution */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Test Pyramid Allocation (Strict Inverted-Pyramid Penalty)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-xs font-semibold text-emerald-400 mb-1">UNIT INVARIANTS (60%)</div>
                    <div className="text-sm text-slate-300">{plan.pyramid_distribution.unit}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-xs font-semibold text-cyan-400 mb-1">INTEGRATION & API (30%)</div>
                    <div className="text-sm text-slate-300">{plan.pyramid_distribution.integration_api}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-xs font-semibold text-purple-400 mb-1">E2E USER JOURNEYS (10%)</div>
                    <div className="text-sm text-slate-300">{plan.pyramid_distribution.e2e_ui}</div>
                  </div>
                </div>
              </div>

              {/* 4 Quadrants Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Q1: POSITIVE (HAPPY PATH)</div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {plan.four_quadrants.q1_positive_happy_path.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">Q2: NEGATIVE & ERROR HANDLING</div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {plan.four_quadrants.q2_negative_error_handling.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Q3: BOUNDARY & RESILIENCE</div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {plan.four_quadrants.q3_boundary_resilience.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">Q4: SECURITY & ACCESSIBILITY</div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {plan.four_quadrants.q4_security_accessibility.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Lock className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Sample Test Scaffold */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-indigo-400" />
                    Generated Test Spec Scaffold
                  </h4>
                  <button
                    onClick={() => copyToClipboard(plan.sample_test_scaffold)}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? 'Copied' : 'Copy Spec'}
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
                  {plan.sample_test_scaffold}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: LAYER A SKILLS CATALOG */}
      {activeSubView === 'catalog' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchSkill}
                onChange={(e) => setSearchSkill(e.target.value)}
                placeholder="Search QA skills (e.g. playwright, api, llm, triage)..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSkills.map((skill) => (
              <div
                key={skill.id}
                onClick={() => setInspectedSkill(skill)}
                className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-indigo-500/5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {skill.category}
                    </span>
                    <span className="text-xs font-mono text-slate-500">{skill.id}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1.5">{skill.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {skill.snippet}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-indigo-400 font-medium">
                  <span>Inspect Patterns</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>

          {/* Modal Inspector */}
          {inspectedSkill && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">{inspectedSkill.title}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{inspectedSkill.path}</p>
                  </div>
                  <button
                    onClick={() => setInspectedSkill(null)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-6 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {inspectedSkill.full_content}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: 15 GOLDEN RULES */}
      {activeSubView === 'golden_rules' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              The 15 Golden Rules of qaforge (Architectural Invariants)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Programmatically enforced by all sub-agents, runners, and self-healing modules. Any violation halts automation and triggers safety review.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {[
                { id: 1, rule: 'Never weaken an assertion to make a test pass.' },
                { id: 2, rule: 'Never hide a regression behind retries.' },
                { id: 3, rule: 'Never use arbitrary sleeps (waitForTimeout) as first fix.' },
                { id: 4, rule: 'Never claim verification without execution evidence.' },
                { id: 5, rule: 'Never generate massive redundant E2E suites.' },
                { id: 6, rule: 'Never destroy test isolation for speed.' },
                { id: 7, rule: 'Never auto-delete tests without strong evidence.' },
                { id: 8, rule: 'Never expose secrets in test artifacts.' },
                { id: 9, rule: 'Never perform destructive production actions without authorization.' },
                { id: 10, rule: 'Always distinguish product defects from test defects.' },
                { id: 11, rule: 'Prefer the smallest test that catches the defect.' },
                { id: 12, rule: 'Preserve reproducibility with deterministic seeds.' },
                { id: 13, rule: 'Preserve evidence bundles (traces, screenshots, logs).' },
                { id: 14, rule: 'Explain important decisions with full explainability.' },
                { id: 15, rule: 'Optimize for signal, not test count.' },
              ].map((r) => (
                <div key={r.id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold font-mono">
                    #{r.id}
                  </span>
                  <span className="text-slate-300 font-medium leading-relaxed">{r.rule}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
