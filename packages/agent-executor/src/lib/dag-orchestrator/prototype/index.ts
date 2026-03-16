import { DagOrchestrator } from '../dag-orchestrator.js';
import { _log }    from './_log.js';
import { execute } from './execute.js';
import { loadDag } from './loadDag.js';
import { run }     from './run.js';

Object.assign(
  (DagOrchestrator as Function).prototype,
  { run, execute, loadDag, _log },
);
