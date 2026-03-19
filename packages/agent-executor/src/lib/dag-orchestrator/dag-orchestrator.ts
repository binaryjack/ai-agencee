import * as path from 'path'
import { RESULTS_DIR } from '../path-constants.js'
import type { DagRunOptions } from './dag-run-options.types.js'

// ─── IDagOrchestrator ────────────────────────────────────────────────────────

export interface IDagOrchestrator {
  _projectRoot:  string;
  _resultsDir:   string;
  _options:      DagRunOptions;
  _verbose:      boolean;

  run(dagFile: string): Promise<import('../dag-types.js').DagResult>;
  execute(
    dag:     import('../dag-types.js').DagDefinition,
    dagDir?: string,
  ): Promise<import('../dag-types.js').DagResult>;
  loadDag(dagFilePath: string): Promise<import('../dag-types.js').DagDefinition>;
  _log(msg: string): void;
  dryRun(
    dag: import('../dag-types.js').DagDefinition,
    agentsBaseDir: string,
    projectRoot?: string,
  ): Promise<import('./dry-run-report.types.js').DryRunReport>;
}

// ─── DagOrchestrator constructor ─────────────────────────────────────────────

export const DagOrchestrator = function DagOrchestrator(
  this: IDagOrchestrator,
  projectRoot: string,
  options?: DagRunOptions,
) {
  this._projectRoot = projectRoot;
  this._options     = options ?? {};
  this._verbose     = options?.verbose ?? false;
  this._resultsDir  =
    options?.resultsDir ?? path.join(projectRoot, RESULTS_DIR);
} as unknown as new (
  projectRoot: string,
  options?: DagRunOptions,
) => IDagOrchestrator;

export { type DagRunOptions }

