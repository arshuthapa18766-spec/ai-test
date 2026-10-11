import React, { useState } from 'react';
import { RunSummary, ScenarioResult } from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  RefreshCw, 
  Play, 
  Bug, 
  ArrowRight,
  Info
} from 'lucide-react';

interface BenchmarkLabProps {
  currentRun: RunSummary | null;
  onExecuteRun: (options: {
    agent_type: string;
    disable_retries: boolean;
    disable_validation: boolean;
    disable_injection_shield: boolean;
    disable_freshness_check: boolean;
  }) => Promise<void>;
  isRunning: boolean;
  onInspectScenario: (scenarioResult: ScenarioResult) => void;
  onGoToRegression: () => void;
}

export const BenchmarkLab: React.FC<BenchmarkLabProps> = ({
  currentRun,
  onExecuteRun,
  isRunning,
  onInspectScenario,
  onGoToRegression,
}) => {
  const [agentType, setAgentType] = useState<'resilient' | 'basic'>('resilient');
  const [disableRetries, setDisableRetries] = useState(false);
  const [disableValidation, setDisableValidation] = useState(false);
  const [disableInjectionShield, setDisableInjectionShield] = useState(false);
  const [disableFreshnessCheck, setDisableFreshnessCheck] = useState(false);

  const handleApplyPreset = (preset: 'hardened' | 'basic' | 'standout_bug' | 'no_retries') => {
    if (preset === 'hardened') {
      setAgentType('resilient');
      setDisableRetries(false);
      setDisableValidation(false);
      setDisableInjectionShield(false);
      setDisableFreshnessCheck(false);
    } else if (preset === 'basic') {
      setAgentType('basic');
      setDisableRetries(false);
      setDisableValidation(false);
      setDisableInjectionShield(false);
      setDisableFreshnessCheck(false);
    } else if (preset === 'standout_bug') {
      setAgentType('resilient');
      setDisableRetries(false);
      setDisableValidation(false);
      setDisableInjectionShield(true); // Defect introduced!
      setDisableFreshnessCheck(false);
    } else if (preset === 'no_retries') {
      setAgentType('resilient');
      setDisableRetries(true);
      setDisableValidation(false);
      setDisableInjectionShield(false);
      setDisableFreshnessCheck(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onExecuteRun({
      agent_type: agentType,
      disable_retries: disableRetries,
      disable_validation: disableValidation,
      disable_injection_shield: disableInjectionShield,
      disable_freshness_check: disableFreshnessCheck,
    });
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Chaos Controls */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide">Test Harness Configuration</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select the agent under test and configure controlled fault-tolerance switches or defect toggles.
            </p>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => handleApplyPreset('hardened')}
              className="px-2.5 py-1 text-xs font-medium rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
            >
              Production Hardened
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('basic')}
              className="px-2.5 py-1 text-xs font-medium rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Agent A (Naive)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('standout_bug')}
              className="px-2.5 py-1 text-xs font-medium rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
            >
              Standout Bug (Shield Off)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('no_retries')}
              className="px-2.5 py-1 text-xs font-medium rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
            >
              No Retries
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Agent Architecture Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Target Agent Architecture
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAgentType('resilient')}
                  className={`p-3 text-left rounded-md border transition-all ${
                    agentType === 'resilient'
                      ? 'border-emerald-500/50 bg-emerald-950/20 text-white'
                      : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">Agent B — Resilient</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Retries with backoff, schema validator, untrusted data isolation.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAgentType('basic')}
                  className={`p-3 text-left rounded-md border transition-all ${
                    agentType === 'basic'
                      ? 'border-emerald-500/50 bg-emerald-950/20 text-white'
                      : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">Agent A — Basic (Naive)</span>
                    <Bug className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Happy-path baseline. Zero retries, blind execution of payload.
                  </p>
                </button>
              </div>
            </div>

            {/* Controlled Defects Injected */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Controlled Defect Injector (Regression Testing)
                </label>
                <span className="text-xs text-slate-500">Injects code defects into Agent B</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center space-x-2 p-2 rounded bg-slate-900/50 border border-slate-800 text-xs text-slate-300 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={disableRetries}
                    onChange={(e) => setDisableRetries(e.target.checked)}
                    disabled={agentType === 'basic'}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-0"
                  />
                  <span>Disable Retries (503/Timeout)</span>
                </label>

                <label className="flex items-center space-x-2 p-2 rounded bg-slate-900/50 border border-slate-800 text-xs text-slate-300 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={disableValidation}
                    onChange={(e) => setDisableValidation(e.target.checked)}
                    disabled={agentType === 'basic'}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-0"
                  />
                  <span>Disable Schema Validation</span>
                </label>

                <label className="flex items-center space-x-2 p-2 rounded bg-slate-900/50 border border-slate-800 text-xs text-slate-300 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={disableInjectionShield}
                    onChange={(e) => setDisableInjectionShield(e.target.checked)}
                    disabled={agentType === 'basic'}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-0"
                  />
                  <span className="text-amber-400/90 font-medium">Disable Injection Shield</span>
                </label>

                <label className="flex items-center space-x-2 p-2 rounded bg-slate-900/50 border border-slate-800 text-xs text-slate-300 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={disableFreshnessCheck}
                    onChange={(e) => setDisableFreshnessCheck(e.target.checked)}
                    disabled={agentType === 'basic'}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-0"
                  />
                  <span>Disable Freshness Check</span>
                </label>
              </div>
            </div>
          </div>

          {/* Launch Button Bar */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              <span>Runs 7 deterministic chaos scenarios with explicit expected outcomes & safety assertions.</span>
            </div>

            <button
              type="submit"
              disabled={isRunning}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors shadow-sm disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Executing Scenarios...' : 'Launch Benchmark Evaluation'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Metrics Scorecard */}
      {currentRun && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
            <div className="text-xs text-slate-400 font-medium">Task Success Rate</div>
            <div className="mt-1 flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-white">{currentRun.task_success_rate}%</span>
              <span className="text-xs text-slate-500 font-mono">({currentRun.successful_tasks}/{currentRun.total_scenarios})</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Correctly completed tasks ÷ total eligible</p>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
            <div className="text-xs text-slate-400 font-medium">Safe Recovery Rate</div>
            <div className="mt-1 flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">{currentRun.safe_recovery_rate}%</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Recovered within constraints ÷ recoverable</p>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
            <div className="text-xs text-slate-400 font-medium">Failure Detection Rate</div>
            <div className="mt-1 flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-blue-400">{currentRun.failure_detection_rate}%</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Identified faults ÷ unrecoverable</p>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
            <div className="text-xs text-slate-400 font-medium">Latency (p50 / avg)</div>
            <div className="mt-1 flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-slate-200">{currentRun.p50_latency_ms}ms</span>
              <span className="text-xs text-slate-500 font-mono">avg {currentRun.avg_latency_ms}ms</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Execution duration & backoff</p>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
            <div className="text-xs text-slate-400 font-medium">Total Retries Used</div>
            <div className="mt-1 flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-slate-200">{currentRun.total_retries}</span>
              <span className="text-xs text-slate-500 font-mono">attempts</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Additional invocations after initial call</p>
          </div>
        </div>
      )}

      {/* Scenario Matrix Table */}
      {currentRun && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold text-white tracking-wide">
                  Scenario-by-Scenario Evaluation Matrix
                </h3>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs text-slate-400 font-mono">{currentRun.agent_name}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluation results separating functional task success from safety constraints.
              </p>
            </div>

            <button
              onClick={onGoToRegression}
              className="inline-flex items-center space-x-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300"
            >
              <span>Compare against Baseline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Scenario Name</th>
                  <th className="py-2.5 px-3 font-medium">Injected Failure Type</th>
                  <th className="py-2.5 px-3 font-medium text-center">Safe Success</th>
                  <th className="py-2.5 px-3 font-medium text-center">Task Status</th>
                  <th className="py-2.5 px-3 font-medium text-center">Safety Rule</th>
                  <th className="py-2.5 px-3 font-medium text-center">Retries</th>
                  <th className="py-2.5 px-3 font-medium text-right">Latency</th>
                  <th className="py-2.5 px-4 font-medium text-right">Traces</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {currentRun.results.map((res) => {
                  const isSafeSuccess = res.safe_success;
                  return (
                    <tr key={res.scenario_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{res.scenario_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{res.scenario_id}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono text-slate-300 text-[11px]">{res.failure_type}</span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {res.is_recoverable ? 'Recoverable' : 'Unrecoverable'}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {isSafeSuccess ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>PASS</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-rose-400 font-semibold text-[11px]">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>FAIL</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {res.task_success ? (
                          <span className="text-slate-200">Completed</span>
                        ) : (
                          <span className="text-rose-400/90 font-medium">Failed</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {res.safe_behavior ? (
                          <span className="text-emerald-400 font-medium">Preserved</span>
                        ) : (
                          <span className="text-rose-400 font-medium inline-flex items-center space-x-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>VIO</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-slate-400">
                        {res.retries_used}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-400">
                        {res.latency_ms.toFixed(1)} ms
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onInspectScenario(res)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                        >
                          View Trace
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
