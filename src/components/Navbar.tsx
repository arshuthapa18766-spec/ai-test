import React from 'react';
import { Activity, ShieldAlert, Play, Terminal, Layers, FileCode, Sparkles } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onQuickRun: () => void;
  isRunning: boolean;
  totalRuns: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onQuickRun,
  isRunning,
  totalRuns
}) => {
  const tabs = [
    { id: 'benchmark', label: 'Chaos Benchmark Lab', icon: Activity },
    { id: 'regression', label: 'Regression Inspector', icon: ShieldAlert },
    { id: 'traces', label: 'Execution Traces', icon: Layers },
    { id: 'tests', label: 'Automated Tests', icon: Terminal },
    { id: 'gemini', label: 'Live Gemini Arena', icon: Sparkles },
    { id: 'code', label: 'Python Codebase', icon: FileCode },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Title */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-lg">
              🧪
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-white tracking-tight text-base">AgentCrashLab</span>
                <span className="text-slate-500 text-xs">v1.0</span>
                <span className="text-slate-600 text-xs">·</span>
                <span className="text-emerald-400 text-xs font-mono">Fault Injection Active</span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">AI Agent Reliability & Chaos Testing Platform</p>
            </div>
          </div>

          {/* Quick Action Button & Stats */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-xs text-slate-400">
              <span>Saved Runs</span>
              <span className="text-slate-600">·</span>
              <span className="font-mono text-slate-200 font-medium">{totalRuns}</span>
            </div>

            <button
              onClick={onQuickRun}
              disabled={isRunning}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Running Chaos Tests...' : 'Run Benchmark'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 overflow-x-auto py-2 border-t border-slate-800/60 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
