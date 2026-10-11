"""Test agent behavior under simulated infrastructure and tool failures."""
import unittest
from agentcrashlab.app.agents.basic_agent import BasicAgent
from agentcrashlab.app.agents.resilient_agent import ResilientAgent
from agentcrashlab.app.tools.mock_tools import MockOrderLookupTool
from agentcrashlab.app.core.models import FailureType
from agentcrashlab.app.scenarios.benchmark import get_scenario_by_id
from agentcrashlab.app.evaluation.evaluator import Evaluator


class TestFailureSimulations(unittest.TestCase):
    def test_transient_failure_recovery(self):
        """ResilientAgent should retry on 503 and recover; BasicAgent fails immediately."""
        scen = get_scenario_by_id("SCENARIO-02-TRANSIENT")

        # 1. Basic Agent fails
        tool_a = MockOrderLookupTool(failure_type=FailureType.TRANSIENT_503, transient_fail_count=1)
        basic_agent = BasicAgent()
        out_a = basic_agent.run_task(scen.prompt, "DEMO-104", tool_a)
        res_a = Evaluator.evaluate_scenario(scen, out_a, 10.0)
        self.assertFalse(res_a.task_success, "BasicAgent must fail on transient 503")
        self.assertEqual(out_a["retries_used"], 0)

        # 2. Resilient Agent retries and safely recovers
        tool_b = MockOrderLookupTool(failure_type=FailureType.TRANSIENT_503, transient_fail_count=1)
        resilient_agent = ResilientAgent()
        out_b = resilient_agent.run_task(scen.prompt, "DEMO-104", tool_b)
        res_b = Evaluator.evaluate_scenario(scen, out_b, 45.0)
        self.assertTrue(res_b.task_success, "ResilientAgent should successfully recover after 1 retry")
        self.assertEqual(out_b["status_reported"], "Shipped")
        self.assertEqual(out_b["retries_used"], 1)
        self.assertTrue(res_b.safe_success)

    def test_repeated_timeout_handling(self):
        """Repeated timeouts should terminate safely within retry limits without hanging."""
        scen = get_scenario_by_id("SCENARIO-03-TIMEOUT")
        tool = MockOrderLookupTool(failure_type=FailureType.TIMEOUT)
        resilient_agent = ResilientAgent()

        out = resilient_agent.run_task(scen.prompt, "DEMO-104", tool, max_retries=2)
        res = Evaluator.evaluate_scenario(scen, out, 50.0)

        self.assertTrue(out["failure_detected"], "Agent must detect timeout failure")
        self.assertIsNone(out["status_reported"], "Agent must not hallucinate a status on timeout")
        self.assertTrue(res.task_success, "Safe abortion on timeout counts as safe failure handling")
        self.assertLessEqual(out["retries_used"], 2)

    def test_malformed_response_rejected(self):
        """Corrupted JSON payload must be caught by schema validation and rejected."""
        scen = get_scenario_by_id("SCENARIO-04-MALFORMED")
        tool = MockOrderLookupTool(failure_type=FailureType.MALFORMED_JSON)
        resilient_agent = ResilientAgent()

        out = resilient_agent.run_task(scen.prompt, "DEMO-104", tool)
        res = Evaluator.evaluate_scenario(scen, out, 15.0)

        self.assertTrue(out["failure_detected"], "Schema validator must catch corrupted payload")
        self.assertIsNone(out["status_reported"])
        self.assertTrue(res.task_success)

    def test_retry_exhaustion_stops_gracefully(self):
        """Persistent 500 error must be aborted after reaching max retries."""
        scen = get_scenario_by_id("SCENARIO-07-EXHAUSTION")
        tool = MockOrderLookupTool(failure_type=FailureType.RETRY_EXHAUSTION)
        resilient_agent = ResilientAgent()

        out = resilient_agent.run_task(scen.prompt, "DEMO-104", tool, max_retries=3)
        res = Evaluator.evaluate_scenario(scen, out, 60.0)

        self.assertEqual(out["retries_used"], 3)
        self.assertTrue(out["failure_detected"])
        self.assertTrue(res.task_success)


if __name__ == "__main__":
    unittest.main()
