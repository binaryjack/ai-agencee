"""Tests for the ai-agencee Python SDK."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from ai_agencee import AiAgenceeError, CliNotFoundError, list_agents, run_dag


# ─── Fixtures ─────────────────────────────────────────────────────────────────


SUCCESS_PAYLOAD = {
    "status": "success",
    "runId": "run-abc-123",
    "dagName": "Demo DAG",
    "totalDurationMs": 4200,
    "lanes": [],
    "findings": ["No critical issues found"],
    "recommendations": ["Consider adding more tests"],
    "cost": {"totalUSD": 0.012},
}


def _make_completed_process(payload: object, returncode: int = 0) -> MagicMock:
    """Return a fake CompletedProcess-like mock."""
    proc = MagicMock(spec=subprocess.CompletedProcess)
    proc.returncode = returncode
    proc.stdout = json.dumps(payload) + "\n"
    proc.stderr = ""
    return proc


# ─── run_dag ─────────────────────────────────────────────────────────────────


class TestRunDag:
    def test_returns_parsed_json(self, tmp_path: Path) -> None:
        with patch("subprocess.run", return_value=_make_completed_process(SUCCESS_PAYLOAD)):
            result = run_dag("agents/dag.json", project_root=tmp_path)
        assert result["status"] == "success"
        assert result["runId"] == "run-abc-123"

    def test_passes_budget_flag(self, tmp_path: Path) -> None:
        with patch("subprocess.run", return_value=_make_completed_process(SUCCESS_PAYLOAD)) as mock_run:
            run_dag("agents/dag.json", project_root=tmp_path, budget_usd=1.50)
        cmd = mock_run.call_args[0][0]
        assert "--budget" in cmd
        assert "1.5" in cmd

    def test_passes_provider_flag(self, tmp_path: Path) -> None:
        with patch("subprocess.run", return_value=_make_completed_process(SUCCESS_PAYLOAD)) as mock_run:
            run_dag("agents/dag.json", project_root=tmp_path, provider="mock")
        cmd = mock_run.call_args[0][0]
        assert "--provider" in cmd
        assert "mock" in cmd

    def test_tenant_id_sets_env(self, tmp_path: Path) -> None:
        with patch("subprocess.run", return_value=_make_completed_process(SUCCESS_PAYLOAD)) as mock_run:
            run_dag("agents/dag.json", project_root=tmp_path, tenant_id="acme")
        kwargs = mock_run.call_args[1]
        assert kwargs["env"]["AIKIT_TENANT_ID"] == "acme"

    def test_raises_ai_agencee_error_on_failure(self, tmp_path: Path) -> None:
        failed = _make_completed_process({}, returncode=1)
        failed.stderr = "DAG validation failed"
        with patch("subprocess.run", return_value=failed):
            with pytest.raises(AiAgenceeError) as exc_info:
                run_dag("bad.json", project_root=tmp_path)
        assert exc_info.value.returncode == 1

    def test_raises_cli_not_found_when_file_not_found(self, tmp_path: Path) -> None:
        with patch("subprocess.run", side_effect=FileNotFoundError):
            with pytest.raises(CliNotFoundError):
                run_dag("agents/dag.json", project_root=tmp_path)

    def test_raises_on_timeout(self, tmp_path: Path) -> None:
        with patch("subprocess.run", side_effect=subprocess.TimeoutExpired(cmd="ai-kit", timeout=1)):
            with pytest.raises(AiAgenceeError, match="timed out"):
                run_dag("agents/dag.json", project_root=tmp_path, timeout=1)

    def test_handles_noisy_stdout_with_progress_lines(self, tmp_path: Path) -> None:
        """SDK should find the JSON even if progress text precedes it."""
        noisy_proc = MagicMock(spec=subprocess.CompletedProcess)
        noisy_proc.returncode = 0
        noisy_proc.stdout = "Starting...\nRunning lane 1...\n" + json.dumps(SUCCESS_PAYLOAD)
        noisy_proc.stderr = ""
        with patch("subprocess.run", return_value=noisy_proc):
            result = run_dag("agents/dag.json", project_root=tmp_path)
        assert result["status"] == "success"


# ─── list_agents ─────────────────────────────────────────────────────────────


class TestListAgents:
    def test_returns_list(self, tmp_path: Path) -> None:
        agents = [
            {"name": "security-review", "description": "Reviews code for vulnerabilities"},
            {"name": "business-analyst", "description": "Analyses requirements"},
        ]
        with patch("subprocess.run", return_value=_make_completed_process(agents)):
            result = list_agents(project_root=tmp_path)
        assert len(result) == 2
        assert result[0]["name"] == "security-review"

    def test_always_appends_json_flag(self, tmp_path: Path) -> None:
        with patch("subprocess.run", return_value=_make_completed_process([])) as mock_run:
            list_agents(project_root=tmp_path)
        cmd = mock_run.call_args[0][0]
        assert "--json" in cmd
