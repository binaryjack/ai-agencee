import type { DagDefinition } from './dag-definition.types.js';
import type { GraphEdge } from './graph-edge.types.js';
import type { GraphNode } from './graph-node.types.js';
import { normId } from './norm-id.js';

export function parseDag(dag: DagDefinition): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  let barrierIdx = 0;

  const addNode = (id: string, label: string, isBarrier: boolean): void => {
    if (!seen.has(id)) {
      seen.add(id);
      nodes.push({ id, label, isBarrier });
    }
  };

  if (Array.isArray(dag.steps) && dag.steps.length > 0) {
    let lastNonBarrierId: string | null = null;

    for (const step of dag.steps) {
      if (step.barrier) {
        const barrierId = `BARRIER_${barrierIdx++}`;
        addNode(barrierId, '── barrier ──', true);
        if (lastNonBarrierId) {
          edges.push({ from: lastNonBarrierId, to: barrierId });
        }
        lastNonBarrierId = barrierId;
        continue;
      }

      const rawId = step.id ?? step.lane ?? step.agent ?? `step_${nodes.length}`;
      const nodeId = normId(rawId);
      const label = step.agent ?? step.lane ?? rawId;
      addNode(nodeId, label, false);

      if (Array.isArray(step.dependsOn) && step.dependsOn.length > 0) {
        for (const dep of step.dependsOn) {
          edges.push({ from: normId(dep), to: nodeId });
        }
      } else if (lastNonBarrierId) {
        edges.push({ from: lastNonBarrierId, to: nodeId });
      }

      lastNonBarrierId = nodeId;
    }
    return { nodes, edges };
  }

  if (Array.isArray(dag.lanes)) {
    for (const lane of dag.lanes) {
      const nodeId = normId(lane.id);
      addNode(nodeId, lane.agent ?? lane.id, false);
      if (Array.isArray(lane.dependsOn)) {
        for (const dep of lane.dependsOn) {
          edges.push({ from: normId(dep), to: nodeId });
        }
      }
    }
  }

  if (Array.isArray(dag.barriers)) {
    for (const barrier of dag.barriers) {
      const barrierId = `BARRIER_${barrierIdx++}`;
      addNode(barrierId, '── barrier ──', true);
      const afters = Array.isArray(barrier.after) ? barrier.after : [];
      for (const after of afters) {
        edges.push({ from: normId(after), to: barrierId });
      }
    }
  }

  if (nodes.length === 0 && Array.isArray(dag as unknown)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arr = dag as unknown as any[];
    for (const item of arr) {
      if (typeof item === 'object' && item !== null) {
        const rawId = item.id ?? item.lane ?? item.agent ?? `node_${nodes.length}`;
        const nodeId = normId(String(rawId));
        addNode(nodeId, String(item.agent ?? item.lane ?? rawId), false);
      }
    }
  }

  return { nodes, edges };
}
