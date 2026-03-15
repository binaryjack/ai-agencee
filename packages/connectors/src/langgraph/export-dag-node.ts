import type { DagRunnerClient } from '../dag-types.js'

/**
 * Returns an async function usable as a LangGraph node.
 *
 * Usage:
 * ```ts
 * const node = exportDagNode(client, 'my-dag-id', 'backend')
 * graph.addNode('backend', node)
 * ```
 */
export function exportDagNode(
  client: DagRunnerClient,
  dagId: string,
  laneId: string,
): (state: Record<string, unknown>) => Promise<Record<string, unknown>> {
  return async (state) => {
    const run = await client.submitRun(dagId, {
      laneFilter: [laneId],
      input: state,
    })

    // Poll until completed if client supports getLane
    let result: unknown = run.result
    if (client.getLane && run.id) {
      let attempts = 0
      while (attempts < 60) {
        const lane = await client.getLane(run.id, laneId)
        if (lane.status === 'completed' || lane.status === 'failed') {
          result = lane.result
          break
        }
        await new Promise((r) => setTimeout(r, 1000))
        attempts++
      }
    }

    return { [`${laneId}_result`]: result }
  }
}
