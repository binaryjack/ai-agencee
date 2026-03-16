import * as fs from 'fs/promises';
import { DagPlanner } from '../../dag-planner/index.js';
import type { DagDefinition } from '../../dag-types.js';
import type { IDagOrchestrator } from '../dag-orchestrator.js';

export async function loadDag(
  this: IDagOrchestrator,
  dagFilePath: string,
): Promise<DagDefinition> {
  const raw = await fs.readFile(dagFilePath, 'utf-8');
  const dag: DagDefinition = JSON.parse(raw);
  DagPlanner.validateDag(dag);
  return dag;
}
