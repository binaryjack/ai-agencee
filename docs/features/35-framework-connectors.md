# Feature 35: Framework Connectors (IP-07)

> **Status**: ✅ Production-ready  
> **Category**: Developer Experience — IP Series  
> **ID**: IP-07  
> **Package**: `packages/connectors` (v0.1.0)

---

## Overview

Bidirectional adapters between the ai-agencee DAG format and four leading AI frameworks: LangGraph, CrewAI, AutoGen, and Semantic Kernel. Import external agent graphs to get ai-agencee orchestration, observability, and cost controls. Export DAG lanes to use them natively inside a framework's own execution model.

---

## Supported Frameworks

| Framework | Import (to DAG) | Export (from DAG) |
|-----------|----------------|-------------------|
| LangGraph | ✅ Compiled graph → DAG JSON | ✅ DAG lane → LangGraph node |
| CrewAI | ✅ Crew + Tasks → DAG JSON | ✅ DAG lane → CrewAI Task |
| AutoGen | ✅ GroupChat → multi-lane DAG | ✅ DAG lane → AutoGen AssistantAgent wrapper |
| Semantic Kernel | ✅ Planner plan → DAG lanes | ✅ DAG lane → SK Plugin/Function |

---

## LangGraph

```typescript
import { importLangGraphToDag, exportDagToLangGraph } from '@ai-agencee/connectors/langgraph'

// Import: compiled LangGraph → DAG JSON
const dag = importLangGraphToDag(compiledGraph)

// Export: DAG lane → LangGraph node
const node = exportDagToLangGraph(dag, 'security-scan')
graph.addNode('security-scan', node)
```

---

## CrewAI

```python
from ai_agencee.connectors.crewai import import_crew_to_dag, export_dag_to_crew_task

# Import
dag = import_crew_to_dag(my_crew)

# Export
task = export_dag_to_crew_task(dag, lane_id='pr-description')
```

---

## AutoGen

```python
from ai_agencee.connectors.autogen import import_groupchat_to_dag

dag = import_groupchat_to_dag(group_chat)
# Produces one DAG lane per AutoGen agent in the GroupChat
```

---

## Semantic Kernel

```csharp
// Import: SK sequential planner → DAG
var dag = SkConnector.ImportPlanToDag(plan);

// Export: DAG lane → SK plugin
var plugin = SkConnector.ExportDagToPlugin(dag, "security-scan");
kernel.ImportPluginFromObject(plugin, "SecurityScan");
```

---

## Preserved Semantics

Regardless of direction, connectors preserve:
- Supervisor checkpoint contracts
- Barrier synchronization points
- RBAC principal tagging on executions
- Cost attribution metadata
- Retry budgets (mapped to framework equivalents where supported)

---

## Key Components

| Component | Location |
|-----------|----------|
| LangGraph adapter | `packages/connectors/src/langgraph/` |
| CrewAI adapter | `packages/connectors/src/crewai/` |
| AutoGen adapter | `packages/connectors/src/autogen/` |
| Semantic Kernel adapter | `packages/connectors/src/semantic-kernel/` |
| Shared schema mapper | `packages/connectors/src/schema-mapper.ts` |
