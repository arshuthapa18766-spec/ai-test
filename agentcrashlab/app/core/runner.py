"""Benchmark execution engine orchestrator."""
from datetime import datetime, timezone
import hashlib
import time
import uuid
from typing import Dict, List, Optional
from ..core.models import RunSummary, ScenarioResult
from ..scenarios.benchmark import BENCHMARK_SCENARIOS, ScenarioDefinition
from ..tools.mock_tools import MockOrderLookupTool
from ..agents.basic_agent import BasicAgent
from ..agents.resilient_agent import ResilientAgent
from ..evaluation.evaluator import Evaluator
from ..storage.database import Database


def generate_config_hash(agent_name: str, options: Dict[str, bool]) -> str:
    raw = f"{agent_name}:{sorted(options.items())}"
    return hashlib.sha256(raw.encode()).hexdigest()[:12]


class BenchmarkRunner:
    def __init__(self, db: Optional[Database] = None):
        self.db = db or Database()

    def run_benchmark(
        self,
        agent_type: str = "resilient",  # "basic" or "resilient"
        disable_retries: bool = False,
        disable_validation: bool = False,
        disable_injection_shield: bool = False,
        disable_freshness_check: bool = False,
        scenario_ids: Optional[List[str]] = None,
        custom_run_id: Optional[str] = None
    ) -> RunSummary:
        run_id = custom_run_id or f"run_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:6]}"
        timestamp = datetime.now(timezone.utc).isoformat()

        options = {
            "disable_retries": disable_retries,
            "disable_validation": disable_validation,
            "disable_injection_shield": disable_injection_shield,
            "disable_freshness_check": disable_freshness_check
        }

        # Initialize requested agent
        if agent_type.lower() == "basic":
            agent = BasicAgent()
            agent_name = "Agent-A-Basic (Naive)"
            agent_version = "1.0.0"
        else:
            agent = ResilientAgent(
                disable_retries=disable_retries,
                disable_validation=disable_validation,
                disable_injection_shield=disable_injection_shield,
                disable_freshness_check=disable_freshness_check
            )
            tags = []
            if disable_retries: tags.append("no_retries")
            if disable_validation: tags.append("no_val")
            if disable_injection_shield: tags.append("no_shield")
            if disable_freshness_check: tags.append("no_fresh")
            tag_str = f" [Defects: {', '.join(tags)}]" if tags else " [Production Hardened]"
            agent_name = f"Agent-B-Resilient{tag_str}"
            agent_version = "2.1.0-candidate" if tags else "2.0.0"

        config_hash = generate_config_hash(agent_name, options)

        # Filter scenarios if specified
        target_scenarios = BENCHMARK_SCENARIOS
        if scenario_ids:
            target_scenarios = [s for s in BENCHMARK_SCENARIOS if s.id in scenario_ids]

        results: List[ScenarioResult] = []

        for scen in target_scenarios:
            tool = MockOrderLookupTool(
                failure_type=scen.failure_type,
                transient_fail_count=scen.transient_fails
            )
            t_start = time.time()
            output = agent.run_task(
                task_prompt=scen.prompt,
                order_id=scen.order_id,
                tool=tool,
                max_retries=scen.max_retries
            )
            dur_ms = (time.time() - t_start) * 1000

            res = Evaluator.evaluate_scenario(scen, output, duration_ms=dur_ms)
            results.append(res)

        summary = Evaluator.calculate_run_summary(
            run_id=run_id,
            agent_name=agent_name,
            agent_version=agent_version,
            config_hash=config_hash,
            timestamp=timestamp,
            results=results
        )

        self.db.save_run(summary)
        return summary
