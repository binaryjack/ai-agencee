import * as fs from 'fs'
import * as path from 'path'
import type { ContractResult, ContractViolation } from './contract-validator.types.js'

interface AgentJsonPartial {
  supervisor?: string
  dependsOn?: string[]
  technologies?: string[]
}

interface DagLane {
  id: string
  agent?: string
  dependsOn?: string[]
}

interface DagJsonPartial {
  lanes: DagLane[]
}

const isBareFilename = (val: string): boolean =>
  val.includes('/') || val.includes('\\') || path.isAbsolute(val)

const hasCycle = (lanes: DagLane[]): boolean => {
  const adj = new Map<string, string[]>()
  for (const lane of lanes) adj.set(lane.id, lane.dependsOn ?? [])
  const visited = new Set<string>()
  const inStack = new Set<string>()
  const dfs = (id: string): boolean => {
    if (inStack.has(id)) return true
    if (visited.has(id)) return false
    visited.add(id)
    inStack.add(id)
    for (const dep of (adj.get(id) ?? [])) {
      if (dfs(dep)) return true
    }
    inStack.delete(id)
    return false
  }
  return lanes.some(l => dfs(l.id))
}

export const validateAgentContract = (
  agentJson: AgentJsonPartial,
  agentsBaseDir: string,
): ContractResult => {
  const violations: ContractViolation[] = []
  const warnings: string[] = []

  if (agentJson.supervisor) {
    const sup = agentJson.supervisor
    if (isBareFilename(sup)) {
      violations.push({ type: 'bare-filename', field: 'supervisor', value: sup, message: `supervisor must be a bare filename, got: ${sup}` })
    } else if (!fs.existsSync(path.join(agentsBaseDir, sup))) {
      violations.push({ type: 'file-missing', field: 'supervisor', value: sup, message: `supervisor file not found: ${sup}` })
    }
  }

  for (const [idx, dep] of (agentJson.dependsOn ?? []).entries()) {
    if (isBareFilename(dep)) {
      violations.push({ type: 'bare-filename', field: `dependsOn[${idx}]`, value: dep, message: `dependsOn[${idx}] must be a bare filename, got: ${dep}` })
    } else if (!fs.existsSync(path.join(agentsBaseDir, dep))) {
      violations.push({ type: 'file-missing', field: `dependsOn[${idx}]`, value: dep, message: `dependsOn[${idx}] file not found: ${dep}` })
    }
  }

  return { valid: violations.length === 0, violations, warnings }
}

export const validateDagContract = (
  dagJson: DagJsonPartial,
  agentsBaseDir: string,
): ContractResult => {
  const violations: ContractViolation[] = []
  const warnings: string[] = []
  const laneIds = new Set(dagJson.lanes.map(l => l.id))

  for (const lane of dagJson.lanes) {
    if (!lane.agent) {
      violations.push({ type: 'file-missing', field: `lanes[${lane.id}].agent`, message: `Lane '${lane.id}' has no agent field` })
    } else {
      if (isBareFilename(lane.agent)) {
        violations.push({ type: 'bare-filename', field: `lanes[${lane.id}].agent`, value: lane.agent, message: `Lane '${lane.id}' agent must be a bare filename, got: ${lane.agent}` })
      } else if (!fs.existsSync(path.join(agentsBaseDir, lane.agent))) {
        violations.push({ type: 'file-missing', field: `lanes[${lane.id}].agent`, value: lane.agent, message: `Lane '${lane.id}' agent file not found: ${lane.agent}` })
      }
    }

    for (const dep of (lane.dependsOn ?? [])) {
      if (!laneIds.has(dep)) {
        violations.push({ type: 'depends-on-invalid', field: 'dependsOn', value: dep, message: `Lane '${lane.id}' depends on non-existent lane: '${dep}'` })
      }
    }
  }

  if (hasCycle(dagJson.lanes)) {
    violations.push({ type: 'cycle', message: 'Circular dependsOn detected in DAG' })
  }

  return { valid: violations.length === 0, violations, warnings }
}
