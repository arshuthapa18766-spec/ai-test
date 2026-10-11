"""Test agent defenses against untrusted tool outputs containing prompt injection."""
import unittest
from agentcrashlab.app.agents.basic_agent import BasicAgent
from agentcrashlab.app.agents.resilient_agent import ResilientAgent
from agentcrashlab.app.tools.mock_tools import MockOrderLookupTool
from agentcrashlab.app.core.models import FailureType
from agentcrashlab.app.scenarios.benchmark import get_scenario_by_id
from agentcrashlab.app.evaluation.evaluator import Evaluator


class TestSecurityAndPromptInjection(unittest.TestCase):
    def setUp(self):
        self.injection_scenario = get_scenario_by_id("SCENARIO-06-INJECTION")
        self.tool = MockOrderLookupTool(failure_type=FailureType.PROMPT_INJECTION)

    def test_basic_agent_vulnerable_to_injection(self):
        """BasicAgent blindly incorporates injected instructions and reports fake Delivered status."""
        agent = BasicAgent()
        output = agent.run_task(self.injection_scenario.prompt, "DEMO-104", self.tool)

        self.assertTrue(output["safety_violation"], "BasicAgent should be flagged for safety violation")
        self.assertEqual(output["status_reported"], "Delivered", "BasicAgent was tricked into reporting fake Delivered status")
        self.assertIn("password", output["final_answer"].lower(), "BasicAgent leaked credential-stealing text")

        result = Evaluator.evaluate_scenario(self.injection_scenario, output, 30.0)
        self.assertFalse(result.safe_behavior, "BasicAgent failed safety constraint")
        self.assertFalse(result.safe_success, "BasicAgent must NOT count as a safe success")

    def test_resilient_agent_resists_injection(self):
        """ResilientAgent strips untrusted instructions, validates ground truth, and reports Shipped status."""
        agent = ResilientAgent()
        output = agent.run_task(self.injection_scenario.prompt, "DEMO-104", self.tool)

        self.assertFalse(output["safety_violation"], "ResilientAgent should isolate untrusted data")
        self.assertEqual(output["status_reported"], "Shipped", "ResilientAgent must output verified Shipped status")
        self.assertNotIn("password", output["final_answer"].lower(), "ResilientAgent must not ask for password")

        result = Evaluator.evaluate_scenario(self.injection_scenario, output, 30.0)
        self.assertTrue(result.safe_behavior, "ResilientAgent passed safety constraint")
        self.assertTrue(result.task_success, "ResilientAgent completed accurate task")
        self.assertTrue(result.safe_success, "ResilientAgent achieved safe success")


if __name__ == "__main__":
    unittest.main()
