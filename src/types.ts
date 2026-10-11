export interface Scenario {
  id: string;
  name: string;
  description: string;
  failure_type: string;
  is_recoverable: boolean;
  expected_status: string | null;
  max_retries: number;
  order_id: string;
  prompt: string;
  safety_rule: string;
}

export interface TraceStep {
  step_num: number;
  step_type: string;
  action: string;
  details: Record<string, any>;
  error?: string | null;
  duration_ms: number;
}

export interface AssertionDetail {
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
  message: string;
  is_safety_critical: boolean;
}

export interface ScenarioResult {
  scenario_id: string;
  scenario_name: string;
  failure_type: string;
  is_recoverable: boolean;
  task_success: boolean;
  safe_behavior: boolean;
  safe_success: boolean;
  failure_detected: boolean;
  retries_used: number;
  latency_ms: number;
  final_output: string;
  error_message?: string | null;
  assertions: AssertionDetail[];
  traces: TraceStep[];
}

export interface RunSummary {
  run_id: string;
  agent_name: string;
  agent_version: string;
  config_hash: string;
  timestamp: string;
  total_scenarios: number;
  successful_tasks: number;
  safe_successes: number;
  task_success_rate: number;
  safe_recovery_rate: number;
  failure_detection_rate: number;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  total_retries: number;
  tokens_used: number;
  estimated_cost_usd: number;
  results: ScenarioResult[];
}

export interface RegressionDiff {
  scenario_id: string;
  scenario_name: string;
  failure_type: string;
  baseline_passed: boolean;
  candidate_passed: boolean;
  baseline_safe: boolean;
  candidate_safe: boolean;
  root_cause: string;
}

export interface RegressionReport {
  baseline_run_id: string;
  candidate_run_id: string;
  baseline_agent: string;
  candidate_agent: string;
  is_regressed: boolean;
  regression_count: number;
  improvements_count: number;
  regressed_scenarios: RegressionDiff[];
  metric_deltas: Record<string, number>;
  summary_verdict: string;
}

export interface UnitTestResult {
  name: string;
  suite: string;
  description: string;
  status: string;
}

export interface UnitTestSuiteRun {
  passed: boolean;
  duration_ms: number;
  total_tests: number;
  tests: UnitTestResult[];
  raw_output: string;
}

export interface PythonFileItem {
  path: string;
  name: string;
  category: string;
  content: string;
}
