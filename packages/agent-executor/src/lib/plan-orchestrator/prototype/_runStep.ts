import * as fs from 'fs';
import * as path from 'path';
import type { PlanDefinition, StepDefinition } from '../../plan-types.js';
import type { IPlanOrchestrator, PlanStepResult } from '../plan-orchestrator.js';

export async function _runStep(
  this: IPlanOrchestrator,
  step: StepDefinition,
  plan: PlanDefinition,
): Promise<PlanStepResult> {
  const { DagOrchestrator } = await import('../../dag-orchestrator/index.js');

  const r       = this._renderer;
  const startMs = Date.now();
  r.say('system', `▶ Step: ${step.id} — ${step.name}`);

  const dagFile = step.tasks.find((t) => t.dagFile)?.dagFile ?? this._inferDagFile(step, plan);

  if (!dagFile) {
    r.say(step.agent, `No DAG file for step "${step.id}" — marking as skipped.`);
    return {
      stepId: step.id, stepName: step.name,
      status: 'skipped', durationMs: Date.now() - startMs, artifacts: [],
    };
  }

  const dagPath = path.isAbsolute(dagFile)
    ? dagFile
    : path.join(this._options.agentsBaseDir, dagFile);

  if (!fs.existsSync(dagPath)) {
    r.warn(`DAG file not found: ${dagPath} — skipping step "${step.id}"`);
    return {
      stepId: step.id, stepName: step.name,
      status: 'skipped', durationMs: Date.now() - startMs, artifacts: [],
    };
  }

  try {
    const orchestrator = new DagOrchestrator(this._projectRoot, { verbose: this._options.verbose });
    const dagResult    = await orchestrator.run(dagPath);
    step.status        = dagResult.status === 'success' ? 'complete' : 'failed';
    step.completedAt   = new Date().toISOString();

    r.say(step.agent,
      dagResult.status === 'success'
        ? `✅ ${step.name} complete — ${dagResult.lanes?.length ?? 0} lane(s)`
        : `❌ ${step.name} failed`,
    );

    return {
      stepId:     step.id,
      stepName:   step.name,
      status:     dagResult.status === 'success' ? 'success' : 'failed',
      dagResult,
      durationMs: Date.now() - startMs,
      artifacts:  step.outputs,
    };
  } catch (err) {
    r.error(`Step "${step.id}" threw: ${err}`);
    step.status = 'failed';
    return {
      stepId: step.id, stepName: step.name,
      status: 'failed', durationMs: Date.now() - startMs, artifacts: [],
    };
  }
}
