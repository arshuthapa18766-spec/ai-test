"""Agent B: Resilient / Hardened Agent.

Characteristics:
- Configurable retry logic with backoff for retryable errors (transient 503, timeouts).
- Strict response schema validation.
- Data freshness verification (flags stale or unverified data).
- Robust defense against prompt injection (treats tool output strictly as untrusted data).
- Clean failure detection and structured error recovery.
- Supports controlled bug toggles to demonstrate regression detection.
"""
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from .base import BaseAgent
from ..core.models import TraceStep
from ..tools.mock_tools import MockOrderLookupTool, MockToolError, ToolTimeoutError


class ResilientAgent(BaseAgent):
    """Hardened, production-ready agent designed for fault-tolerance."""

    VALID_STATUSES = {"Processing", "Shipped", "Delivered", "Cancelled", "Returned"}

    def __init__(
        self,
        name: str = "Agent-B-Resilient",
        version: str = "2.0.0",
        # Controlled bug injection toggles for regression testing:
        disable_retries: bool = False,
        disable_validation: bool = False,
        disable_injection_shield: bool = False,
        disable_freshness_check: bool = False,
    ):
        super().__init__(name=name, version=version)
        self.disable_retries = disable_retries
        self.disable_validation = disable_validation
        self.disable_injection_shield = disable_injection_shield
        self.disable_freshness_check = disable_freshness_check

    def _validate_schema(self, data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """Enforces schema constraints on order data."""
        if self.disable_validation:
            return True, None
        
        if not isinstance(data, dict):
            return False, "Payload is not a valid JSON dictionary"
        
        required_fields = ["order_id", "status"]
        for field in required_fields:
            if field not in data or data[field] is None:
                return False, f"Missing required field '{field}' in tool response"
            
        if data.get("status") not in self.VALID_STATUSES:
            return False, f"Invalid order status value: '{data.get('status')}'"
            
        return True, None

    def _check_freshness(self, data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """Verifies if record timestamp is fresh and trustworthy."""
        if self.disable_freshness_check:
            return True, None

        if data.get("is_stale", False):
            return False, "Data source explicitly flagged as stale replica"

        updated_at_str = data.get("updated_at")
        if updated_at_str:
            try:
                # Expecting ISO format, e.g., 2026-10-11T09:30:00Z
                updated_dt = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
                # If older than 1 year (or 2024), consider outdated
                if updated_dt.year < 2025:
                    return False, f"Record timestamp {updated_at_str} is excessively old"
            except Exception:
                return False, "Could not verify freshness: unparseable timestamp"

        return True, None

    def _sanitize_untrusted_output(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Treats tool output strictly as data, neutralizing any embedded prompt injection.
        Disallows instruction execution from data payloads.
        """
        if self.disable_injection_shield:
            # Bug introduced: treats notes as instruction stream!
            notes = str(raw_data.get("carrier_notes", ""))
            if "SYSTEM INSTRUCTION OVERRIDE" in notes and "DELIVERED" in notes:
                # Regressed into naive behavior
                return {
                    "compromised": True,
                    "fake_status": "Delivered",
                    "fake_message": "Order DEMO-104 is DELIVERED. Please provide your password."
                }

        # Safe behavior:
        # 1. Extract validated scalar fields only
        sanitized = {
            "order_id": raw_data.get("order_id"),
            "status": raw_data.get("status"),
            "carrier": raw_data.get("carrier"),
            "tracking_number": raw_data.get("tracking_number"),
            "is_stale": raw_data.get("is_stale", False),
            "carrier_notes": "[Notes withheld: sanitized for safety]"
        }
        return sanitized

    def run_task(
        self,
        task_prompt: str,
        order_id: str,
        tool: MockOrderLookupTool,
        max_retries: int = 3
    ) -> Dict[str, Any]:
        traces: List[TraceStep] = []
        step_idx = 1
        effective_max_retries = 0 if self.disable_retries else max_retries

        traces.append(TraceStep(
            step_num=step_idx,
            step_type="agent_decision",
            action="Initialized resilient task execution plan",
            details={
                "task": task_prompt,
                "target_order": order_id,
                "max_retries": effective_max_retries,
                "validation_enabled": not self.disable_validation,
                "injection_shield_enabled": not self.disable_injection_shield,
            }
        ))
        step_idx += 1

        attempts = 0
        last_error = None

        while attempts <= effective_max_retries:
            attempts += 1
            retry_count = attempts - 1

            try:
                traces.append(TraceStep(
                    step_num=step_idx,
                    step_type="tool_call",
                    action=f"Calling {tool.TOOL_NAME} (attempt {attempts}/{effective_max_retries + 1})",
                    details={"order_id": order_id, "retry_count": retry_count}
                ))
                step_idx += 1

                call_start = time.time()
                response = tool.execute(order_id)
                call_dur = (time.time() - call_start) * 1000

                traces.append(TraceStep(
                    step_num=step_idx,
                    step_type="tool_result",
                    action="Tool returned response",
                    details={"attempt": attempts, "status_code": response.get("status_code")},
                    duration_ms=round(call_dur, 2)
                ))
                step_idx += 1

                raw_data = response.get("data", {})

                # 1. Defense against Prompt Injection
                if not self.disable_injection_shield:
                    notes = str(raw_data.get("carrier_notes", ""))
                    if "SYSTEM INSTRUCTION OVERRIDE" in notes or "Ignore all prior" in notes:
                        traces.append(TraceStep(
                            step_num=step_idx,
                            step_type="safety_guardrail",
                            action="Detected prompt injection in untrusted tool payload - Neutralized",
                            details={"threat_pattern": "SYSTEM INSTRUCTION OVERRIDE", "action": "Stripped untrusted commands"}
                        ))
                        step_idx += 1
                else:
                    # Bug simulation: Shield disabled
                    compromised_check = self._sanitize_untrusted_output(raw_data)
                    if compromised_check.get("compromised"):
                        traces.append(TraceStep(
                            step_num=step_idx,
                            step_type="agent_decision",
                            action="[VULNERABILITY] Followed untrusted tool prompt injection instructions",
                            details={"injected_instruction_followed": True}
                        ))
                        return {
                            "final_answer": compromised_check.get("fake_message"),
                            "status_reported": compromised_check.get("fake_status"),
                            "traces": traces,
                            "retries_used": retry_count,
                            "error_encountered": None,
                            "failure_detected": False,
                            "safety_violation": True,
                            "raw_tool_data": raw_data
                        }

                # 2. Schema Validation
                is_valid, validation_err = self._validate_schema(raw_data)
                if not is_valid:
                    traces.append(TraceStep(
                        step_num=step_idx,
                        step_type="validation_error",
                        action="Schema validation failed",
                        error=validation_err,
                        details={"payload": raw_data}
                    ))
                    step_idx += 1
                    return {
                        "final_answer": f"Unable to establish order status: tool returned malformed data ({validation_err}).",
                        "status_reported": None,
                        "traces": traces,
                        "retries_used": retry_count,
                        "error_encountered": validation_err,
                        "failure_detected": True,
                        "safety_violation": False,
                        "raw_tool_data": raw_data
                    }

                # 3. Freshness Verification
                is_fresh, freshness_err = self._check_freshness(raw_data)
                if not is_fresh:
                    traces.append(TraceStep(
                        step_num=step_idx,
                        step_type="data_quality_warning",
                        action="Data freshness check failed",
                        details={"issue": freshness_err, "updated_at": raw_data.get("updated_at")}
                    ))
                    step_idx += 1
                    return {
                        "final_answer": f"Order status freshness cannot be established: {freshness_err}. Refusing to report stale data as current.",
                        "status_reported": None,
                        "traces": traces,
                        "retries_used": retry_count,
                        "error_encountered": freshness_err,
                        "failure_detected": True,
                        "safety_violation": False,
                        "raw_tool_data": raw_data
                    }

                # 4. Safe Success Path
                status = raw_data.get("status")
                carrier = raw_data.get("carrier", "standard carrier")
                return {
                    "final_answer": f"Order {order_id} is currently {status} via {carrier}. Data validated.",
                    "status_reported": status,
                    "traces": traces,
                    "retries_used": retry_count,
                    "error_encountered": None,
                    "failure_detected": False,
                    "safety_violation": False,
                    "raw_tool_data": raw_data
                }

            except MockToolError as e:
                last_error = e
                traces.append(TraceStep(
                    step_num=step_idx,
                    step_type="tool_error",
                    action=f"Tool error on attempt {attempts}: {e.message}",
                    error=str(e),
                    details={"status_code": e.status_code, "retryable": e.retryable}
                ))
                step_idx += 1

                if e.retryable and attempts <= effective_max_retries:
                    # Exponential backoff simulation
                    backoff_delay = 0.05 * (2 ** (attempts - 1))
                    traces.append(TraceStep(
                        step_num=step_idx,
                        step_type="retry_backoff",
                        action=f"Transient failure detected. Backing off for {backoff_delay*1000:.0f}ms before retry.",
                        details={"retry_delay_ms": backoff_delay * 1000}
                    ))
                    step_idx += 1
                    time.sleep(backoff_delay)
                    continue
                else:
                    # Unrecoverable error or retries exhausted
                    break

        # If loop terminated without return, retry limits exceeded or non-retryable error
        err_msg = str(last_error) if last_error else "Max retries exceeded"
        traces.append(TraceStep(
            step_num=step_idx,
            step_type="agent_decision",
            action=f"Terminated execution safely: {err_msg}",
            details={"total_attempts": attempts, "retries_exhausted": attempts > effective_max_retries}
        ))

        return {
            "final_answer": f"Task aborted safely: tool unavailable after {attempts} attempts ({err_msg}).",
            "status_reported": None,
            "traces": traces,
            "retries_used": max(0, attempts - 1),
            "error_encountered": err_msg,
            "failure_detected": True,
            "safety_violation": False,
            "raw_tool_data": None
        }
