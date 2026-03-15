import type { DagDefinition, DagLane } from '../dag-types.js'
import type { CrewDefinition } from './types.js'

/** Map CrewAI agent role strings to capability tags. */
function inferCapabilities(role: string): string[] {
  const r = role.toLowerCase()
  if (r.includes('research') || r.includes('analys') || r.includes('business')) return ['ba']
  if (r.includes('develop') || r.includes('backend') || r.includes('engineer')) return ['backend']
  if (r.includes('test') || r.includes('qa')) return ['testing']
  if (r.includes('secur') || r.includes('audit')) return ['security']
  if (r.includes('front') || r.includes('ui') || r.includes('design')) return ['frontend']
  return ['backend']
}

/** Map LLM model name to ai-agencee model tier. */
function mapModelTier(llm?: string): 'haiku' | 'sonnet' | 'opus' {
  if (!llm) return 'sonnet'
  const l = llm.toLowerCase()
  if (l.includes('gpt-4') || l.includes('claude-3-opus') || l.includes('opus')) return 'opus'
  if (l.includes('gpt-3.5') || l.includes('haiku')) return 'haiku'
  return 'sonnet'
}

/**
 * Convert a CrewAI Crew definition into an ai-agencee DagDefinition.
 *
 * Algorithm:
 * 1. Map each CrewAgent → DagLane (role → capabilities, llm → modelTier)
 * 2. Map CrewTask.depends_on → lane.dependsOn (by agent ownership)
 * 3. CrewTask.expected_output → lane.checks[0] = { type: 'llm-review', criteria }
 * 4. process='sequential' → linear dependsOn chain
 * 5. process='hierarchical' → star deps from first agent
 */
export function importCrew(crew: CrewDefinition): DagDefinition {
  const agentIdToLaneId = new Map<string, string>()
  // agent.id → lane id (sanitise to valid lane id)
  for (const agent of crew.agents) {
    agentIdToLaneId.set(agent.id, agent.id.replace(/\s+/g, '-').toLowerCase())
  }

  const lanes: DagLane[] = crew.agents.map((agent) => ({
    id: agentIdToLaneId.get(agent.id)!,
    dependsOn: [],
    capabilities: inferCapabilities(agent.role),
    modelTier: mapModelTier(agent.llm),
    checks: [],
  }))

  const laneMap = new Map<string, DagLane>(lanes.map((l) => [l.id, l]))

  // Wire checks from tasks (expected_output → llm-review check)
  for (const task of crew.tasks) {
    const laneId = agentIdToLaneId.get(task.agent)
    if (!laneId) continue
    const lane = laneMap.get(laneId)
    if (!lane) continue

    lane.checks = lane.checks ?? []
    lane.checks.push({ type: 'llm-review', criteria: task.expected_output })

    // Wire explicit task dependencies
    if (task.depends_on) {
      for (const dep of task.depends_on) {
        const depLaneId = agentIdToLaneId.get(dep)
        if (depLaneId && !lane.dependsOn.includes(depLaneId)) {
          lane.dependsOn.push(depLaneId)
        }
      }
    }
  }

  // Apply process-level dependency strategy if no explicit task deps
  const hasExplicitDeps = lanes.some((l) => l.dependsOn.length > 0)
  if (!hasExplicitDeps && lanes.length > 1) {
    if (crew.process === 'sequential' || !crew.process) {
      // Linear chain: each lane depends on previous
      for (let i = 1; i < lanes.length; i++) {
        lanes[i].dependsOn = [lanes[i - 1].id]
      }
    } else if (crew.process === 'hierarchical') {
      // Star: all lanes depend on the first (manager) agent
      const managerId = lanes[0].id
      for (let i = 1; i < lanes.length; i++) {
        lanes[i].dependsOn = [managerId]
      }
    }
  }

  return {
    name: 'imported-crew',
    description: 'Imported from CrewAI Crew definition',
    lanes,
    globalBarriers: [],
    capabilityRegistry: {},
  }
}
