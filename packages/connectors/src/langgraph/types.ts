/**
 * LangGraph external type mirrors.
 * No runtime dependency on @langchain/langgraph — uses plain JSON shapes.
 */

export interface StateGraphNode {
  type: string
  config?: unknown
}

export interface StateGraphEdge {
  source: string
  target: string
  condition?: string
}

export interface StateGraphConditionalEdge {
  source: string
  targets: Record<string, string>
  condition: string
}

export interface StateGraphDefinition {
  nodes: Record<string, StateGraphNode>
  edges: Array<StateGraphEdge>
  conditionalEdges?: Array<StateGraphConditionalEdge>
}

export interface ImportOptions {
  /** Default model tier for all lanes (default: 'sonnet') */
  defaultModelTier?: 'haiku' | 'sonnet' | 'opus'
  /** DAG name override */
  name?: string
}
