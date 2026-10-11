"""Core data models and type definitions for AgentCrashLab."""
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any, Dict, List, Optional
import json


class FailureType(str, Enum):
    NORMAL = "normal"
    TRANSIENT_503 = "transient_503"
    TIMEOUT = "timeout"
    MALFORMED_JSON = "malformed_json"
    STALE_DATA = "stale_data"
    PROMPT_INJECTION = "prompt_injection"
    RETRY_EXHAUSTION = "retry_exhaustion"


class AgentType(str, Enum):
    BASIC = "basic"          # Agent A: Naive baseline
    RESILIENT = "resilient"  # Agent B: Hardened with retries, schema validation, injection shielding
    LLM = "llm"              # Hosted / local LLM model


@dataclass
class TraceStep:
    step_num: int
    step_type: str  # "tool_call", "tool_result", "agent_decision", "retry_backoff", "assertion"
    action: str
    details: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    duration_ms: float = 0.0


@dataclass
class AssertionDetail:
    name: str
    passed: bool
    expected: Any
    actual: Any
    message: str
    is_safety_critical: bool = False


@dataclass
class ScenarioResult:
    scenario_id: str
    scenario_name: str
    failure_type: str
    is_recoverable: bool
    task_success: bool
    safe_behavior: bool
    failure_detected: bool
    retries_used: int
    latency_ms: float
    final_output: str
    error_message: Optional[str] = None
    assertions: List[AssertionDetail] = field(default_factory=list)
    traces: List[TraceStep] = field(default_factory=list)

    @property
    def safe_success(self) -> bool:
        """A run is only a safe success if BOTH task succeeded AND safe behavior was maintained."""
        return self.task_success and self.safe_behavior

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RunSummary:
    run_id: str
    agent_name: str
    agent_version: str
    config_hash: str
    timestamp: str
    total_scenarios: int
    successful_tasks: int
    safe_successes: int
    task_success_rate: float
    safe_recovery_rate: float
    failure_detection_rate: float
    avg_latency_ms: float
    p50_latency_ms: float
    p95_latency_ms: float
    total_retries: int
    results: List[ScenarioResult] = field(default_factory=list)
    tokens_used: int = 0
    estimated_cost_usd: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RegressionDiff:
    scenario_id: str
    scenario_name: str
    failure_type: str
    baseline_passed: bool
    candidate_passed: bool
    baseline_safe: bool
    candidate_safe: bool
    root_cause: str


@dataclass
class RegressionReport:
    baseline_run_id: str
    candidate_run_id: str
    baseline_agent: str
    candidate_agent: str
    is_regressed: bool
    regression_count: int
    improvements_count: int
    regressed_scenarios: List[RegressionDiff] = field(default_factory=list)
    metric_deltas: Dict[str, float] = field(default_factory=dict)
    summary_verdict: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
