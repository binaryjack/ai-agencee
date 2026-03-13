import * as path from 'path'
import { RUNS_DIR } from '../path-constants.js'

import type { RunEntry, RunPaths, RunStatus } from './run-registry.types.js'

import { _paths, _read, _upsert, _write } from './prototype/helpers.js'
import { complete, create, deleteRun, purgeOld } from './prototype/lifecycle.js'
import { get, list, listActive, paths } from './prototype/query.js'

export interface IRunRegistry {
  new(projectRoot: string): IRunRegistry;
  _projectRoot:  string;
  _runsDir:      string;
  _manifestPath: string;
  create(runId: string, dagName: string): Promise<RunPaths>;
  complete(runId: string, status: RunStatus, durationMs?: number): Promise<void>;
  delete(runId: string): Promise<void>;
  purgeOld(olderThanMs?: number): Promise<string[]>;
  paths(runId: string): RunPaths;
  get(runId: string): Promise<RunEntry | undefined>;
  list(): Promise<RunEntry[]>;
  listActive(): Promise<RunEntry[]>;
  _paths(runId: string): RunPaths;
  _read(): Promise<RunEntry[]>;
  _write(entries: RunEntry[]): Promise<void>;
  _upsert(entry: RunEntry): Promise<void>;
}

export const RunRegistry = function(
  this:        IRunRegistry,
  projectRoot: string,
) {
  this._projectRoot  = projectRoot;
  this._runsDir      = path.join(projectRoot, RUNS_DIR);
  this._manifestPath = path.join(projectRoot, RUNS_DIR, 'manifest.json');
} as unknown as IRunRegistry;

// Attach prototype methods after RunRegistry is defined (avoids circular-import race)
Object.assign((RunRegistry as unknown as { prototype: object }).prototype, {
  create,
  complete,
  delete: deleteRun,
  purgeOld,
  paths,
  get,
  list,
  listActive,
  _paths,
  _read,
  _write,
  _upsert,
});
