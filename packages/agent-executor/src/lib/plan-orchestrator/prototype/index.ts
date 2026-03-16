import { PlanOrchestrator } from '../plan-orchestrator.js';
import { _executeSteps }    from './_executeSteps.js';
import { _inferDagFile }    from './_inferDagFile.js';
import { _printSummary }    from './_printSummary.js';
import { _runStep }         from './_runStep.js';
import { _savePlan }        from './_savePlan.js';
import { _shouldRun }       from './_shouldRun.js';
import { _topoGroups }      from './_topoGroups.js';
import { _waitForAnyInput } from './_waitForAnyInput.js';
import { run }              from './run.js';

Object.assign((PlanOrchestrator as Function).prototype, {
  run,
  _executeSteps,
  _runStep,
  _topoGroups,
  _shouldRun,
  _inferDagFile,
  _savePlan,
  _waitForAnyInput,
  _printSummary,
});
