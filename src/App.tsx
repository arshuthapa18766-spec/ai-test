/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { BenchmarkLab } from './components/BenchmarkLab';
import { RegressionLab } from './components/RegressionLab';
import { TraceViewer } from './components/TraceViewer';
import { TestRunner } from './components/TestRunner';
import { GeminiArena } from './components/GeminiArena';
import { CodeExplorer } from './components/CodeExplorer';
import { RunSummary, ScenarioResult, RegressionReport, UnitTestSuiteRun } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'benchmark' | 'regression' | 'traces' | 'tests' | 'gemini' | 'code'>('benchmark');
  const [currentRun, setCurrentRun] = useState<RunSummary | null>(null);
  const [runs, setRuns] = useState<Array<any>>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioResult | null>(null);
  const [testRun, setTestRun] = useState<UnitTestSuiteRun | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchRunsList = async () => {
    try {
      const res = await fetch('/api/runs');
      if (res.status === 401) {
        setApiError('HTTP 401 Unauthorized detected: If testing outside AI Studio, please use the Shared App URL or ensure third-party cookies are enabled in your browser settings.');
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setRuns(data);
        if (data.length > 0 && !currentRun) {
          fetchRunDetails(data[0].run_id);
        }
      }
    } catch (e: any) {
      console.error('Failed to load runs:', e);
      if (e.message?.includes('401')) {
        setApiError('HTTP 401 Unauthorized: Please use the Shared App URL or check browser cookie access.');
      }
    }
  };

  const fetchRunDetails = async (runId: string) => {
    try {
      const res = await fetch(`/api/runs/${runId}`);
      if (res.status === 401) {
        setApiError('HTTP 401 Unauthorized: Session credentials required.');
        return;
      }
      const data = await res.json();
      if (data && data.run_id) {
        setCurrentRun(data);
        if (data.results && data.results.length > 0) {
          setSelectedScenario(data.results[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load run details:', e);
    }
  };

  useEffect(() => {
    fetchRunsList();
  }, []);

  const handleExecuteRun = async (options: {
    agent_type: string;
    disable_retries: boolean;
    disable_validation: boolean;
    disable_injection_shield: boolean;
    disable_freshness_check: boolean;
  }) => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      const data = await res.json();
      if (data && data.run_id) {
        setCurrentRun(data);
        if (data.results && data.results.length > 0) {
          setSelectedScenario(data.results[0]);
        }
        await fetchRunsList();
      }
    } catch (e) {
      console.error('Error executing run:', e);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCompare = async (baselineId: string, candidateId: string): Promise<RegressionReport | null> => {
    try {
      const res = await fetch(`/api/compare?baseline_id=${encodeURIComponent(baselineId)}&candidate_id=${encodeURIComponent(candidateId)}`);
      const data = await res.json();
      return data;
    } catch (e) {
      console.error('Error comparing runs:', e);
      return null;
    }
  };

  const handleRunStandoutDemo = async () => {
    setIsRunningDemo(true);
    try {
      // 1. Run Baseline (Resilient, 100% hardened)
      const baseRes = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_type: 'resilient',
          disable_retries: false,
          disable_validation: false,
          disable_injection_shield: false,
          disable_freshness_check: false
        })
      });
      const baseRun = await baseRes.json();

      // 2. Run Candidate (Resilient, but prompt injection shield removed!)
      const candRes = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_type: 'resilient',
          disable_retries: false,
          disable_validation: false,
          disable_injection_shield: true, // Injected flaw
          disable_freshness_check: false
        })
      });
      const candRun = await candRes.json();

      await fetchRunsList();
      setCurrentRun(candRun);
      setActiveTab('regression');
    } catch (e) {
      console.error('Standout demo failed:', e);
    } finally {
      setIsRunningDemo(false);
    }
  };

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/tests/run', { method: 'POST' });
      const data = await res.json();
      setTestRun(data);
    } catch (e) {
      console.error('Error running automated tests:', e);
    } finally {
      setIsRunning(false);
    }
  };

  const handleInspectScenario = (scen: ScenarioResult) => {
    setSelectedScenario(scen);
    setActiveTab('traces');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab as any}
        onQuickRun={() => handleExecuteRun({
          agent_type: 'resilient',
          disable_retries: false,
          disable_validation: false,
          disable_injection_shield: false,
          disable_freshness_check: false
        })}
        isRunning={isRunning}
        totalRuns={runs.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {apiError && (
          <div className="mb-6 p-4 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start justify-between gap-3">
            <div>
              <strong className="font-semibold block text-amber-300">Authentication & Environment Notice:</strong>
              <p className="mt-0.5 leading-relaxed">{apiError}</p>
              <p className="mt-1 text-slate-400">
                Note: AgentCrashLab operates with 100% deterministic local mock tools and test suites that do not require external API tokens.
              </p>
            </div>
            <button
              onClick={() => setApiError(null)}
              className="text-amber-400 hover:text-amber-300 font-mono text-xs px-2 py-1 rounded bg-amber-950 border border-amber-800"
            >
              Dismiss
            </button>
          </div>
        )}
        {activeTab === 'benchmark' && (
          <BenchmarkLab
            currentRun={currentRun}
            onExecuteRun={handleExecuteRun}
            isRunning={isRunning}
            onInspectScenario={handleInspectScenario}
            onGoToRegression={() => setActiveTab('regression')}
          />
        )}

        {activeTab === 'regression' && (
          <RegressionLab
            runs={runs}
            onCompare={handleCompare}
            onRunStandoutDemo={handleRunStandoutDemo}
            isRunningDemo={isRunningDemo}
          />
        )}

        {activeTab === 'traces' && (
          <TraceViewer
            scenarios={currentRun?.results || []}
            selectedScenario={selectedScenario}
            onSelectScenario={setSelectedScenario}
          />
        )}

        {activeTab === 'tests' && (
          <TestRunner
            testRun={testRun}
            onRunTests={handleRunTests}
            isRunning={isRunning}
          />
        )}

        {activeTab === 'gemini' && (
          <GeminiArena />
        )}

        {activeTab === 'code' && (
          <CodeExplorer />
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <span>AgentCrashLab</span>
            <span>·</span>
            <span>AI Agent Reliability Testing Platform</span>
            <span>·</span>
            <span>Python 3.10 + FastAPI + Streamlit + SQLite</span>
          </div>
          <div>
            <span>Standout Demo: Happy-Path vs Injected Fault Regression Testing</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
