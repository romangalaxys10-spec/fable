import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { OverviewTab } from './components/OverviewTab';
import { RoutingLabTab } from './components/RoutingLabTab';
import { FableRetrievalTab } from './components/FableRetrievalTab';
import { CorpusManagerTab } from './components/CorpusManagerTab';
import { BoostCompressionTab } from './components/BoostCompressionTab';
import { SmartWarRoomTab } from './components/SmartWarRoomTab';
import { VideoAnimationTab } from './components/VideoAnimationTab';
import { SecurityGateTab } from './components/SecurityGateTab';
import { BenchmarksAnalyticsTab } from './components/BenchmarksAnalyticsTab';
import { QAArchitectTab } from './components/QAArchitectTab';
import { SystemStatus } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch((err) => console.error('Failed to fetch status:', err));
  }, []);

  const handleQuickRun = (prompt: string) => {
    setActiveTab('routing');
  };

  const corpusCount = status?.engines?.corpus?.count || 3;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-400 selection:text-slate-950">
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        corpusCount={corpusCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewTab 
            status={status} 
            onNavigate={setActiveTab} 
            onQuickRun={handleQuickRun}
          />
        )}
        {activeTab === 'routing' && <RoutingLabTab />}
        {activeTab === 'qa' && <QAArchitectTab />}
        {activeTab === 'retrieval' && <FableRetrievalTab />}
        {activeTab === 'corpus' && <CorpusManagerTab />}
        {activeTab === 'boost' && <BoostCompressionTab />}
        {activeTab === 'war-room' && <SmartWarRoomTab />}
        {activeTab === 'video' && <VideoAnimationTab />}
        {activeTab === 'security' && <SecurityGateTab />}
        {activeTab === 'benchmarks' && <BenchmarksAnalyticsTab />}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Fable ⚡ Engine</span>
            <span>·</span>
            <span>Self-Improving Agent Experience Layer</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Node.js 22 · Python 3 · Hugging Face Datasets Server API
          </div>
        </div>
      </footer>
    </div>
  );
}
