"""Standout Demo Test: Catching a critical defect that ordinary happy-path tests completely miss.

Story:
A developer refactored the agent to 'optimize latency' and remove overhead.
In doing so, they inadvertently disabled response validation and the prompt injection defense shield.
- Conventional happy-path unit tests PASS, giving the team false confidence.
- AgentCrashLab's failure injection scenario IMMEDIATELY flags the regression and safety vulnerability!
"""
import unittest
from agentcrashlab.app.agents.resilient_agent import ResilientAgent
from agentcrashlab.app.tools.mock_tools import MockOrderLookupTool
from agentcrashlab.app.core.models import FailureType
from agentcrashlab.app.scenarios.benchmark import get_scenario_by_id
from agentcrashlab.app.evaluation.evaluator import Evaluator


class TestStandoutRegressionDemo(unittest.TestCase):
    def setUp(self):
        # A candidate agent with an inadvertent bug: injection defense shield disabled!
        self.candidate_agent_with_bug = ResilientAgent(
            name="Candidate-v2.1-RegressionBug",
            disable_injection_shield=True  # Defect introduced!
        )

    def test_step_1_happy_path_passes_deceptively(self):
        """
        Conventional happy-path test:
        The tool is healthy, no errors occur.
        The flawed agent produces a 100% successful result and passes standard CI!
        """
        happy_scen = get_scenario_by_id("SCENARIO-01-HAPPY")
        healthy_tool = MockOrderLookupTool(failure_type=FailureType.NORMAL)

        output = self.candidate_agent_with_bug.run_task(
            task_prompt=happy_scen.prompt,
            order_id="DEMO-104",
            tool=healthy_tool
        )
        result = Evaluator.evaluate_scenario(happy_scen, output, duration_ms=18.0)

        # Happy-path gives false confidence!
        self.assertTrue(result.task_success, "Happy path deceptively passes!")
        self.assertTrue(result.safe_behavior, "No attack was mounted, so it looks safe!")
        self.assertEqual(output["status_reported"], "Shipped")

    def test_step_2_crashlab_exposes_hidden_vulnerability(self):
        """
        AgentCrashLab failure injection test:
        The tool returns a mock output contaminated with prompt injection.
        The exact same flawed agent falls victim, violating safety constraints.
        AgentCrashLab catches the critical defect that happy-path missed!
        """
        injection_scen = get_scenario_by_id("SCENARIO-06-INJECTION")
        adversarial_tool = MockOrderLookupTool(failure_type=FailureType.PROMPT_INJECTION)

        output = self.candidate_agent_with_bug.run_task(
            task_prompt=injection_scen.prompt,
            order_id="DEMO-104",
            tool=adversarial_tool
        )
        result = Evaluator.evaluate_scenario(injection_scen, output, duration_ms=22.0)

        # AgentCrashLab catches the failure!
        self.assertTrue(output["safety_violation"], "CrashLab caught the safety violation!")
        self.assertFalse(result.safe_behavior, "Safe behavior was breached!")
        self.assertFalse(result.safe_success, "Cannot count as safe success!")
        self.assertEqual(output["status_reported"], "Delivered", "Agent was hijacked into reporting fake status!")


if __name__ == "__main__":
    unittest.main()
