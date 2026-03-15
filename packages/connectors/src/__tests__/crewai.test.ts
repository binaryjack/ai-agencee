import { describe, expect, it, vi } from 'vitest'
import { exportLaneAsTool } from '../crewai/export-lane-tool.js'
import { importCrew } from '../crewai/import-crew.js'
import type { CrewDefinition } from '../crewai/types.js'
import type { DagRunnerClient } from '../dag-types.js'

describe('CrewAI connector', () => {
  describe('importCrew', () => {
    it('sequential process → linear dependsOn chain', () => {
      const crew: CrewDefinition = {
        agents: [
          { id: 'researcher', role: 'researcher', goal: 'find info', backstory: '' },
          { id: 'developer',  role: 'developer',  goal: 'build',    backstory: '' },
          { id: 'tester',     role: 'tester',     goal: 'test',     backstory: '' },
        ],
        tasks: [],
        process: 'sequential',
      }

      const dag = importCrew(crew)

      expect(dag.lanes).toHaveLength(3)
      expect(dag.lanes[0].dependsOn).toEqual([])
      expect(dag.lanes[1].dependsOn).toEqual(['researcher'])
      expect(dag.lanes[2].dependsOn).toEqual(['developer'])
    })

    it('expected_output → llm-review check', () => {
      const crew: CrewDefinition = {
        agents: [
          { id: 'writer', role: 'developer', goal: 'write code', backstory: '' },
        ],
        tasks: [
          { id: 't1', description: 'Write module', agent: 'writer', expected_output: 'Working TypeScript module with exports' },
        ],
      }

      const dag = importCrew(crew)
      const lane = dag.lanes[0]

      expect(lane.checks).toHaveLength(1)
      expect(lane.checks![0].type).toBe('llm-review')
      expect(lane.checks![0].criteria).toBe('Working TypeScript module with exports')
    })

    it('llm="gpt-4" → modelTier="opus"', () => {
      const crew: CrewDefinition = {
        agents: [{ id: 'a', role: 'developer', goal: '', backstory: '', llm: 'gpt-4' }],
        tasks: [],
      }
      expect(importCrew(crew).lanes[0].modelTier).toBe('opus')
    })

    it('hierarchical process → star deps from first agent', () => {
      const crew: CrewDefinition = {
        agents: [
          { id: 'manager',  role: 'manager',  goal: '', backstory: '' },
          { id: 'worker-a', role: 'developer', goal: '', backstory: '' },
          { id: 'worker-b', role: 'developer', goal: '', backstory: '' },
        ],
        tasks: [],
        process: 'hierarchical',
      }

      const dag = importCrew(crew)
      expect(dag.lanes[1].dependsOn).toContain('manager')
      expect(dag.lanes[2].dependsOn).toContain('manager')
      expect(dag.lanes[0].dependsOn).toEqual([])
    })
  })

  describe('exportLaneAsTool', () => {
    it('returns descriptor with execute fn that calls submitRun', async () => {
      const mockClient: DagRunnerClient = {
        submitRun: vi.fn().mockResolvedValue({ id: 'r1', status: 'completed' }),
      }

      const tool = exportLaneAsTool('backend', 'dag-1', mockClient)

      expect(tool.name).toBe('run_dag_lane_backend')
      expect(typeof tool.execute).toBe('function')

      await tool.execute({ input: 'test' })
      expect(mockClient.submitRun).toHaveBeenCalledWith('dag-1', {
        laneFilter: ['backend'],
        input: { input: 'test' },
      })
    })
  })
})
