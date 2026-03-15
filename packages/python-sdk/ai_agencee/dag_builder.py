"""Fluent Python API for constructing ai-agencee DAG definitions."""
from __future__ import annotations

from typing import Any


class LaneBuilder:
    """Builder for a single lane within a DAG."""

    def __init__(self, lane_id: str, parent: "DagBuilder") -> None:
        self._id = lane_id
        self._parent = parent
        self._data: dict[str, Any] = {
            "id": lane_id,
            "agent": "",
            "checks": [],
            "dependsOn": [],
            "model": None,
            "budget": None,
        }

    def agent(self, agent_id: str) -> "LaneBuilder":
        """Set the agent for this lane."""
        self._data["agent"] = agent_id
        return self

    def model(self, model_id: str) -> "LaneBuilder":
        """Override the model for this lane."""
        self._data["model"] = model_id
        return self

    def budget(self, max_usd: float) -> "LaneBuilder":
        """Set a cost budget (USD) for this lane."""
        self._data["budget"] = max_usd
        return self

    def check(self, check_id: str, **kwargs: Any) -> "LaneBuilder":
        """Add a check to this lane."""
        entry: dict[str, Any] = {"id": check_id, **kwargs}
        self._data["checks"].append(entry)
        return self

    def depends_on(self, *lane_ids: str) -> "LaneBuilder":
        """Declare dependencies on other lanes."""
        self._data["dependsOn"].extend(lane_ids)
        return self

    def done(self) -> "DagBuilder":
        """Return to the parent DagBuilder."""
        return self._parent

    def build(self) -> dict[str, Any]:
        return {k: v for k, v in self._data.items() if v is not None and v != [] and v != ""}


class DagBuilder:
    """Fluent builder for creating ai-agencee DAG definitions.

    Example::

        dag = (
            DagBuilder("My DAG")
            .lane("business-analyst")
              .agent("01-BA")
              .check("ba-scope")
              .done()
            .lane("architecture")
              .agent("02-ARCH")
              .depends_on("business-analyst")
              .done()
            .build()
        )
    """

    def __init__(self, name: str, *, description: str = "") -> None:
        self._name = name
        self._description = description
        self._lanes: list[LaneBuilder] = []
        self._metadata: dict[str, Any] = {}

    def lane(self, lane_id: str) -> LaneBuilder:
        """Add a new lane and return a LaneBuilder."""
        builder = LaneBuilder(lane_id, self)
        self._lanes.append(builder)
        return builder

    def metadata(self, **kwargs: Any) -> "DagBuilder":
        """Set arbitrary top-level metadata."""
        self._metadata.update(kwargs)
        return self

    def build(self) -> dict[str, Any]:
        """Return the DAG as a plain dict (JSON-serialisable)."""
        dag: dict[str, Any] = {
            "name": self._name,
            "lanes": [lane.build() for lane in self._lanes],
        }
        if self._description:
            dag["description"] = self._description
        if self._metadata:
            dag.update(self._metadata)
        return dag
