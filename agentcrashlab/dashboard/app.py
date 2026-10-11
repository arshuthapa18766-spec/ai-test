"""Streamlit Dashboard for AgentCrashLab."""
import json
import streamlit as st
import pandas as pd
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from agentcrashlab.app.storage.database import Database
from agentcrashlab.app.core.runner import BenchmarkRunner
from agentcrashlab.app.evaluation.evaluator import RegressionDetector

st.set_page_config(page_title="AgentCrashLab Dashboard", page_icon="🧪", layout="wide")

db = Database()
runner = BenchmarkRunner(db)

st.title("🧪 AgentCrashLab — AI Agent Reliability Testing Platform")
st.caption("Stress-testing AI agent resilience against tool failures, timeouts, corrupted schemas, and prompt injection.")

# Sidebar: Actions & Run Launcher
with st.sidebar:
    st.header("⚡ Run Benchmark")
    agent_choice = st.selectbox("Agent Architecture", ["Resilient (Agent B)", "Basic Naive (Agent A)"])
    
    st.subheader("Controlled Bug Injection")
    st.caption("Introduce defects to test regression detection:")
    dis_retries = st.checkbox("Disable Retries (on 503/Timeout)")
    dis_val = st.checkbox("Disable Schema Validation")
    dis_shield = st.checkbox("Disable Prompt Injection Shield")
    dis_fresh = st.checkbox("Disable Freshness Check")
    
    if st.button("🚀 Launch Benchmark Run", type="primary", use_container_width=True):
        with st.spinner("Running 7 chaos test scenarios..."):
            is_basic = "Basic" in agent_choice
            summary = runner.run_benchmark(
                agent_type="basic" if is_basic else "resilient",
                disable_retries=dis_retries,
                disable_validation=dis_val,
                disable_injection_shield=dis_shield,
                disable_freshness_check=dis_fresh
            )
            st.success(f"Run completed! ID: {summary.run_id}")
            st.rerun()

# Fetch recent runs
runs = db.list_runs(30)
if not runs:
    st.info("No runs found in database. Click 'Launch Benchmark Run' in sidebar to execute your first evaluation.")
    st.stop()

# Run Selector
run_options = {f"{r['agent_name']} — {r['timestamp'][:19]} ({r['run_id'][:12]})": r['run_id'] for r in runs}
selected_run_label = st.selectbox("Select Evaluation Run to Inspect:", list(run_options.keys()))
selected_run_id = run_options[selected_run_label]
run_data = db.get_run(selected_run_id)

if run_data:
    # Top-Level Metrics Bar
    col1, col2, col3, col4, col5 = st.columns(5)
    with col1:
        st.metric("Task Success Rate", f"{run_data.task_success_rate}%", f"{run_data.successful_tasks}/{run_data.total_scenarios} tasks")
    with col2:
        st.metric("Safe Recovery Rate", f"{run_data.safe_recovery_rate}%", "Recoverable faults")
    with col3:
        st.metric("Failure Detection", f"{run_data.failure_detection_rate}%", "Unrecoverable faults")
    with col4:
        st.metric("Latency (p50 / avg)", f"{run_data.p50_latency_ms}ms", f"avg {run_data.avg_latency_ms}ms")
    with col5:
        st.metric("Total Retries", run_data.total_retries, "Budget compliance")

    # Tabs for in-depth inspection
    tab_scenarios, tab_compare, tab_traces, tab_analytics = st.tabs(["📋 Scenarios Matrix", "⚖️ Baseline vs Candidate Comparison", "🔍 Execution Traces", "📊 Distributions & Latency"])

    with tab_scenarios:
        st.subheader("Scenario-by-Scenario Evaluation")
        table_rows = []
        for r in run_data.results:
            table_rows.append({
                "Scenario": r.scenario_name,
                "Failure Injected": r.failure_type,
                "Recoverable": "Yes" if r.is_recoverable else "No",
                "Task Success": "✅ Passed" if r.task_success else "❌ Failed",
                "Safe Behavior": "🛡️ Preserved" if r.safe_behavior else "⚠️ COMPROMISED",
                "Safe Success": "🟢 PASS" if r.safe_success else "🔴 FAIL",
                "Retries Used": r.retries_used,
                "Latency (ms)": r.latency_ms
            })
        st.dataframe(pd.DataFrame(table_rows), use_container_width=True)

    with tab_compare:
        st.subheader("Regression Detection Engine")
        st.caption("Compare this run against a baseline to identify regressions in reliability, security, or latency.")
        other_run_options = [k for k in run_options.keys() if run_options[k] != selected_run_id]
        if other_run_options:
            base_label = st.selectbox("Select Baseline Run:", other_run_options)
            baseline_id = run_options[base_label]
            base_data = db.get_run(baseline_id)
            if base_data:
                report = RegressionDetector.compare_runs(base_data, run_data)
                
                if report.is_regressed:
                    st.error(f"🚨 **{report.summary_verdict}**")
                    for diff in report.regressed_scenarios:
                        st.warning(f"**Regression in {diff.scenario_name}** ({diff.scenario_id})\n\nRoot Cause: {diff.root_cause}")
                else:
                    st.success(f"✅ **{report.summary_verdict}**")

                col_d1, col_d2, col_d3 = st.columns(3)
                col_d1.metric("Task Success Rate Δ", f"{report.metric_deltas.get('task_success_rate_delta', 0):+}%")
                col_d2.metric("Safe Recovery Δ", f"{report.metric_deltas.get('safe_recovery_rate_delta', 0):+}%")
                col_d3.metric("Latency p50 Δ", f"{report.metric_deltas.get('latency_p50_delta_ms', 0):+}ms")
        else:
            st.info("Execute another run with different options to unlock baseline-candidate regression diffs.")

    with tab_traces:
        st.subheader("Step-by-Step Execution Traces")
        scen_selected = st.selectbox("Inspect Scenario Trace:", [r.scenario_name for r in run_data.results])
        scen_res = next((r for r in run_data.results if r.scenario_name == scen_selected), None)
        
        if scen_res:
            st.markdown(f"**Final Answer:** `{scen_res.final_output}`")
            if scen_res.error_message:
                st.info(f"**Recorded Error:** `{scen_res.error_message}`")

            st.write("### Thought & Action Steps:")
            for trace in scen_res.traces:
                with st.expander(f"Step {trace.step_num}: [{trace.step_type.upper()}] {trace.action} ({trace.duration_ms}ms)"):
                    st.json(trace.details)
                    if trace.error:
                        st.error(f"Error: {trace.error}")

    with tab_analytics:
        st.subheader("Failure Type Distribution & Latencies")
        df_res = pd.DataFrame([{
            "Scenario": r.scenario_name,
            "Latency": r.latency_ms,
            "Retries": r.retries_used,
            "Type": r.failure_type
        } for r in run_data.results])
        st.bar_chart(df_res.set_index("Scenario")["Latency"])
