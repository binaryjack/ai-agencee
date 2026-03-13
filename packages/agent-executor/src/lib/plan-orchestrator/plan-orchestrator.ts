import * as path from 'path'
import type { IChatRenderer } from '../chat-renderer/index.js'
import type { DagResult } from '../dag-types.js'
import type { IModelRouter } from '../model-router/index.js'
import { PLAN_STATE_DIR } from '../path-constants.js'
import type {
  DiscoveryResult,
  PlanDefinition,
  PlanPhase,
  PlanRunOptions,
  StepDefinition,
} from '../plan-types.js'

export type { DagResult, DiscoveryResult, PlanDefinition, PlanPhase, StepDefinition }

export interface PlanStepResult {
  stepId:     string;
  stepName:   string;
  status:     'success' | 'failed' | 'skipped' | 'gated';
  dagResult?: DagResult;
  durationMs: number;
  artifacts:  string[];
}

export interface PlanResult {
  planId:          string;
  planName:        string;
  status:          'success' | 'partial' | 'failed' | 'gated';
  phase:           PlanPhase;
  steps:           PlanStepResult[];
  totalDurationMs: number;
  artifacts:       string[];
  savedTo:         string;
}

export interface IPlanOrchestrator {
  _projectRoot: string;
  _options:     Required<Omit<PlanRunOptions, 'modelRouter'>> & { modelRouter?: IModelRouter };
  _renderer:    IChatRenderer;
  _stateDir:    string;
  _modelRouter: IModelRouter | undefined;

  run():                                                                        Promise<PlanResult>;
  _executeSteps(plan: PlanDefinition, r: IChatRenderer):                        Promise<PlanStepResult[]>;
  _runStep(step: StepDefinition, plan: PlanDefinition):                        Promise<PlanStepResult>;
  _topoGroups(steps: StepDefinition[]):                                        StepDefinition[][];
  _shouldRun(phase: PlanPhase):                                                boolean;
  _inferDagFile(step: StepDefinition, plan: PlanDefinition):                  string | null;
  _savePlan(plan: PlanDefinition):                                              void;
  _waitForAnyInput():                                                           Promise<void>;
  _printSummary(result: PlanResult, r: IChatRenderer):                          void;
}

export const PlanOrchestrator = function PlanOrchestrator(
  this: IPlanOrchestrator,
  projectRoot: string,
  options: PlanRunOptions = {},
) {
  const ChatRendererCtor = require('../chat-renderer/index.js').ChatRenderer as new () => IChatRenderer;

  this._projectRoot = path.resolve(projectRoot);
  this._modelRouter = options.modelRouter as IModelRouter | undefined;
  this._options     = {
    startFrom:    options.startFrom    ?? 'discover',
    skipApproval: options.skipApproval ?? false,
    projectRoot:  this._projectRoot,
    agentsBaseDir: options.agentsBaseDir ?? this._projectRoot,
    verbose:      options.verbose      ?? true,
  };
  this._renderer = new ChatRendererCtor();
  this._stateDir = path.join(this._projectRoot, PLAN_STATE_DIR);
} as unknown as new (projectRoot: string, options?: PlanRunOptions) => IPlanOrchestrator;
