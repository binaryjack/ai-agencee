import type { DagDefinition } from './dag-types.js'

export interface LintResult {
  code:     string
  severity: 'error' | 'warning' | 'info'
  message:  string
  laneId?:  string
}

/**
 * Detect cycles in a DAG dependency graph using DFS.
 * Returns an array of lane IDs that form a cycle, or empty array if none.
 */
function detectCycles(lanes: DagDefinition['lanes']): string[][] {
  const adj = new Map<string, string[]>()
  for (const lane of lanes) {
    adj.set(lane.id, lane.dependsOn ?? [])
  }

  const visited   = new Set<string>()
  const inStack   = new Set<string>()
  const cycles:   string[][] = []

  function dfs(nodeId: string, path: string[]): void {
    if (inStack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId)
      cycles.push(path.slice(cycleStart))
      return
    }
    if (visited.has(nodeId)) return

    visited.add(nodeId)
    inStack.add(nodeId)
    path.push(nodeId)

    for (const dep of adj.get(nodeId) ?? []) {
      dfs(dep, [...path])
    }

    inStack.delete(nodeId)
  }

  for (const lane of lanes) {
    if (!visited.has(lane.id)) {
      dfs(lane.id, [])
    }
  }

  return cycles
}

export const lintDag = (dag: DagDefinition): LintResult[] => {
  const results: LintResult[] = []
  const laneIds = new Set(dag.lanes.map(l => l.id))

  for (const lane of dag.lanes) {
    // LINT001: lane uses 'opus' model tier with no explicit justification
    const laneAny = lane as unknown as Record<string, unknown>
    if (
      typeof laneAny['modelTier'] === 'string' &&
      (laneAny['modelTier'] as string).includes('opus')
    ) {
      results.push({
        code:    'LINT001',
        severity: 'warning',
        message: `Lane uses opus model tier — ensure this is justified by task complexity`,
        laneId:  lane.id,
      })
    }

    // LINT003: lane has no checks defined
    if (
      !Array.isArray(laneAny['checks']) ||
      (laneAny['checks'] as unknown[]).length === 0
    ) {
      results.push({
        code:    'LINT003',
        severity: 'info',
        message: `Lane has no checks defined — consider adding at least one quality check`,
        laneId:  lane.id,
      })
    }

    // LINT005: dependsOn references non-existent laneId
    for (const dep of lane.dependsOn ?? []) {
      if (!laneIds.has(dep)) {
        results.push({
          code:    'LINT005',
          severity: 'error',
          message: `Lane depends on "${dep}" which does not exist in this DAG`,
          laneId:  lane.id,
        })
      }
    }
  }

  // LINT002: parallel lanes share no barrier
  const lanesWithDeps = dag.lanes.filter(l => (l.dependsOn?.length ?? 0) > 0)
  const lanesWithoutDeps = dag.lanes.filter(l => (l.dependsOn?.length ?? 0) === 0)
  if (lanesWithoutDeps.length > 1 && (dag.globalBarriers?.length ?? 0) === 0) {
    results.push({
      code:    'LINT002',
      severity: 'warning',
      message: `${lanesWithoutDeps.length} parallel lanes share no barrier — results may be uncoordinated`,
    })
  }

  void lanesWithDeps // used for grouping only

  // LINT004: barrier with only 1 lane (not useful as hard barrier)
  for (const barrier of dag.globalBarriers ?? []) {
    if (barrier.participants.length === 1) {
      results.push({
        code:    'LINT004',
        severity: 'warning',
        message: `Barrier "${barrier.name}" has only 1 participant lane — a barrier on a single lane has no synchronization value`,
      })
    }
  }

  // LINT006: circular dependency detected
  const cycles = detectCycles(dag.lanes)
  for (const cycle of cycles) {
    results.push({
      code:    'LINT006',
      severity: 'error',
      message: `Circular dependency detected: ${cycle.join(' → ')} → ${cycle[0]}`,
    })
  }

  // LINT007: no BA lane present
  const hasBALane = dag.lanes.some(l => {
    const laneAny = l as unknown as Record<string, unknown>
    return (
      l.id.includes('business-analyst') ||
      laneAny['role'] === 'business-analyst' ||
      l.agentFile?.includes('business-analyst')
    )
  })
  if (!hasBALane) {
    results.push({
      code:    'LINT007',
      severity: 'info',
      message: `No business-analyst lane present — consider adding one for requirement validation`,
    })
  }

  return results
}
