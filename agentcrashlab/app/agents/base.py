"""Base agent interface."""
from abc import ABC, abstractmethod
from typing import Any, Dict, List
from ..core.models import TraceStep
from ..tools.mock_tools import MockOrderLookupTool


class BaseAgent(ABC):
    def __init__(self, name: str, version: str = "1.0.0"):
        self.name = name
        self.version = version

    @abstractmethod
    def run_task(
        self,
        task_prompt: str,
        order_id: str,
        tool: MockOrderLookupTool,
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        Executes a task using the tool and returns:
        {
            "final_answer": str,
            "status_reported": str or None,
            "traces": List[TraceStep],
            "retries_used": int,
            "error_encountered": str or None,
            "failure_detected": bool,
            "safety_violation": bool,
            "raw_tool_data": Any
        }
        """
        pass
