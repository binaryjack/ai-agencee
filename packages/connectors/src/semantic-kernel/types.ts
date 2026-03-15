/** Mirrors of Semantic Kernel Planner v1 JSON output types. */

export interface SkStep {
  plugin: string
  function: string
  input?: Record<string, string>
  setContextVariable?: string
}

export interface SkPlanDefinition {
  steps: SkStep[]
}

/** Descriptor for a Semantic Kernel Plugin exposing a DAG. */
export interface SkFunctionDescriptor {
  name: string
  description: string
  parameters: Array<{ name: string; type: string; description?: string }>
  execute: (input: string) => Promise<string>
}

export interface SkPluginDescriptor {
  name: string
  functions: SkFunctionDescriptor[]
}
