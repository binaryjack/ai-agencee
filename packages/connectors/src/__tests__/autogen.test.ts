import { describe, expect, it } from 'vitest'
import { importGroupChat } from '../autogen/import-group-chat.js'
import type { AutogenGroupChatConfig } from '../autogen/types.js'

const AGENTS: AutogenGroupChatConfig['agents'] = [
  { name: 'planner',   system_message: 'Plan the work and analyse requirements' },
  { name: 'coder',     system_message: 'Write backend code and generate solutions' },
  { name: 'reviewer',  system_message: 'Test quality and review test results' },
]

describe('AutoGen connector', () => {
  it('round_robin → sequential barriers', () => {
    const dag = importGroupChat({ agents: AGENTS, speaker_selection: 'round_robin' })

    expect(dag.lanes[0].dependsOn).toEqual([])
    expect(dag.lanes[1].dependsOn).toContain('planner')
    expect(dag.lanes[2].dependsOn).toContain('coder')

    // Barriers between each consecutive pair
    expect(dag.globalBarriers.length).toBeGreaterThanOrEqual(2)
    expect(dag.globalBarriers.every((b) => b.mode === 'soft')).toBe(true)
  })

  it('auto → parallel lanes + hard barrier', () => {
    const dag = importGroupChat({ agents: AGENTS, speaker_selection: 'auto' })

    // No sequential deps
    for (const lane of dag.lanes) {
      expect(lane.dependsOn).toEqual([])
    }

    // One hard barrier aggregating all lanes
    const hardBarrier = dag.globalBarriers.find((b) => b.mode === 'hard')
    expect(hardBarrier).toBeDefined()
    expect(hardBarrier?.participants).toHaveLength(AGENTS.length)
  })

  it('max_round → retryBudget', () => {
    const dag = importGroupChat({ agents: AGENTS, max_round: 3 })
    expect(dag.retryBudget).toBe(3)
  })

  it('system_message inference maps to capabilities', () => {
    const dag = importGroupChat({ agents: AGENTS })
    expect(dag.lanes.find((l) => l.id === 'planner')?.capabilities).toContain('ba')
    expect(dag.lanes.find((l) => l.id === 'reviewer')?.capabilities).toContain('testing')
  })
})
