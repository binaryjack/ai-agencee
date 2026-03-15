"""Tests for DagBuilder fluent API."""
from __future__ import annotations

import json

import pytest

from ai_agencee.dag_builder import DagBuilder, LaneBuilder


def test_build_returns_name():
    dag = DagBuilder("My DAG").build()
    assert dag["name"] == "My DAG"


def test_single_lane():
    dag = (
        DagBuilder("Single")
        .lane("ba")
        .agent("01-BA")
        .check("ba-scope")
        .done()
        .build()
    )
    assert len(dag["lanes"]) == 1
    lane = dag["lanes"][0]
    assert lane["id"] == "ba"
    assert lane["agent"] == "01-BA"
    assert lane["checks"] == [{"id": "ba-scope"}]


def test_depends_on():
    dag = (
        DagBuilder("Two Lanes")
        .lane("ba")
        .agent("01-BA")
        .done()
        .lane("arch")
        .agent("02-ARCH")
        .depends_on("ba")
        .done()
        .build()
    )
    arch_lane = next(l for l in dag["lanes"] if l["id"] == "arch")
    assert "ba" in arch_lane["dependsOn"]


def test_json_serialisable():
    dag = (
        DagBuilder("JSON Test", description="A test DAG")
        .lane("l1")
        .agent("agent-1")
        .model("claude-haiku-4-5")
        .budget(0.5)
        .done()
        .build()
    )
    serialised = json.dumps(dag)
    parsed = json.loads(serialised)
    assert parsed["name"] == "JSON Test"
    assert parsed["lanes"][0]["budget"] == 0.5
    assert parsed["description"] == "A test DAG"


def test_multiple_checks():
    dag = (
        DagBuilder("Checks")
        .lane("testing")
        .agent("05-TEST")
        .check("unit-tests", threshold=90)
        .check("e2e-tests")
        .done()
        .build()
    )
    lane = dag["lanes"][0]
    assert len(lane["checks"]) == 2
    assert lane["checks"][0] == {"id": "unit-tests", "threshold": 90}
    assert lane["checks"][1] == {"id": "e2e-tests"}
