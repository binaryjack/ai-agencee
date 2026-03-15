"""Async HTTP client for the ai-agencee cloud API."""
from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncIterator, Optional

import httpx

from .models import Run, RunEvent, RunOutcome, RunStatus

try:
    from httpx_sse import aconnect_sse  # type: ignore[import-untyped]
    _HAS_SSE = True
except ImportError:
    _HAS_SSE = False


class AiAgenceeClient:
    """Async client for ai-agencee REST API.

    Usage::

        async with AiAgenceeClient("https://api.example.com", api_key="sk-...") as client:
            run = await client.run_dag("dag-id", inputs={"repo": "my/repo"})
            print(run.outcome.verdict)
    """

    def __init__(
        self,
        base_url: str,
        *,
        api_key: str | None = None,
        tenant_id: str | None = None,
        timeout: float = 60.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        if tenant_id:
            headers["X-Tenant-Id"] = tenant_id
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            headers=headers,
            timeout=timeout,
        )

    # ── Context manager ──────────────────────────────────────────────────────

    async def __aenter__(self) -> "AiAgenceeClient":
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self.close()

    async def close(self) -> None:
        await self._client.aclose()

    # ── Runs ─────────────────────────────────────────────────────────────────

    async def submit_run(
        self,
        dag_id: str,
        inputs: dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Run:
        """Submit a new run for a DAG."""
        body: dict[str, Any] = {"dag_id": dag_id}
        if inputs:
            body["inputs"] = inputs
        if metadata:
            body["metadata"] = metadata
        resp = await self._client.post("/api/runs", json=body)
        resp.raise_for_status()
        return Run.model_validate(resp.json())

    async def get_run(self, run_id: str) -> Run:
        resp = await self._client.get(f"/api/runs/{run_id}")
        resp.raise_for_status()
        return Run.model_validate(resp.json())

    async def list_runs(
        self,
        dag_id: str | None = None,
        status: RunStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Run]:
        params: dict[str, Any] = {"limit": limit, "offset": offset}
        if dag_id:
            params["dag_id"] = dag_id
        if status:
            params["status"] = status.value
        resp = await self._client.get("/api/runs", params=params)
        resp.raise_for_status()
        data = resp.json()
        rows = data if isinstance(data, list) else data.get("rows", [])
        return [Run.model_validate(r) for r in rows]

    async def pause_run(self, run_id: str) -> Run:
        resp = await self._client.post(f"/api/runs/{run_id}/pause")
        resp.raise_for_status()
        return Run.model_validate(resp.json())

    async def resume_run(self, run_id: str) -> Run:
        resp = await self._client.post(f"/api/runs/{run_id}/resume")
        resp.raise_for_status()
        return Run.model_validate(resp.json())

    # ── Outcomes ─────────────────────────────────────────────────────────────

    async def get_outcome(self, run_id: str) -> RunOutcome:
        resp = await self._client.get(f"/api/runs/{run_id}/outcome")
        resp.raise_for_status()
        return RunOutcome.model_validate(resp.json())

    async def record_outcome(
        self, run_id: str, outcome: dict[str, Any]
    ) -> RunOutcome:
        resp = await self._client.post(f"/api/runs/{run_id}/outcome", json=outcome)
        resp.raise_for_status()
        return RunOutcome.model_validate(resp.json())

    # ── Streaming ────────────────────────────────────────────────────────────

    async def stream_run(self, run_id: str) -> AsyncIterator[RunEvent]:
        """Stream live events for a run via SSE.

        Requires ``httpx-sse`` to be installed::

            pip install httpx-sse
        """
        if not _HAS_SSE:
            raise ImportError(
                "httpx-sse is required for stream_run(). "
                "Install it with: pip install httpx-sse"
            )
        url = f"{self._base_url}/api/runs/{run_id}/stream"
        async with aconnect_sse(self._client, "GET", url) as event_source:
            async for sse in event_source.aiter_sse():
                try:
                    raw = json.loads(sse.data)
                    yield RunEvent(type=sse.event or "message", **raw)
                except (json.JSONDecodeError, TypeError):
                    # Skip malformed events
                    continue

    # ── High-level helper ────────────────────────────────────────────────────

    async def run_dag(
        self,
        dag_id: str,
        inputs: dict[str, Any] | None = None,
        poll_interval: float = 2.0,
        timeout: float = 300.0,
    ) -> Run:
        """Submit a run and poll until it reaches a terminal state.

        Returns the final :class:`Run` with outcome populated (if available).
        Raises :class:`TimeoutError` if the run does not complete within
        *timeout* seconds.
        """
        run = await self.submit_run(dag_id, inputs=inputs)
        terminal = {RunStatus.COMPLETED, RunStatus.FAILED, RunStatus.CANCELLED}
        elapsed = 0.0
        while run.status not in terminal:
            if elapsed >= timeout:
                raise TimeoutError(
                    f"Run {run.id} did not complete within {timeout}s "
                    f"(last status: {run.status})"
                )
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval
            run = await self.get_run(run.id)
        return run
