/** Mirrors of AutoGen Python types as plain JSON objects. */

export interface AutogenAgent {
  name: string
  system_message: string
  llm_config?: { model?: string }
}

export interface AutogenGroupChatConfig {
  agents: AutogenAgent[]
  speaker_selection?: 'round_robin' | 'auto' | 'random'
  max_round?: number
}

/** Config shape for an exported ConversableAgent. */
export interface AutogenAgentConfig {
  name: string
  system_message: string
  human_input_mode: 'NEVER' | 'ALWAYS' | 'TERMINATE'
  code_execution_config: false | Record<string, unknown>
  llm_config?: Record<string, unknown>
  function_map?: Record<string, (input: unknown) => Promise<unknown>>
}
