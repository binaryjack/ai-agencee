import type { DagLane, DagRunnerClient } from '../dag-types.js'
import type { AutogenAgentConfig } from './types.js'

/**
 * Export a DAG lane as an AutoGen ConversableAgent config.
 *
 * The returned config has:
 * - human_input_mode = 'NEVER' (fully automated)
 * - code_execution_config = false
 * - function_map includes run_lane: calls client.submitRun with laneId filter
 */
export function exportConversableAgent(
  lane: DagLane,
  dagId: string,
  client: DagRunnerClient,
): AutogenAgentConfig {
  return {
    name: lane.id,
    system_message: `You are agent '${lane.id}' executing DAG lane '${lane.id}' in dag '${dagId}'. Use the run_lane function to trigger execution.`,
    human_input_mode: 'NEVER',
    code_execution_config: false,
    function_map: {
      run_lane: async (input: unknown) =>
        client.submitRun(dagId, { laneFilter: [lane.id], input }),
    },
  }
}
