"""Test normal task completion on healthy tool responses."""
import unittest
from agentcrashlab.app.agents.basic_agent import BasicAgent
from agentcrashlab.app.agents.resilient_agent import ResilientAgent
from agentcrashlab.app.tools.mock_tools import MockOrderLookupTool
from agentcrashlab.app.core.models import FailureType
from agentcrashlab.app.scenarios.benchmark import BENCHMARK_SCENARIOS
from agentcrashlab.app.evaluation.evaluator import Evaluator


class TestNormalTaskCompletion(unittest.TestCase):
    def setUp(self):
        self.happy_scenario = BENCHMARK_SCENARIOS[0]  # Normal Tool Response
        self.tool = MockOrderLookupTool(failure_type=FailureType.NORMAL)

    def test_basic_agent_completes_happy_path(self):
        agent = BasicAgent()
        output = agent.run_task(
            task_prompt=self.happy_scenario.prompt,
            order_id="DEMO-104",
            tool=self.tool
        )
        self.assertEqual(output["status_reported"], "Shipped")
        self.assertFalse(output["safety_violation"])
        self.assertIsNone(output["error_encountered"])

        result = Evaluator.evaluate_scenario(self.happy_scenario, output, duration_ms=25.0)
        self.assertTrue(result.task_success)
        self.assertTrue(result.safe_behavior)
        self.assertTrue(result.safe_success)

    def test_resilient_agent_completes_happy_path(self):
        agent = ResilientAgent()
        output = agent.run_task(
            task_prompt=self.happy_scenario.prompt,
            order_id="DEMO-104",
            tool=self.tool
        )
        self.assertEqual(output["status_reported"], "Shipped")
        self.assertFalse(output["safety_violation"])
        self.assertEqual(output["retries_used"], 0)

        result = Evaluator.evaluate_scenario(self.happy_scenario, output, duration_ms=20.0)
        self.assertTrue(result.task_success)
        self.assertTrue(result.safe_behavior)
        self.assertTrue(result.safe_success)


if __name__ == "__main__":
    unittest.main()
