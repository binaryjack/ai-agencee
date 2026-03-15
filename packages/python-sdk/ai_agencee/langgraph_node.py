"""LangGraph integration for ai-agencee.

Provides a pre-built node function and optional subgraph that can be
wired into a ``StateGraph``.

Install optional dependency::

    pip install ai-agencee[langgraph]
"""
from __future__ import annotations

from typing import Any, TypedDict

try:
    from langgraph.graph import StateGraph, END  # type: ignore[import-untyped]
    _HAS_LANGGRAPH = True
except ImportError:
    _HAS_LANGGRAPH = False

from .client import AiAgenceeClient
from .models import RunStatus


class DagNodeState(TypedDict, total=False):
    """Minimal state schema for the ai-agencee DAG node."""

    dag_id: str
    dag_inputs: dict[str, Any]
    dag_run_id: str
    dag_verdict: str
    dag_summary: str
    dag_error: str


def create_dag_node(
    client: AiAgenceeClient,
    dag_id: str,
    *,
    poll_interval: float = 2.0,
    timeout: float = 300.0,
) -> Any:
    """Return an async LangGraph node function that runs *dag_id*.

    The node reads ``dag_inputs`` from state and writes back
    ``dag_run_id``, ``dag_verdict``, ``dag_summary``, and (on error)
    ``dag_error``.

    Usage::

        from langgraph.graph import StateGraph, END
        from ai_agencee import AiAgenceeClient, create_dag_node

        client = AiAgenceeClient("https://api.example.com", api_key="sk-...")
        node = create_dag_node(client, "code-review-dag")

        graph = StateGraph(dict)
        graph.add_node("run_dag", node)
        graph.add_edge("run_dag", END)
    """

    async def _dag_node(state: dict[str, Any]) -> dict[str, Any]:
        inputs = state.get("dag_inputs") or {}
        try:
            run = await client.run_dag(
                dag_id,
                inputs=inputs,
                poll_interval=poll_interval,
                timeout=timeout,
            )
        except Exception as exc:  # pylint: disable=broad-except
            return {"dag_error": str(exc)}

        updates: dict[str, Any] = {"dag_run_id": run.id}
        if run.outcome:
            updates["dag_verdict"] = run.outcome.verdict
            updates["dag_summary"] = run.outcome.summary
        return updates

    return _dag_node


class AiAgenceeSubgraph:
    """Convenience wrapper that builds a single-node StateGraph for a DAG.

    Requires ``langgraph`` to be installed::

        pip install ai-agencee[langgraph]

    Usage::

        subgraph = AiAgenceeSubgraph(client, "code-review-dag")
        app = subgraph.compile()
        result = await app.ainvoke({"dag_inputs": {"repo": "acme/app"}})
    """

    def __init__(
        self,
        client: AiAgenceeClient,
        dag_id: str,
        *,
        poll_interval: float = 2.0,
        timeout: float = 300.0,
    ) -> None:
        if not _HAS_LANGGRAPH:
            raise ImportError(
                "langgraph is required for AiAgenceeSubgraph. "
                "Install it with: pip install ai-agencee[langgraph]"
            )
        self._client = client
        self._dag_id = dag_id
        self._poll_interval = poll_interval
        self._timeout = timeout

    def compile(self) -> Any:
        """Build and compile the single-node subgraph."""
        node = create_dag_node(
            self._client,
            self._dag_id,
            poll_interval=self._poll_interval,
            timeout=self._timeout,
        )
        g: StateGraph = StateGraph(dict)
        g.add_node("run_dag", node)
        g.set_entry_point("run_dag")
        g.add_edge("run_dag", END)
        return g.compile()
