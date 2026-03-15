# Feature 34: Python SDK — Async + LangChain (IP-06)

> **Status**: ✅ Production-ready  
> **Category**: Developer Experience — IP Series  
> **ID**: IP-06  
> **Package**: `packages/python-sdk`

---

## Overview

A fully async Python SDK that lets you run ai-agencee DAGs from any Python AI framework. Includes a native LangChain `BaseTool` adapter and a LangGraph node adapter so DAG runs compose naturally into chain-of-thought and graph-based agent workflows.

---

## Installation

```bash
pip install ai-agencee
# or with LangChain extras
pip install "ai-agencee[langchain]"
```

---

## AiAgenceeClient

```python
from ai_agencee import AiAgenceeClient

async with AiAgenceeClient(base_url="https://api.example.com", token="...") as client:
    run = await client.run_dag(
        dag_file="agents/pr-description.agent.json",
        inputs={"pr_number": 42, "repo": "org/repo"},
    )
    print(run.status, run.cost_usd)

    # Pause and resume
    await client.pause(run.id)
    await client.resume(run.id)
```

---

## LangChain Tool

```python
from ai_agencee.langchain import LangChainDagTool

tool = LangChainDagTool(
    dag_file="agents/security-review.agent.json",
    client=client,
    description="Run a full OWASP security audit on a repository",
)

# Use in any LangChain agent or chain
from langchain.agents import initialize_agent
agent = initialize_agent([tool], llm, agent="zero-shot-react-description")
result = agent.run("Audit the repo at /path/to/project")
```

---

## LangGraph Node

```python
from ai_agencee.langgraph import LangGraphDagNode
from langgraph.graph import StateGraph

node = LangGraphDagNode(
    dag_file="agents/documentation.agent.json",
    client=client,
)

graph = StateGraph(...)
graph.add_node("generate_docs", node)
```

---

## Type-Safe DAG Builder

```python
from ai_agencee.builder import DagBuilder

dag = (
    DagBuilder(name="PR Review")
    .lane("security-scan", agent_file="agents/security-review.agent.json")
    .lane("pr-desc", agent_file="agents/pr-description.agent.json", depends_on=["security-scan"])
    .build()
)

run = await client.run_dag_definition(dag)
```

---

## pytest Fixtures

```python
# conftest.py
from ai_agencee.testing import mock_client

@pytest.fixture
def client(mock_client):
    return mock_client  # Returns a hermetic client with MockProvider
```

---

## Key Components

| Component | Location |
|-----------|----------|
| `AiAgenceeClient` | `packages/python-sdk/ai_agencee/client.py` |
| `LangChainDagTool` | `packages/python-sdk/ai_agencee/langchain.py` |
| `LangGraphDagNode` | `packages/python-sdk/ai_agencee/langgraph.py` |
| `DagBuilder` | `packages/python-sdk/ai_agencee/builder.py` |
| pytest fixtures | `packages/python-sdk/ai_agencee/testing.py` |
