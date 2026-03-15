"""Tests for AiAgenceeClient using httpx MockTransport."""
from __future__ import annotations

import json
from typing import Any

import pytest
import httpx

from ai_agencee.client import AiAgenceeClient
from ai_agencee.models import Run, RunOutcome, RunStatus


def _make_run(
    run_id: str = "run-1",
    dag_id: str = "dag-1",
    status: str = "pending",
    outcome: dict[str, Any] | None = None,
) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": run_id,
        "dag_id": dag_id,
        "status": status,
        "tenant_id": "t1",
        "metadata": {},
    }
    if outcome:
        data["outcome"] = outcome
    return data


class _MockTransport(httpx.MockTransport):
    """Simple route-matching mock transport."""

    def __init__(self, routes: dict[str, Any]) -> None:
        self._routes = routes

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        key = f"{request.method} {request.url.path}"
        # Support query-stripped keys
        base_key = key.split("?")[0]
        handler = self._routes.get(key) or self._routes.get(base_key)
        if handler is None:
            return httpx.Response(404, json={"error": "not found"})
        if callable(handler):
            return handler(request)
        return handler


def _json_resp(data: Any, status: int = 200) -> httpx.Response:
    return httpx.Response(status, json=data)


@pytest.mark.asyncio
async def test_submit_run_returns_run():
    run_data = _make_run(status="pending")
    transport = _MockTransport({"POST /api/runs": _json_resp(run_data)})
    async with httpx.AsyncClient(
        base_url="http://test", transport=transport
    ) as http_client:
        client = AiAgenceeClient.__new__(AiAgenceeClient)
        client._base_url = "http://test"
        client._client = http_client
        run = await client.submit_run("dag-1", inputs={"repo": "acme/app"})

    assert isinstance(run, Run)
    assert run.id == "run-1"
    assert run.status == RunStatus.PENDING


@pytest.mark.asyncio
async def test_get_run_parses_status():
    run_data = _make_run(status="running")
    transport = _MockTransport({"GET /api/runs/run-1": _json_resp(run_data)})
    async with httpx.AsyncClient(
        base_url="http://test", transport=transport
    ) as http_client:
        client = AiAgenceeClient.__new__(AiAgenceeClient)
        client._base_url = "http://test"
        client._client = http_client
        run = await client.get_run("run-1")

    assert run.status == RunStatus.RUNNING


@pytest.mark.asyncio
async def test_list_runs_returns_list():
    rows = [_make_run("r1"), _make_run("r2")]
    transport = _MockTransport({"GET /api/runs": _json_resp({"rows": rows})})
    async with httpx.AsyncClient(
        base_url="http://test", transport=transport
    ) as http_client:
        client = AiAgenceeClient.__new__(AiAgenceeClient)
        client._base_url = "http://test"
        client._client = http_client
        runs = await client.list_runs()

    assert len(runs) == 2
    assert all(isinstance(r, Run) for r in runs)


@pytest.mark.asyncio
async def test_get_outcome_returns_outcome():
    outcome_data = {
        "verdict": "pass",
        "summary": "All checks passed",
        "details": {},
    }
    transport = _MockTransport(
        {"GET /api/runs/run-1/outcome": _json_resp(outcome_data)}
    )
    async with httpx.AsyncClient(
        base_url="http://test", transport=transport
    ) as http_client:
        client = AiAgenceeClient.__new__(AiAgenceeClient)
        client._base_url = "http://test"
        client._client = http_client
        outcome = await client.get_outcome("run-1")

    assert isinstance(outcome, RunOutcome)
    assert outcome.verdict == "pass"


@pytest.mark.asyncio
async def test_pause_run():
    paused = _make_run(status="paused")
    transport = _MockTransport({"POST /api/runs/run-1/pause": _json_resp(paused)})
    async with httpx.AsyncClient(
        base_url="http://test", transport=transport
    ) as http_client:
        client = AiAgenceeClient.__new__(AiAgenceeClient)
        client._base_url = "http://test"
        client._client = http_client
        run = await client.pause_run("run-1")

    assert run.status == RunStatus.PAUSED


@pytest.mark.asyncio
async def test_resume_run():
    resumed = _make_run(status="running")
    transport = _MockTransport({"POST /api/runs/run-1/resume": _json_resp(resumed)})
    async with httpx.AsyncClient(
        base_url="http://test", transport=transport
    ) as http_client:
        client = AiAgenceeClient.__new__(AiAgenceeClient)
        client._base_url = "http://test"
        client._client = http_client
        run = await client.resume_run("run-1")

    assert run.status == RunStatus.RUNNING


@pytest.mark.asyncio
async def test_run_dag_polls_to_completion():
    """run_dag() should poll until terminal state."""
    call_count = 0

    def _get_run(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        status = "running" if call_count < 3 else "completed"
        data = _make_run(
            status=status,
            outcome={"verdict": "pass", "summary": "ok", "details": {}}
            if status == "completed"
            else None,
        )
        return _json_resp(data)

    transport = _MockTransport(
        {
            "POST /api/runs": _json_resp(_make_run(status="pending")),
            "GET /api/runs/run-1": _get_run,
        }
    )
    async with httpx.AsyncClient(
        base_url="http://test", transport=transport
    ) as http_client:
        client = AiAgenceeClient.__new__(AiAgenceeClient)
        client._base_url = "http://test"
        client._client = http_client
        run = await client.run_dag("dag-1", poll_interval=0.01)

    assert run.status == RunStatus.COMPLETED
    assert run.outcome is not None
    assert run.outcome.verdict == "pass"
    assert call_count >= 3
