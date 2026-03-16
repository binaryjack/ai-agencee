import * as fs from 'fs/promises';
import * as path from 'path';
import type { DagDefinition, DagResult } from '../../dag-types.js';
import type { IDagOrchestrator } from '../dag-orchestrator.js';

export async function run(this: IDagOrchestrator, dagFile: string): Promise<DagResult> {
  const dagPath = path.isAbsolute(dagFile)
    ? dagFile
    : path.resolve(this._projectRoot, dagFile);

  try {
    await fs.access(dagPath);
  } catch {
    throw new Error(
      `DAG file not found: ${dagPath}\n` +
      `  projectRoot : ${this._projectRoot}\n` +
      `  dagFile arg : ${dagFile}\n` +
      `  Tip: pass --project <repo-root> to set the correct project root.`,
    );
  }

  const dagDir = path.dirname(dagPath);
  const dag    = await this.loadDag(dagPath);
  return this.execute(dag, dagDir);
}
