/** Mirrors of CrewAI Python types as plain JSON objects for import. */

export interface CrewAgent {
  id: string
  role: string
  goal: string
  backstory: string
  llm?: string
  tools?: string[]
}

export interface CrewTask {
  id: string
  description: string
  agent: string
  expected_output: string
  depends_on?: string[]
}

export interface CrewDefinition {
  agents: CrewAgent[]
  tasks: CrewTask[]
  process?: 'sequential' | 'hierarchical'
}

/** Tool descriptor compatible with CrewAI tool format (serialised to JSON for MCP transport). */
export interface CrewToolDescriptor {
  name: string
  description: string
  execute: (input: unknown) => Promise<unknown>
}
