import type { DagRunnerClient } from '../dag-types.js'
import type { SkFunctionDescriptor, SkPluginDescriptor } from './types.js'

/**
 * Export an ai-agencee DAG as a Semantic Kernel Plugin descriptor.
 *
 * Creates one KernelFunction ("RunDag") that accepts a JSON-encoded input string
 * and returns the JSON-encoded run result.
 */
export function exportDagAsPlugin(
  dagId: string,
  dagName: string,
  client: DagRunnerClient,
): SkPluginDescriptor {
  const runDagFn: SkFunctionDescriptor = {
    name: 'RunDag',
    description: `Execute the '${dagName}' DAG and return the result as JSON.`,
    parameters: [
      {
        name: 'input',
        type: 'string',
        description: 'JSON-encoded input object for the DAG run',
      },
    ],
    execute: async (input: string) => {
      const parsed = JSON.parse(input) as unknown
      const run = await client.submitRun(dagId, { input: parsed })
      return JSON.stringify(run)
    },
  }

  return {
    name: dagName,
    functions: [runDagFn],
  }
}
