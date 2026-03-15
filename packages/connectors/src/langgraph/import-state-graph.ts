import type { DagBarrier, DagDefinition, DagLane } from '../dag-types.js'
import type { ImportOptions, StateGraphDefinition } from './types.js'

/** Map common LangGraph node type names to ai-agencee lane roles/capabilities. */
function inferCapabilities(nodeType: string): string[] {
  const t = nodeType.toLowerCase()
  if (t.includes('backend') || t.includes('code') || t.includes('generate')) return ['backend']
  if (t.includes('test') || t.includes('review')) return ['testing']
  if (t.includes('secur') || t.includes('audit')) return ['security']
  if (t.includes('plan') || t.includes('analys') || t.includes('business')) return ['ba']
  if (t.includes('front') || t.includes('ui') || t.includes('component')) return ['frontend']
  return ['backend']
}

/**
 * Convert a LangGraph StateGraph definition into an ai-agencee DagDefinition.
 *
 * Algorithm:
 * 1. Each graph.nodes entry → DagLane
 * 2. graph.edges → lane.dependsOn (target depends on source)
 * 3. conditionalEdges → soft barriers wrapping the branching node
 */
export function importStateGraph(
  graph: StateGraphDefinition,
  options?: ImportOptions,
): DagDefinition {
  const defaultTier = options?.defaultModelTier ?? 'sonnet'

  // Build lanes from nodes
  const lanes: DagLane[] = Object.entries(graph.nodes).map(([nodeId, node]) => ({
    id: nodeId,
    dependsOn: [],
    capabilities: inferCapabilities(String(node.type ?? nodeId)),
    modelTier: defaultTier,
  }))

  const laneMap = new Map<string, DagLane>(lanes.map((l) => [l.id, l]))

  // Wire dependsOn from edges (target depends on source)
  for (const edge of graph.edges) {
    const target = laneMap.get(edge.target)
    if (target && edge.source !== '__start__' && !target.dependsOn.includes(edge.source)) {
      target.dependsOn.push(edge.source)
    }
  }

  // Conditional edges → soft barrier after branching node
  const barriers: DagBarrier[] = []
  for (const ce of graph.conditionalEdges ?? []) {
    const targets = Object.values(ce.targets)
    barriers.push({
      name: `${ce.source}-branch`,
      participants: [ce.source, ...targets],
      mode: 'soft',
    })
    // Wire targets to depend on source
    for (const t of targets) {
      const lane = laneMap.get(t)
      if (lane && !lane.dependsOn.includes(ce.source)) {
        lane.dependsOn.push(ce.source)
      }
    }
  }

  return {
    name: options?.name ?? 'imported-langgraph',
    description: 'Imported from LangGraph StateGraph',
    lanes,
    globalBarriers: barriers,
    capabilityRegistry: {},
  }
}
