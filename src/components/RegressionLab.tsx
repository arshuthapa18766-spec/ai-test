import React, { useState, useEffect } from 'react';
import { RunSummary, RegressionReport } from '../types';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Flame, 
  RefreshCw, 
  TrendingDown, 
  TrendingUp,
  Minus
} from 'lucide-react';

interface RegressionLabProps {
  runs: Array<{
    run_id: string;
    agent_name: string;
    timestamp: string;
    task_success_rate: number;
    safe_recovery_rate: number;
  }>;
  onCompare: (baselineId: string, candidateId: string) => Promise<RegressionReport | null>;
  onRunStandoutDemo: () => Promise<void>;
  isRunningDemo: boolean;
}

export const RegressionLab: React.FC<RegressionLabProps> = ({
  runs,
  onCompare,
  onRunStandoutDemo,
  isRunningDemo
}) => {
  const [baselineId, setBaselineId] = useState<string>('');
  const [candidateId, setCandidateId] = useState<string>('');
  const [report, setReport] = useState<RegressionReport | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // Initialize dropdowns with first two runs if available
  useEffect(() => {
    if (runs.length >= 2) {
      if (!baselineId) setBaselineId(runs[runs.length - 1].run_id);
      if (!candidateId) setCandidateId(runs[0].run_id);
    } else if (runs.length === 1 && !baselineId) {
      setBaselineId(runs[0].run_id);
    }
  }, [runs]);

  const handleCompareClick = async () => {
    if (!baselineId || !candidateId) return;
    setIsComparing(true);
    const res = await onCompare(baselineId, candidateId);
    setReport(res);
    setIsComparing(false);
  };

  return (
    <div className="space-y-6">
      {/* Standout Demo Banner */}
      <div className="p-5 bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-rose-950/20 border border-amber-500/30 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Standout Demo: The Hidden Regression
              </span>
            </div>
            <h3 className="text-base font-semibold text-white">
              Prove That Ordinary Happy-Path Tests Miss Critical Vulnerabilities
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              In this scenario, a developer refactors the agent to remove overhead. In doing so, they inadvertently omit the prompt injection defense shield. 
              Conventional happy-path unit tests pass, but AgentCrashLab detects the critical security regression immediately.
            </p>
          </div>

          <button
            onClick={onRunStandoutDemo}
            disabled={isRunningDemo}
            className="self-start md:self-center inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-md transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunningDemo ? 'animate-spin' : ''}`} />
            <span>{isRunningDemo ? 'Running Standout Demo...' : 'Run Standout Demo (1-Click)'}</span>
          </button>
        </div>
      </div>

      {/* Selectors for Baseline vs Candidate */}
      <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-white">Compare Evaluation Runs</h3>
            <p className="text-xs text-slate-400">
              Select a known-good baseline run and a candidate build to identify regressions in reliability, safety, and latency.
            </p>
          </div>

          <button
            onClick={handleCompareClick}
            disabled={!baselineId || !candidateId || isComparing}
            className="inline-flex items-center space-x-2 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isComparing ? 'animate-spin' : ''}`} />
            <span>Calculate Regression Diff</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Baseline Run (Reference Version)
            </label>
            <select
              value={baselineId}
              onChange={(e) => setBaselineId(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md py-2 px-3 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Select a baseline run...</option>
              {runs.map((r) => (
                <option key={`base-${r.run_id}`} value={r.run_id}>
                  {r.agent_name} — {new Date(r.timestamp).toLocaleTimeString()} ({r.run_id.slice(0, 16)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Candidate Run (New Build / PR)
            </label>
            <select
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md py-2 px-3 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Select a candidate run...</option>
              {runs.map((r) => (
                <option key={`cand-${r.run_id}`} value={r.run_id}>
                  {r.agent_name} — {new Date(r.timestamp).toLocaleTimeString()} ({r.run_id.slice(0, 16)})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Regression Report Results */}
      {report && (
        <div className="space-y-4">
          {/* Main Verdict Card */}
          <div className={`p-4 rounded-lg border ${
            report.is_regressed 
              ? 'bg-rose-950/20 border-rose-500/40 text-rose-200' 
              : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
          }`}>
            <div className="flex items-start space-x-3">
              {report.is_regressed ? (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <h4 className="text-sm font-semibold tracking-wide">
                  {report.summary_verdict}
                </h4>
                <p className="text-xs opacity-90 leading-relaxed">
                  {report.is_regressed
                    ? `Candidate build introduced ${report.regression_count} behavioral or safety regression(s) against baseline.`
                    : 'Candidate build maintained full parity with no regressions detected across all 7 fault scenarios.'}
                </p>
              </div>
            </div>
          </div>

          {/* Metric Deltas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
              <span className="text-xs text-slate-400">Task Success Rate Δ</span>
              <div className="mt-1 flex items-center space-x-1 font-mono font-bold text-base">
                {report.metric_deltas.task_success_rate_delta > 0 && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                {report.metric_deltas.task_success_rate_delta < 0 && <TrendingDown className="w-4 h-4 text-rose-400" />}
                {report.metric_deltas.task_success_rate_delta === 0 && <Minus className="w-4 h-4 text-slate-500" />}
                <span className={report.metric_deltas.task_success_rate_delta < 0 ? 'text-rose-400' : 'text-slate-200'}>
                  {report.metric_deltas.task_success_rate_delta > 0 ? '+' : ''}{report.metric_deltas.task_success_rate_delta}%
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
              <span className="text-xs text-slate-400">Safe Recovery Rate Δ</span>
              <div className="mt-1 flex items-center space-x-1 font-mono font-bold text-base">
                {report.metric_deltas.safe_recovery_rate_delta > 0 && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                {report.metric_deltas.safe_recovery_rate_delta < 0 && <TrendingDown className="w-4 h-4 text-rose-400" />}
                {report.metric_deltas.safe_recovery_rate_delta === 0 && <Minus className="w-4 h-4 text-slate-500" />}
                <span className={report.metric_deltas.safe_recovery_rate_delta < 0 ? 'text-rose-400' : 'text-slate-200'}>
                  {report.metric_deltas.safe_recovery_rate_delta > 0 ? '+' : ''}{report.metric_deltas.safe_recovery_rate_delta}%
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
              <span className="text-xs text-slate-400">Latency p50 Δ</span>
              <div className="mt-1 font-mono font-bold text-base text-slate-200">
                {report.metric_deltas.latency_p50_delta_ms > 0 ? '+' : ''}{report.metric_deltas.latency_p50_delta_ms} ms
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
              <span className="text-xs text-slate-400">Total Retries Δ</span>
              <div className="mt-1 font-mono font-bold text-base text-slate-200">
                {report.metric_deltas.total_retries_delta > 0 ? '+' : ''}{report.metric_deltas.total_retries_delta}
              </div>
            </div>
          </div>

          {/* Regressed Scenarios Detail Table */}
          {report.regressed_scenarios.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
              <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Regressed Scenarios Breakdown
                </h4>
              </div>
              <div className="divide-y divide-slate-800/60">
                {report.regressed_scenarios.map((diff) => (
                  <div key={diff.scenario_id} className="p-4 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <span className="font-mono text-xs text-slate-400 mr-2">[{diff.scenario_id}]</span>
                        <span className="font-semibold text-white text-xs">{diff.scenario_name}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-emerald-400 font-mono">Baseline: PASS</span>
                        <span className="text-slate-600">→</span>
                        <span className="text-rose-400 font-mono font-bold">Candidate: FAIL</span>
                      </div>
                    </div>

                    <div className="p-3 rounded bg-rose-950/30 border border-rose-900/40 text-xs text-rose-300">
                      <span className="font-bold text-rose-200">Root Cause: </span>
                      {diff.root_cause}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
