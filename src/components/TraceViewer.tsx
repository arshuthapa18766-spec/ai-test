import React, { useState } from 'react';
import { ScenarioResult, TraceStep } from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  Terminal, 
  Layers, 
  Code2,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface TraceViewerProps {
  scenarios: ScenarioResult[];
  selectedScenario: ScenarioResult | null;
  onSelectScenario: (scenario: ScenarioResult) => void;
}

export const TraceViewer: React.FC<TraceViewerProps> = ({
  scenarios,
  selectedScenario,
  onSelectScenario
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true, 4: true });

  const current = selectedScenario || (scenarios.length > 0 ? scenarios[0] : null);

  const toggleStep = (stepNum: number) => {
    setExpandedSteps(prev => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  if (!current) {
    return (
      <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-lg text-slate-400 text-xs">
        No evaluation scenario results available. Execute a benchmark run to view traces.
      </div>
    );
  }

  const getStepBadgeColor = (type: string) => {
    switch (type) {
      case 'safety_guardrail':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'tool_error':
      case 'validation_error':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'retry_backoff':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'tool_call':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'agent_decision':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      default:
        return 'text-slate-300 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Scenario Picker Carousel / Select */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
        <div className="text-xs text-slate-400 font-medium mb-2 px-1">Select Scenario to Inspect:</div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {scenarios.map((s) => {
            const isSelected = current.scenario_id === s.scenario_id;
            return (
              <button
                key={s.scenario_id}
                onClick={() => onSelectScenario(s)}
                className={`px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors flex items-center space-x-2 border ${
                  isSelected
                    ? 'bg-slate-800 text-white border-slate-600 shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {s.safe_success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                <span>{s.scenario_name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scenario Details & Assertions Header */}
      <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs text-slate-400">{current.scenario_id}</span>
              <span className="text-slate-600">·</span>
              <h3 className="text-base font-semibold text-white">{current.scenario_name}</h3>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
              <span>Fault Type: <strong className="text-slate-200 font-mono">{current.failure_type}</strong></span>
              <span>·</span>
              <span>Retries: <strong className="text-slate-200 font-mono">{current.retries_used}</strong></span>
              <span>·</span>
              <span>Latency: <strong className="text-slate-200 font-mono">{current.latency_ms} ms</strong></span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className={`px-3 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 ${
              current.safe_success
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {current.safe_success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span>{current.safe_success ? 'SAFE SUCCESS' : 'EVALUATION FAILED'}</span>
            </div>
          </div>
        </div>

        {/* Assertions Grid */}
        <div>
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Automated Ground Truth Assertions
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {current.assertions.map((a, i) => (
              <div
                key={i}
                className={`p-3 rounded-md border text-xs space-y-1 ${
                  a.passed
                    ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{a.name}</span>
                  {a.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                </div>
                <p className="text-[11px] opacity-90">{a.message}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Final Agent Answer */}
        <div className="p-3 bg-slate-950 rounded-md border border-slate-800">
          <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wider mb-1">Final Agent Output:</div>
          <div className="text-xs text-slate-200 font-mono leading-relaxed">{current.final_output}</div>
        </div>
      </div>

      {/* Step-by-Step Waterfall Execution Traces */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-semibold text-white">Execution Trace Waterfall</h4>
            <span className="text-xs text-slate-500">({current.traces.length} steps)</span>
          </div>
          <button
            onClick={() => {
              const allOpen = Object.keys(expandedSteps).length === current.traces.length;
              if (allOpen) {
                setExpandedSteps({});
              } else {
                const s: Record<number, boolean> = {};
                current.traces.forEach(t => { s[t.step_num] = true; });
                setExpandedSteps(s);
              }
            }}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Toggle All Details
          </button>
        </div>

        <div className="divide-y divide-slate-800/60">
          {current.traces.map((trace) => {
            const isExpanded = expandedSteps[trace.step_num];
            return (
              <div key={trace.step_num} className="p-4 hover:bg-slate-800/20 transition-colors">
                <div 
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => toggleStep(trace.step_num)}
                >
                  <div className="flex items-start space-x-3">
                    <span className="font-mono text-xs text-slate-500 mt-0.5">#{trace.step_num}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${getStepBadgeColor(trace.step_type)}`}>
                          {trace.step_type.toUpperCase()}
                        </span>
                        <span className="text-xs font-medium text-slate-200">{trace.action}</span>
                      </div>
                      {trace.error && (
                        <p className="text-xs text-rose-400 mt-1 font-mono">Error: {trace.error}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-slate-500 shrink-0">
                    {trace.duration_ms > 0 && <span>{trace.duration_ms} ms</span>}
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>

                {/* Expanded Details JSON */}
                {isExpanded && Object.keys(trace.details || {}).length > 0 && (
                  <div className="mt-3 pl-8">
                    <pre className="p-3 bg-slate-950 border border-slate-800/80 rounded text-[11px] text-slate-300 font-mono overflow-x-auto">
                      {JSON.stringify(trace.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
