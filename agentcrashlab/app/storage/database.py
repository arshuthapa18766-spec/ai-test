"""SQLite experiment storage for AgentCrashLab."""
import json
import os
import sqlite3
from typing import Any, Dict, List, Optional
from ..core.models import (
    AssertionDetail,
    RunSummary,
    ScenarioResult,
    TraceStep,
)

DEFAULT_DB_PATH = os.environ.get("AGENTCRASHLAB_DB_PATH", os.path.join(os.path.dirname(__file__), "..", "..", "data", "experiments.db"))


class Database:
    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        self._init_schema()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS runs (
                run_id TEXT PRIMARY KEY,
                agent_name TEXT NOT NULL,
                agent_version TEXT NOT NULL,
                config_hash TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                total_scenarios INTEGER NOT NULL,
                successful_tasks INTEGER NOT NULL,
                safe_successes INTEGER NOT NULL,
                task_success_rate REAL NOT NULL,
                safe_recovery_rate REAL NOT NULL,
                failure_detection_rate REAL NOT NULL,
                avg_latency_ms REAL NOT NULL,
                p50_latency_ms REAL NOT NULL,
                p95_latency_ms REAL NOT NULL,
                total_retries INTEGER NOT NULL,
                tokens_used INTEGER DEFAULT 0,
                estimated_cost_usd REAL DEFAULT 0.0
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS scenario_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT NOT NULL,
                scenario_id TEXT NOT NULL,
                scenario_name TEXT NOT NULL,
                failure_type TEXT NOT NULL,
                is_recoverable INTEGER NOT NULL,
                task_success INTEGER NOT NULL,
                safe_behavior INTEGER NOT NULL,
                safe_success INTEGER NOT NULL,
                failure_detected INTEGER NOT NULL,
                retries_used INTEGER NOT NULL,
                latency_ms REAL NOT NULL,
                final_output TEXT,
                error_message TEXT,
                assertions_json TEXT,
                traces_json TEXT,
                FOREIGN KEY (run_id) REFERENCES runs (run_id) ON DELETE CASCADE
            );
            """)
            conn.commit()

    def save_run(self, run: RunSummary):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO runs (
                run_id, agent_name, agent_version, config_hash, timestamp,
                total_scenarios, successful_tasks, safe_successes,
                task_success_rate, safe_recovery_rate, failure_detection_rate,
                avg_latency_ms, p50_latency_ms, p95_latency_ms, total_retries,
                tokens_used, estimated_cost_usd
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                run.run_id, run.agent_name, run.agent_version, run.config_hash, run.timestamp,
                run.total_scenarios, run.successful_tasks, run.safe_successes,
                run.task_success_rate, run.safe_recovery_rate, run.failure_detection_rate,
                run.avg_latency_ms, run.p50_latency_ms, run.p95_latency_ms, run.total_retries,
                run.tokens_used, run.estimated_cost_usd
            ))

            for res in run.results:
                assertions_raw = json.dumps([a.__dict__ for a in res.assertions])
                traces_raw = json.dumps([t.__dict__ for t in res.traces])
                cursor.execute("""
                INSERT INTO scenario_results (
                    run_id, scenario_id, scenario_name, failure_type,
                    is_recoverable, task_success, safe_behavior, safe_success,
                    failure_detected, retries_used, latency_ms,
                    final_output, error_message, assertions_json, traces_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    run.run_id, res.scenario_id, res.scenario_name, res.failure_type,
                    1 if res.is_recoverable else 0,
                    1 if res.task_success else 0,
                    1 if res.safe_behavior else 0,
                    1 if res.safe_success else 0,
                    1 if res.failure_detected else 0,
                    res.retries_used, res.latency_ms,
                    res.final_output, res.error_message,
                    assertions_raw, traces_raw
                ))
            conn.commit()

    def get_run(self, run_id: str) -> Optional[RunSummary]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM runs WHERE run_id = ?", (run_id,))
            run_row = cursor.fetchone()
            if not run_row:
                return None

            cursor.execute("SELECT * FROM scenario_results WHERE run_id = ?", (run_id,))
            res_rows = cursor.fetchall()
            results = []
            for r in res_rows:
                assertions_data = json.loads(r["assertions_json"]) if r["assertions_json"] else []
                traces_data = json.loads(r["traces_json"]) if r["traces_json"] else []

                assertions = [AssertionDetail(**a) for a in assertions_data]
                traces = [TraceStep(**t) for t in traces_data]

                results.append(ScenarioResult(
                    scenario_id=r["scenario_id"],
                    scenario_name=r["scenario_name"],
                    failure_type=r["failure_type"],
                    is_recoverable=bool(r["is_recoverable"]),
                    task_success=bool(r["task_success"]),
                    safe_behavior=bool(r["safe_behavior"]),
                    failure_detected=bool(r["failure_detected"]),
                    retries_used=r["retries_used"],
                    latency_ms=r["latency_ms"],
                    final_output=r["final_output"],
                    error_message=r["error_message"],
                    assertions=assertions,
                    traces=traces
                ))

            return RunSummary(
                run_id=run_row["run_id"],
                agent_name=run_row["agent_name"],
                agent_version=run_row["agent_version"],
                config_hash=run_row["config_hash"],
                timestamp=run_row["timestamp"],
                total_scenarios=run_row["total_scenarios"],
                successful_tasks=run_row["successful_tasks"],
                safe_successes=run_row["safe_successes"],
                task_success_rate=run_row["task_success_rate"],
                safe_recovery_rate=run_row["safe_recovery_rate"],
                failure_detection_rate=run_row["failure_detection_rate"],
                avg_latency_ms=run_row["avg_latency_ms"],
                p50_latency_ms=run_row["p50_latency_ms"],
                p95_latency_ms=run_row["p95_latency_ms"],
                total_retries=run_row["total_retries"],
                results=results,
                tokens_used=run_row["tokens_used"],
                estimated_cost_usd=run_row["estimated_cost_usd"]
            )

    def list_runs(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM runs ORDER BY timestamp DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
