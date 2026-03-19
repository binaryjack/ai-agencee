import type { DryRunReport } from '@ai-agencee/engine'
import { DagOrchestrator } from '@ai-agencee/engine'
import * as fs from 'fs'
import * as path from 'path'

export const runDagDryRun = async (dagPath: string, projectRoot: string): Promise<DryRunReport> => {
  const resolvedDag = path.isAbsolute(dagPath) ? dagPath : path.join(projectRoot, dagPath)
  const dagJson = JSON.parse(fs.readFileSync(resolvedDag, 'utf8')) as Record<string, unknown>
  const agentsBaseDir = path.dirname(resolvedDag)
  const orchestrator = new DagOrchestrator(projectRoot)
  return orchestrator.dryRun(dagJson as never, agentsBaseDir, projectRoot)
}
