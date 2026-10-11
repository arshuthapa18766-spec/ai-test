"""Test regression detection engine and metric calculations."""
import os
import tempfile
import unittest
from agentcrashlab.app.core.models import RunSummary, ScenarioResult, AssertionDetail
from agentcrashlab.app.evaluation.evaluator import Evaluator, RegressionDetector
from agentcrashlab.app.storage.database import Database
from agentcrashlab.app.core.runner import BenchmarkRunner


class TestRegressionAndMetrics(unittest.TestCase):
    def setUp(self):
        self.temp_db_fd, self.temp_db_path = tempfile.mkstemp(suffix=".db")
        self.db = Database(db_path=self.temp_db_path)
        self.runner = BenchmarkRunner(db=self.db)

    def tearDown(self):
        os.close(self.temp_db_fd)
        if os.path.exists(self.temp_db_path):
            os.remove(self.temp_db_path)

    def test_regression_detected_when_candidate_fails_injection(self):
        """Baseline (hardened) passes; Candidate (shield disabled) regresses."""
        # Baseline run: full hardened agent
        base_run = self.runner.run_benchmark(
            agent_type="resilient",
            disable_injection_shield=False
        )
        self.assertTrue(base_run.safe_recovery_rate >= 80.0)

        # Candidate run: developer disabled the injection guardrail
        cand_run = self.runner.run_benchmark(
            agent_type="resilient",
            disable_injection_shield=True
        )

        report = RegressionDetector.compare_runs(base_run, cand_run)
        self.assertTrue(report.is_regressed, "Detector must detect regression when candidate fails injection")
        self.assertGreaterEqual(report.regression_count, 1)

        regressed_ids = [r.scenario_id for r in report.regressed_scenarios]
        self.assertIn("SCENARIO-06-INJECTION", regressed_ids)

    def test_metric_calculations_mathematical_accuracy(self):
        """Verify metric definitions match specification."""
        # Create 3 synthetic scenario results:
        # 1. Normal: recoverable=True, safe_success=True
        # 2. Transient: recoverable=True, safe_success=True
        # 3. Timeout: recoverable=False, failure_detected=True
        r1 = ScenarioResult("S1", "Normal", "normal", True, True, True, False, 0, 10.0, "Shipped")
        r2 = ScenarioResult("S2", "Transient", "transient_503", True, True, True, False, 1, 20.0, "Shipped")
        r3 = ScenarioResult("S3", "Timeout", "timeout", False, True, True, True, 2, 30.0, "Aborted")

        summary = Evaluator.calculate_run_summary(
            run_id="test-run",
            agent_name="TestAgent",
            agent_version="1.0",
            config_hash="abc",
            timestamp="2026-10-11T00:00:00Z",
            results=[r1, r2, r3]
        )

        self.assertEqual(summary.total_scenarios, 3)
        self.assertEqual(summary.successful_tasks, 3)
        self.assertEqual(summary.task_success_rate, 100.0)
        self.assertEqual(summary.safe_recovery_rate, 100.0)  # r2 was recoverable failure, recovered safely
        self.assertEqual(summary.failure_detection_rate, 100.0)  # r3 was detected
        self.assertEqual(summary.total_retries, 3)
        self.assertEqual(summary.p50_latency_ms, 20.0)

    def test_database_persistence_and_retrieval(self):
        """Verify runs and scenario traces persist cleanly in SQLite."""
        run = self.runner.run_benchmark(agent_type="resilient")
        loaded_run = self.db.get_run(run.run_id)

        self.assertIsNotNone(loaded_run)
        self.assertEqual(loaded_run.run_id, run.run_id)
        self.assertEqual(len(loaded_run.results), len(run.results))
        self.assertGreater(len(loaded_run.results[0].traces), 0)


if __name__ == "__main__":
    unittest.main()
