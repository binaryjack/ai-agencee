import type { DagRunnerClient } from '../dag-types.js'
import type { CrewToolDescriptor } from './types.js'

/**
 * Export a DAG lane as a CrewAI-compatible tool descriptor.
 * Serialised to JSON for transport over python-mcp-bridge.
 */
export function exportLaneAsTool(
  laneId: string,
  dagId: string,
  client: DagRunnerClient,
): CrewToolDescriptor {
  return {
    name: `run_dag_lane_${laneId}`,
    description: `Execute the '${laneId}' lane of DAG '${dagId}' and return its result.`,
    execute: async (input: unknown) =>
      client.submitRun(dagId, { laneFilter: [laneId], input }),
  }
}

/**
 * Serialise a CrewToolDescriptor to a JSON-transportable form (removes the live execute fn).
 * Used when passing tool metadata over python-mcp-bridge.
 */
export function serialiseTool(descriptor: CrewToolDescriptor): Record<string, unknown> {
  return {
    name: descriptor.name,
    description: descriptor.description,
    schema: {
      type: 'object',
      properties: {
        input: { type: 'string', description: 'JSON-encoded input for the lane' },
      },
      required: ['input'],
    },
  }
}
