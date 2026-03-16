import * as fs from 'fs';
import type { PlanDefinition, PlanPhase, StepDefinition } from '../../plan-types.js';
import type { IPlanOrchestrator, PlanResult, PlanStepResult } from '../plan-orchestrator.js';

export async function run(this: IPlanOrchestrator): Promise<PlanResult> {
  const { Arbiter }          = await import('../../arbiter/index.js');
  const { BacklogBoard }     = await import('../../backlog/index.js');
  const { DagOrchestrator }  = await import('../../dag-orchestrator/index.js');
  const { DiscoverySession } = await import('../../discovery-session/index.js');
  const { PlanModelAdvisor } = await import('../../plan-model-advisor/index.js');
  const { PlanSynthesizer }  = await import('../../plan-synthesizer/index.js');
  const { SprintPlanner }    = await import('../../sprint-planner/index.js');

  const startMs = Date.now();
  fs.mkdirSync(this._stateDir, { recursive: true });

  const r = this._renderer;
  r.say('system', `PlanOrchestrator  ·  project: ${this._projectRoot}`);
  r.say('system', `Start phase: ${this._options.startFrom}`);
  r.newline();

  if (this._modelRouter) {
    const advisor = new PlanModelAdvisor(r, this._modelRouter);
    await advisor.display();
  } else {
    r.say('system', '⚠  No ModelRouter configured — phases will run in heuristic mode.');
    r.say('system', 'Tip: set ANTHROPIC_API_KEY or OPENAI_API_KEY for LLM-backed phase reasoning.');
  }
  r.newline();

  let discovery: import('../../plan-types.js').DiscoveryResult | null = null;
  let plan: PlanDefinition | null = null;

  // Phase 0: DISCOVER
  if (this._shouldRun('discover')) {
    const session = new DiscoverySession(r, this._projectRoot, this._modelRouter);
    const saved   = DiscoverySession.load(this._projectRoot);
    if (saved && this._options.startFrom !== 'discover') {
      r.system('Resuming — discovery.json found, skipping Phase 0');
      discovery = saved;
    } else {
      discovery = await session.run();
    }
  } else {
    const { PLAN_STATE_DIR } = await import('../../path-constants.js');
    discovery = DiscoverySession.load(this._projectRoot);
    if (!discovery) throw new Error(`Cannot skip Phase 0: no discovery.json found in ${PLAN_STATE_DIR}/`);
  }

  // Phase 1: SYNTHESIZE
  if (this._shouldRun('synthesize')) {
    const synth = new PlanSynthesizer(r, this._projectRoot, this._modelRouter);
    const saved  = PlanSynthesizer.load(this._projectRoot);
    if (saved && this._options.startFrom !== 'synthesize') {
      r.system('Resuming — plan.json found, skipping Phase 1');
      plan = saved;
    } else {
      plan = await synth.synthesize(discovery!);
    }
  } else {
    const { PLAN_STATE_DIR } = await import('../../path-constants.js');
    plan = PlanSynthesizer.load(this._projectRoot);
    if (!plan) throw new Error(`Cannot skip Phase 1: no plan.json found in ${PLAN_STATE_DIR}/`);
  }

  // Phase 2: DECOMPOSE
  const board = new BacklogBoard(r, this._projectRoot);
  if (this._shouldRun('decompose')) {
    board.load();
    await new SprintPlanner(r, this._projectRoot, this._modelRouter).run(plan!, discovery!, board);
  }

  // Phase 3: WIRE
  if (this._shouldRun('wire')) {
    r.phaseHeader('wire');
    const arbiter = new Arbiter(r, this._projectRoot, this._modelRouter);
    await arbiter.runStandardDecisions(plan!, board);

    await arbiter.microAlign('architecture', 'backend', 'API contract ownership', 'API spec produced by Architecture, consumed by Backend');
    await arbiter.microAlign('architecture', 'frontend', 'Auth flow handoff', 'Auth strategy from Architecture determines Frontend routing logic');
    if (plan!.steps.some((s: StepDefinition) => s.agent === 'backend') && plan!.steps.some((s: StepDefinition) => s.agent === 'testing')) {
      await arbiter.microAlign('backend', 'testing', 'Integration test boundaries', 'Backend declares which endpoints are integration-testable');
    }

    plan!.phase     = 'wire';
    plan!.updatedAt = new Date().toISOString();
    this._savePlan(plan!);

    r.phaseSummary('wire', [
      `${arbiter.getDecisions().length} decisions recorded`,
      `All parallel groups confirmed`,
      `Alignment gates positioned`,
    ]);
  }

  // Phase 4: EXECUTE
  const stepResults: PlanStepResult[] = [];
  if (this._shouldRun('execute')) {
    r.phaseHeader('execute');
    plan!.phase = 'execute';
    this._savePlan(plan!);
    stepResults.push(...await this._executeSteps(plan!, r));
  }

  const allArtifacts = stepResults.flatMap((s) => s.artifacts);
  const failed = stepResults.filter((s) => s.status === 'failed');
  const gated  = stepResults.filter((s) => s.status === 'gated');

  const status: PlanResult['status'] =
    failed.length > 0 ? 'failed' :
    gated.length  > 0 ? 'gated'  :
    stepResults.some((s) => s.status === 'skipped') ? 'partial' :
    'success';

  const planObj = plan!;
  planObj.phase     = status === 'success' ? 'complete' : planObj.phase;
  planObj.artifacts = allArtifacts;
  planObj.updatedAt = new Date().toISOString();
  this._savePlan(planObj);

  const result: PlanResult = {
    planId:          planObj.id,
    planName:        planObj.name,
    status,
    phase:           planObj.phase,
    steps:           stepResults,
    totalDurationMs: Date.now() - startMs,
    artifacts:       allArtifacts,
    savedTo:         this._stateDir,
  };

  this._printSummary(result, r);
  return result;
}
