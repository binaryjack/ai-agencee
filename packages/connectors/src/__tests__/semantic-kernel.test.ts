import { describe, expect, it, vi } from 'vitest'
import type { DagRunnerClient } from '../dag-types.js'
import { exportDagAsPlugin } from '../semantic-kernel/export-plugin.js'
import { importSkPlan } from '../semantic-kernel/import-planner.js'
import type { SkPlanDefinition } from '../semantic-kernel/types.js'

describe('Semantic Kernel connector', () => {
  describe('importSkPlan', () => {
    it('steps grouped by plugin correctly', () => {
      const plan: SkPlanDefinition = {
        steps: [
          { plugin: 'CodePlugin',   function: 'Generate' },
          { plugin: 'TestPlugin',   function: 'Run' },
          { plugin: 'CodePlugin',   function: 'Refactor' },
        ],
      }

      const dag = importSkPlan(plan)
      // CodePlugin and TestPlugin → 2 lanes
      expect(dag.lanes).toHaveLength(2)
      expect(dag.lanes.map((l) => l.id)).toContain('codeplugin')
      expect(dag.lanes.map((l) => l.id)).toContain('testplugin')
    })

    it('shared context variable → barrier inserted', () => {
      const plan: SkPlanDefinition = {
        steps: [
          { plugin: 'AnalyzePlugin', function: 'Scan',    setContextVariable: 'findings' },
          { plugin: 'ReportPlugin',  function: 'Generate', input: { data: '$findings' } },
        ],
      }

      const dag = importSkPlan(plan)

      // ReportPlugin depends on AnalyzePlugin
      const reportLane = dag.lanes.find((l) => l.id === 'reportplugin')
      expect(reportLane?.dependsOn).toContain('analyzeplugin')

      // Barrier exists between the two
      expect(dag.globalBarriers.length).toBeGreaterThan(0)
    })

    it('single-plugin plan has no barriers', () => {
      const plan: SkPlanDefinition = {
        steps: [
          { plugin: 'Solo', function: 'A' },
          { plugin: 'Solo', function: 'B' },
        ],
      }
      const dag = importSkPlan(plan)
      expect(dag.lanes).toHaveLength(1)
      expect(dag.globalBarriers).toHaveLength(0)
    })
  })

  describe('exportDagAsPlugin', () => {
    it('function descriptor is well-formed', async () => {
      const mockClient: DagRunnerClient = {
        submitRun: vi.fn().mockResolvedValue({ id: 'r1', status: 'completed', result: 'ok' }),
      }

      const plugin = exportDagAsPlugin('dag-1', 'MyDag', mockClient)

      expect(plugin.name).toBe('MyDag')
      expect(plugin.functions).toHaveLength(1)
      expect(plugin.functions[0].name).toBe('RunDag')
      expect(plugin.functions[0].parameters[0].name).toBe('input')

      const result = await plugin.functions[0].execute(JSON.stringify({ pr: 42 }))
      expect(mockClient.submitRun).toHaveBeenCalledWith('dag-1', {
        input: { pr: 42 },
      })
      const parsed = JSON.parse(result)
      expect(parsed.id).toBe('r1')
    })
  })
})
