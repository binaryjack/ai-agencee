/**
 * Local DAG type definitions for the connectors package.
 * These mirror the BuiltDagDefinition shape from @ai-agencee/engine
 * without creating a hard runtime dependency.
 */

export interface DagLane {
  id: string
  agentFile?: string
  supervisorFile?: string
  dependsOn: string[]
  capabilities: string[]
  providerOverride?: string
  modelTier?: 'haiku' | 'sonnet' | 'opus'
  checks?: DagCheck[]
}

export interface DagCheck {
  type: string
  criteria?: string
  [key: string]: unknown
}

export interface DagBarrier {
  name: string
  participants: string[]
  mode: 'hard' | 'soft'
  timeoutMs?: number
}

export interface DagDefinition {
  name: string
  description?: string
  budgetUSD?: number
  retryBudget?: number
  lanes: DagLane[]
  globalBarriers: DagBarrier[]
  capabilityRegistry: Record<string, string[]>
}

/** Minimal client interface for export adapters (avoids cloud-api dependency). */
export interface DagRunnerClient {
  submitRun(dagId: string, options: { laneFilter?: string[]; input?: unknown }): Promise<{ id: string; status: string; result?: unknown }>
  getLane?(runId: string, laneId: string): Promise<{ status: string; result?: unknown }>
}
