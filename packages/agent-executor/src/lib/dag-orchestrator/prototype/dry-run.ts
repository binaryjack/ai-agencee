import * as fs from 'fs'
import * as path from 'path'
import type { AgentJson } from '../../agent-types.js'
import type { DagDefinition } from '../../dag-types.js'
import { TechRegistryResolver } from '../../prompt-compiler/index.js'
import type { IDagOrchestrator } from '../dag-orchestrator.js'
import type { DryRunError, DryRunReport, DryRunWarning } from '../dry-run-report.types.js'

const isBareFilename = (val: string): boolean =>
  val.includes('/') || val.includes('\\') || path.isAbsolute(val)

const hasCycle = (lanes: Array<{ id: string; dependsOn?: string[] }>): boolean => {
  const adj = new Map<string, string[]>()
  for (const lane of lanes) adj.set(lane.id, lane.dependsOn ?? [])
  const visited = new Set<string>()
  const inStack = new Set<string>()
  const dfs = (id: string): boolean => {
    if (inStack.has(id)) return true
    if (visited.has(id)) return false
    visited.add(id)
    inStack.add(id)
    for (const dep of (adj.get(id) ?? [])) { if (dfs(dep)) return true }
    inStack.delete(id)
    return false
  }
  return lanes.some(l => dfs(l.id))
}

export const dryRun = async function(
  this: IDagOrchestrator,
  dag: DagDefinition,
  agentsBaseDir: string,
  projectRoot?: string,
): Promise<DryRunReport> {
  const errors: DryRunError[] = []
  const warnings: DryRunWarning[] = []
  const agentFiles: string[] = []
  const laneIds = new Set(dag.lanes.map(l => l.id))

  for (const lane of dag.lanes) {
    if (!lane.agentFile) {
      errors.push({ lane: lane.id, type: 'file-missing', message: `Lane '${lane.id}' has no agentFile` })
      continue
    }

    if (isBareFilename(lane.agentFile)) {
      errors.push({ lane: lane.id, type: 'bare-filename', message: `Lane '${lane.id}' agentFile must be a bare filename, got: ${lane.agentFile}` })
    } else if (!fs.existsSync(path.join(agentsBaseDir, lane.agentFile))) {
      errors.push({ lane: lane.id, type: 'file-missing', message: `Lane '${lane.id}' agentFile not found: ${lane.agentFile}` })
    } else {
      agentFiles.push(lane.agentFile)
    }

    for (const dep of (lane.dependsOn ?? [])) {
      if (!laneIds.has(dep)) {
        errors.push({ lane: lane.id, type: 'depends-on-invalid', message: `Lane '${lane.id}' depends on non-existent lane: '${dep}'` })
      }
    }
  }

  if (hasCycle(dag.lanes)) {
    errors.push({ type: 'cycle', message: 'Circular dependsOn detected in DAG' })
  }

  if (projectRoot) {
    for (const lane of dag.lanes) {
      if (!lane.agentFile) continue
      const agentFilePath = path.join(agentsBaseDir, lane.agentFile)
      if (!fs.existsSync(agentFilePath)) continue
      let agentJson: AgentJson
      try {
        agentJson = JSON.parse(fs.readFileSync(agentFilePath, 'utf8')) as AgentJson
      } catch {
        continue
      }
      for (const tech of (agentJson.technologies ?? [])) {
        try {
          await TechRegistryResolver.resolve(tech, projectRoot)
        } catch {
          errors.push({ lane: lane.id, type: 'tech-unresolved', message: `Tech pack '${tech}' not resolved for lane '${lane.id}'` })
        }
      }
    }
  }

  const _ = warnings
  return {
    valid: errors.length === 0,
    errors,
    warnings: _,
    laneCount: dag.lanes.length,
    agentFiles,
  }
}
