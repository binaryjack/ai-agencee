import type { DagBarrier, DagDefinition, DagLane } from '../dag-types.js'
import type { SkPlanDefinition, SkStep } from './types.js'

/**
 * Convert a Semantic Kernel Planner v1 JSON output into an ai-agencee DagDefinition.
 *
 * Algorithm:
 * 1. Group steps by plugin → one lane per plugin
 * 2. Sequential steps within plugin → linear dependsOn chain
 * 3. When a step sets a context variable that another step uses as input
 *    → insert a barrier between the producing and consuming plugin lanes
 */
export function importSkPlan(plan: SkPlanDefinition): DagDefinition {
  // Group steps by plugin
  const pluginSteps = new Map<string, SkStep[]>()
  for (const step of plan.steps) {
    const existing = pluginSteps.get(step.plugin) ?? []
    existing.push(step)
    pluginSteps.set(step.plugin, existing)
  }

  // Build lanes from plugins
  const lanes: DagLane[] = []
  for (const [pluginId] of pluginSteps) {
    lanes.push({
      id: pluginId.replace(/\s+/g, '-').toLowerCase(),
      dependsOn: [],
      capabilities: ['backend'],
      modelTier: 'sonnet' as const,
    })
  }

  const laneIdMap = new Map<string, string>()
  for (const [pluginId, lane] of [...pluginSteps.keys()].map((k, i) => [k, lanes[i]] as const)) {
    laneIdMap.set(pluginId, lane.id)
  }

  // Detect shared context variables to insert barriers
  const producerOf = new Map<string, string>() // varName → laneId
  const consumers = new Map<string, string[]>() // laneId → varNames consumed

  for (const [pluginId, steps] of pluginSteps) {
    const laneId = laneIdMap.get(pluginId)!
    for (const step of steps) {
      if (step.setContextVariable) {
        producerOf.set(step.setContextVariable, laneId)
      }
      if (step.input) {
        for (const val of Object.values(step.input)) {
          if (val.startsWith('$')) {
            const varName = val.slice(1)
            const c = consumers.get(laneId) ?? []
            c.push(varName)
            consumers.set(laneId, c)
          }
        }
      }
    }
  }

  // Wire dependsOn for context-variable sharing
  const barriers: DagBarrier[] = []
  const laneMap = new Map<string, DagLane>(lanes.map((l) => [l.id, l]))

  for (const [consumerLaneId, varNames] of consumers) {
    for (const varName of varNames) {
      const producerLaneId = producerOf.get(varName)
      if (producerLaneId && producerLaneId !== consumerLaneId) {
        const consumerLane = laneMap.get(consumerLaneId)
        if (consumerLane && !consumerLane.dependsOn.includes(producerLaneId)) {
          consumerLane.dependsOn.push(producerLaneId)
          barriers.push({
            name: `${producerLaneId}-to-${consumerLaneId}`,
            participants: [producerLaneId, consumerLaneId],
            mode: 'soft',
          })
        }
      }
    }
  }

  return {
    name: 'imported-sk-plan',
    description: 'Imported from Semantic Kernel Planner output',
    lanes,
    globalBarriers: barriers,
    capabilityRegistry: {},
  }
}
