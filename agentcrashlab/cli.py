"""Command Line Interface for AgentCrashLab."""
import argparse
import json
import os
import sys
import unittest

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agentcrashlab.app.core.runner import BenchmarkRunner
from agentcrashlab.app.evaluation.evaluator import RegressionDetector
from agentcrashlab.app.storage.database import Database


def main():
    parser = argparse.ArgumentParser(description="AgentCrashLab — AI Agent Reliability Testing Platform")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Benchmark command
    bench_parser = subparsers.add_parser("benchmark", help="Execute benchmark run")
    bench_parser.add_argument("--agent", choices=["basic", "resilient"], default="resilient", help="Agent architecture to test")
    bench_parser.add_argument("--no-retries", action="store_true", help="Defect: disable retries")
    bench_parser.add_argument("--no-validation", action="store_true", help="Defect: disable schema validation")
    bench_parser.add_argument("--no-shield", action="store_true", help="Defect: disable prompt injection defense shield")
    bench_parser.add_argument("--no-freshness", action="store_true", help="Defect: disable freshness check")

    # Compare command
    comp_parser = subparsers.add_parser("compare", help="Compare baseline vs candidate runs")
    comp_parser.add_argument("--baseline", required=True, help="Baseline Run ID")
    comp_parser.add_argument("--candidate", required=True, help="Candidate Run ID")

    # List runs command
    subparsers.add_parser("list", help="List past evaluation runs")

    # Run tests command
    subparsers.add_parser("test", help="Run automated test suite")

    args = parser.parse_args()
    db = Database()
    runner = BenchmarkRunner(db)

    if args.command == "benchmark":
        print(f"\n[AgentCrashLab] Launching benchmark for Agent: {args.agent.upper()}...")
        summary = runner.run_benchmark(
            agent_type=args.agent,
            disable_retries=args.no_retries,
            disable_validation=args.no_validation,
            disable_injection_shield=args.no_shield,
            disable_freshness_check=args.no_freshness
        )
        print(f"\n================ BENCHMARK REPORT ================")
        print(f"Run ID:                 {summary.run_id}")
        print(f"Agent:                  {summary.agent_name} ({summary.agent_version})")
        print(f"Total Scenarios:        {summary.total_scenarios}")
        print(f"Task Success Rate:      {summary.task_success_rate}% ({summary.successful_tasks}/{summary.total_scenarios})")
        print(f"Safe Successes:         {summary.safe_successes}/{summary.total_scenarios}")
        print(f"Safe Recovery Rate:     {summary.safe_recovery_rate}%")
        print(f"Failure Detection Rate: {summary.failure_detection_rate}%")
        print(f"Avg Latency:            {summary.avg_latency_ms} ms (p50: {summary.p50_latency_ms} ms, p95: {summary.p95_latency_ms} ms)")
        print(f"Total Retries:          {summary.total_retries}")
        print(f"--------------------------------------------------")
        print(f"{'Scenario Name':<35} | {'Safe Success':<12} | {'Retries':<7} | {'Latency'}")
        print(f"--------------------------------------------------")
        for r in summary.results:
            status = "PASSED" if r.safe_success else "FAILED"
            print(f"{r.scenario_name:<35} | {status:<12} | {r.retries_used:<7} | {r.latency_ms:.1f} ms")
        print(f"==================================================\n")

    elif args.command == "compare":
        base_run = db.get_run(args.baseline)
        if not base_run:
            print(f"Error: Baseline run '{args.baseline}' not found.")
            sys.exit(1)
        cand_run = db.get_run(args.candidate)
        if not cand_run:
            print(f"Error: Candidate run '{args.candidate}' not found.")
            sys.exit(1)

        report = RegressionDetector.compare_runs(base_run, cand_run)
        print(f"\n================ REGRESSION REPORT ================")
        print(f"Baseline: {base_run.agent_name} ({base_run.run_id})")
        print(f"Candidate: {cand_run.agent_name} ({cand_run.run_id})")
        print(f"Verdict:   {report.summary_verdict}")
        print(f"Regressions: {report.regression_count} | Improvements: {report.improvements_count}")
        print(f"Deltas:    {json.dumps(report.metric_deltas, indent=2)}")
        if report.regressed_scenarios:
            print(f"\nRegressed Scenarios:")
            for diff in report.regressed_scenarios:
                print(f"  - [{diff.scenario_id}] {diff.scenario_name}")
                print(f"    Cause: {diff.root_cause}")
        print(f"==================================================\n")

    elif args.command == "list":
        runs = db.list_runs(20)
        print(f"\nPast Evaluation Runs ({len(runs)} found):")
        for r in runs:
            print(f"  [{r['run_id']}] {r['agent_name']} - Success: {r['task_success_rate']}% | Safe Rec: {r['safe_recovery_rate']}% | Date: {r['timestamp']}")

    elif args.command == "test":
        suite = unittest.defaultTestLoader.discover("agentcrashlab/tests", pattern="test_*.py")
        runner = unittest.TextTestRunner(verbosity=2)
        result = runner.run(suite)
        sys.exit(0 if result.wasSuccessful() else 1)

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
