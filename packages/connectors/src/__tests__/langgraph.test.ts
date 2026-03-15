import { describe, expect, it, vi } from 'vitest'
import type { DagRunnerClient } from '../dag-types.js'
import { exportDagNode } from '../langgraph/export-dag-node.js'
import { importStateGraph } from '../langgraph/import-state-graph.js'
import type { StateGraphDefinition } from '../langgraph/types.js'

describe('LangGraph connector', () => {
  describe('importStateGraph', () => {
    it('sequential graph → correct dependsOn chain', () => {
      const graph: StateGraphDefinition = {
        nodes: {
          planner: { type: 'planner' },
          coder:   { type: 'code' },
          tester:  { type: 'test' },
        },
        edges: [
          { source: '__start__', target: 'planner' },
          { source: 'planner',   target: 'coder' },
          { source: 'coder',     target: 'tester' },
        ],
      }

      const dag = importStateGraph(graph)

      expect(dag.lanes).toHaveLength(3)
      expect(dag.lanes.find((l) => l.id === 'planner')?.dependsOn).toEqual([])
      expect(dag.lanes.find((l) => l.id === 'coder')?.dependsOn).toEqual(['planner'])
      expect(dag.lanes.find((l) => l.id === 'tester')?.dependsOn).toEqual(['coder'])
    })

    it('conditional edges → soft barrier inserted', () => {
      const graph: StateGraphDefinition = {
        nodes: {
          router:  { type: 'router' },
          pathA:   { type: 'backend' },
          pathB:   { type: 'backend' },
        },
        edges: [],
        conditionalEdges: [
          {
            source: 'router',
            targets: { a: 'pathA', b: 'pathB' },
            condition: 'decide',
          },
        ],
      }

      const dag = importStateGraph(graph)

      const barrier = dag.globalBarriers.find((b) => b.name === 'router-branch')
      expect(barrier).toBeDefined()
      expect(barrier?.mode).toBe('soft')
      expect(barrier?.participants).toContain('router')
      expect(barrier?.participants).toContain('pathA')

      // pathA and pathB should depend on router
      expect(dag.lanes.find((l) => l.id === 'pathA')?.dependsOn).toContain('router')
    })

    it('node type inference maps correctly', () => {
      const graph: StateGraphDefinition = {
        nodes: {
          security_node: { type: 'security-audit' },
          test_node:     { type: 'test-runner' },
        },
        edges: [],
      }
      const dag = importStateGraph(graph)
      expect(dag.lanes.find((l) => l.id === 'security_node')?.capabilities).toContain('security')
      expect(dag.lanes.find((l) => l.id === 'test_node')?.capabilities).toContain('testing')
    })
  })

  describe('exportDagNode', () => {
    it('returned function calls client.submitRun with laneFilter', async () => {
      const mockClient: DagRunnerClient = {
        submitRun: vi.fn().mockResolvedValue({ id: 'run-1', status: 'completed', result: { ok: true } }),
      }

      const node = exportDagNode(mockClient, 'my-dag', 'backend')
      const result = await node({ repo: 'test/repo' })

      expect(mockClient.submitRun).toHaveBeenCalledWith('my-dag', {
        laneFilter: ['backend'],
        input: { repo: 'test/repo' },
      })
      expect(result).toEqual({ backend_result: { ok: true } })
    })
  })
})
