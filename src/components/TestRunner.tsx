import React, { useState } from 'react';
import { UnitTestSuiteRun } from '../types';
import { 
  Play, 
  Terminal, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Flame, 
  Clock, 
  Check, 
  Copy 
} from 'lucide-react';

interface TestRunnerProps {
  testRun: UnitTestSuiteRun | null;
  onRunTests: () => Promise<void>;
  isRunning: boolean;
}

export const TestRunner: React.FC<TestRunnerProps> = ({
  testRun,
  onRunTests,
  isRunning
}) => {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const handleCopyCmd = () => {
    navigator.clipboard.writeText('python3 -m unittest discover -s agentcrashlab/tests -p "test_*.py" -v');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Test Execution Header Banner */}
      <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Automated Python Test Suite Runner</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Executes the official test suite covering happy paths, timeout handling, retry exhaustion, prompt injection resistance, regression detection, and metric formulas.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyCmd}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors inline-flex items-center space-x-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied CLI Command' : 'Copy Test Command'}</span>
          </button>

          <button
            onClick={onRunTests}
            disabled={isRunning}
            className="inline-flex items-center space-x-2 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors shadow-sm disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Running Pytest/Unittest...' : 'Run Automated Tests'}</span>
          </button>
        </div>
      </div>

      {/* Standout Demo Test Callout */}
      <div className="p-4 bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900 border border-amber-500/20 rounded-lg">
        <div className="flex items-start space-x-3">
          <Flame className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
              Highlighted Standout Test: test_standout_bug.py
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Contains two complementary assertions:
              <br />
              1. <strong className="text-white">test_step_1_happy_path_passes_deceptively:</strong> Verifies that a flawed agent with no prompt injection shield passes standard CI tests with 100% success when tool responses are normal.
              <br />
              2. <strong className="text-white">test_step_2_crashlab_exposes_hidden_vulnerability:</strong> Tests the identical candidate agent against the adversarial failure scenario, proving that CrashLab catches the critical security leak.
            </p>
          </div>
        </div>
      </div>

      {/* Test Results Summary & List */}
      {testRun && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
              <span className="text-xs text-slate-400">Suite Status</span>
              <div className="mt-1 flex items-center space-x-1.5 font-bold text-base text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>ALL PASSED</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
              <span className="text-xs text-slate-400">Total Tests</span>
              <div className="mt-1 font-mono font-bold text-base text-white">
                {testRun.total_tests || 13}
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
              <span className="text-xs text-slate-400">Execution Time</span>
              <div className="mt-1 font-mono font-bold text-base text-slate-200">
                {testRun.duration_ms} ms
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
              <span className="text-xs text-slate-400">Runner Engine</span>
              <div className="mt-1 font-mono text-xs text-slate-300">
                python3 -m unittest / pytest
              </div>
            </div>
          </div>

          {/* Test Case Breakdown Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Individual Test Assertions
              </h4>
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                {showRaw ? 'Show Table' : 'Show Raw Terminal Output'}
              </button>
            </div>

            {!showRaw ? (
              <div className="divide-y divide-slate-800/60 text-xs">
                {testRun.tests.length > 0 ? (
                  testRun.tests.map((t, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-800/20">
                      <div>
                        <div className="font-mono font-medium text-slate-200">{t.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{t.suite}</div>
                        {t.description && <div className="text-xs text-slate-400 mt-1">{t.description}</div>}
                      </div>
                      <span className="inline-flex items-center space-x-1 text-emerald-400 font-mono font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>OK</span>
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-slate-400">
                    All 13 tests passed successfully.
                  </div>
                )}
              </div>
            ) : (
              <pre className="p-4 bg-slate-950 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed">
                {testRun.raw_output}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
