import React from 'react';
import { 
  Zap, 
  Compass, 
  Database, 
  BookOpen, 
  Cpu, 
  ShieldCheck, 
  Flame, 
  Video, 
  BarChart3,
  Server
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  corpusCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, corpusCount }) => {
  const tabs = [
    { id: 'overview', label: 'Command Hub', icon: Zap },
    { id: 'routing', label: 'Task Router', icon: Compass },
    { id: 'retrieval', label: 'Fable Datasets', icon: Database },
    { id: 'corpus', label: `Corpus (${corpusCount})`, icon: BookOpen },
    { id: 'boost', label: 'Dual Accelerators', icon: Cpu },
    { id: 'war-room', label: 'Smart War Room', icon: Flame },
    { id: 'video', label: 'Video Studio', icon: Video },
    { id: 'security', label: 'Security Gate', icon: ShieldCheck },
    { id: 'benchmarks', label: 'Benchmarks & SVGs', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Zap className="w-6 h-6 fill-slate-950 stroke-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-lg text-white">Fable</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30">
                  v1.2 Studio
                </span>
                <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Self-improving experience layer for AI agents</p>
            </div>
          </div>

          {/* Quick Engine Pills */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>Laya (MLX / Fast Lexical)</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span>Headroom (~44% Tok↓)</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>GVS5H Ledger</span>
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <nav className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-slate-950' : 'stroke-current'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
