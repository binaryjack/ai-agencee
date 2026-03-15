import type { DagBarrier, DagDefinition, DagLane } from '../dag-types.js'
import type { AutogenGroupChatConfig } from './types.js'

/** Infer lane capabilities from an agent's system_message. */
function inferCapabilities(systemMessage: string): string[] {
  const m = systemMessage.toLowerCase()
  if (m.includes('test') || m.includes('qa') || m.includes('quality')) return ['testing']
  if (m.includes('secur') || m.includes('vulnerab') || m.includes('audit')) return ['security']
  if (m.includes('plan') || m.includes('analys') || m.includes('business')) return ['ba']
  if (m.includes('front') || /\bui\b/.test(m) || m.includes('component')) return ['frontend']
  return ['backend']
}

/**
 * Convert an AutoGen GroupChatManager config into an ai-agencee DagDefinition.
 *
 * Algorithm:
 * 1. Each agent → lane (capabilities from system_message)
 * 2. round_robin → sequential barrier chain
 * 3. auto → parallel lanes + hard barrier at end
 * 4. max_round → retryBudget
 */
export function importGroupChat(cfg: AutogenGroupChatConfig): DagDefinition {
  const lanes: DagLane[] = cfg.agents.map((agent) => ({
    id: agent.name.replace(/\s+/g, '-').toLowerCase(),
    dependsOn: [],
    capabilities: inferCapabilities(agent.system_message),
    modelTier: 'sonnet' as const,
  }))

  const barriers: DagBarrier[] = []

  if (cfg.speaker_selection === 'round_robin' || !cfg.speaker_selection) {
    // Sequential: each lane depends on the previous
    for (let i = 1; i < lanes.length; i++) {
      lanes[i].dependsOn = [lanes[i - 1].id]
    }
    // Add intermediate soft barriers after each step
    for (let i = 0; i < lanes.length - 1; i++) {
      barriers.push({
        name: `round-${i + 1}`,
        participants: [lanes[i].id, lanes[i + 1].id],
        mode: 'soft',
      })
    }
  } else if (cfg.speaker_selection === 'auto') {
    // Parallel lanes, hard barrier at end aggregating all
    barriers.push({
      name: 'final-sync',
      participants: lanes.map((l) => l.id),
      mode: 'hard',
    })
  }

  return {
    name: 'imported-autogen',
    description: 'Imported from AutoGen GroupChat configuration',
    retryBudget: cfg.max_round ?? 1,
    lanes,
    globalBarriers: barriers,
    capabilityRegistry: {},
  }
}
