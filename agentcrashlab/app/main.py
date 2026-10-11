"""FastAPI Backend for AgentCrashLab."""
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from .core.runner import BenchmarkRunner
from .evaluation.evaluator import RegressionDetector
from .scenarios.benchmark import BENCHMARK_SCENARIOS
from .storage.database import Database

app = FastAPI(
    title="AgentCrashLab API",
    description="AI Agent Reliability Testing Platform — deliberately simulate tool faults, measure recovery, detect regressions.",
    version="1.0.0"
)

db = Database()
runner = BenchmarkRunner(db)


class RunRequest(BaseModel):
    agent_type: str = Field(default="resilient", description="'basic' or 'resilient'")
    disable_retries: bool = Field(default=False, description="Controlled bug: disable retry loop")
    disable_validation: bool = Field(default=False, description="Controlled bug: disable schema validation")
    disable_injection_shield: bool = Field(default=False, description="Controlled bug: disable prompt injection defense")
    disable_freshness_check: bool = Field(default=False, description="Controlled bug: disable freshness check")
    scenario_ids: Optional[List[str]] = Field(default=None, description="Optional list of scenario IDs to run")


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AgentCrashLab API",
        "version": "1.0.0",
        "database": "connected"
    }


@app.get("/scenarios")
def list_scenarios():
    return [
        {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "failure_type": s.failure_type.value,
            "is_recoverable": s.is_recoverable,
            "expected_status": s.expected_status,
            "max_retries": s.max_retries
        }
        for s in BENCHMARK_SCENARIOS
    ]


@app.post("/runs")
def create_run(req: RunRequest):
    summary = runner.run_benchmark(
        agent_type=req.agent_type,
        disable_retries=req.disable_retries,
        disable_validation=req.disable_validation,
        disable_injection_shield=req.disable_injection_shield,
        disable_freshness_check=req.disable_freshness_check,
        scenario_ids=req.scenario_ids
    )
    return summary.to_dict()


@app.get("/runs")
def list_runs(limit: int = Query(default=20, le=100)):
    return db.list_runs(limit=limit)


@app.get("/runs/{run_id}")
def get_run_details(run_id: str):
    run = db.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")
    return run.to_dict()


@app.get("/compare")
def compare_runs(baseline_id: str = Query(...), candidate_id: str = Query(...)):
    base_run = db.get_run(baseline_id)
    if not base_run:
        raise HTTPException(status_code=404, detail=f"Baseline run '{baseline_id}' not found")
    
    cand_run = db.get_run(candidate_id)
    if not cand_run:
        raise HTTPException(status_code=404, detail=f"Candidate run '{candidate_id}' not found")

    report = RegressionDetector.compare_runs(base_run, cand_run)
    return report.to_dict()


@app.get("/reports/{run_id}")
def get_run_report(run_id: str):
    run = db.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")
    return {
        "run_id": run.run_id,
        "agent": run.agent_name,
        "metrics": {
            "task_success_rate": f"{run.task_success_rate}%",
            "safe_recovery_rate": f"{run.safe_recovery_rate}%",
            "failure_detection_rate": f"{run.failure_detection_rate}%",
            "avg_latency_ms": f"{run.avg_latency_ms}ms",
            "p50_latency_ms": f"{run.p50_latency_ms}ms",
            "p95_latency_ms": f"{run.p95_latency_ms}ms",
            "total_retries": run.total_retries,
        },
        "scenarios": [
            {
                "id": r.scenario_id,
                "name": r.scenario_name,
                "safe_success": r.safe_success,
                "safe_behavior": r.safe_behavior,
                "task_success": r.task_success,
                "retries": r.retries_used,
                "latency_ms": r.latency_ms
            }
            for r in run.results
        ]
    }
