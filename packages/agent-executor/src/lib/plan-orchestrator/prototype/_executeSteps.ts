import type { IChatRenderer } from '../../chat-renderer/index.js';
import type { PlanDefinition, StepDefinition } from '../../plan-types.js';
import type { IPlanOrchestrator, PlanStepResult } from '../plan-orchestrator.js';

export async function _executeSteps(
  this: IPlanOrchestrator,
  plan: PlanDefinition,
  r:    IChatRenderer,
): Promise<PlanStepResult[]> {
  const results: PlanStepResult[] = [];
  const groups = this._topoGroups(plan.steps);

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi]!;
    r.say('system', `Group ${gi + 1}/${groups.length}: ${group.map((s) => s.id).join(', ')}`);

    for (const step of group) {
      const precedingStep = plan.steps.find(
        (s) => s.alignmentGate && s.alignmentGate.blocksStepIds.includes(step.id),
      );
      if (precedingStep?.alignmentGate && !precedingStep.alignmentGate.resolved) {
        const gate = precedingStep.alignmentGate;
        if (gate.type === 'user') {
          r.approvalPrompt(`Gate "${gate.id}": ${gate.description}  (type Enter to continue)`);
          if (process.stdout.isTTY) {
            await this._waitForAnyInput();
          }
          gate.resolved   = true;
          gate.resolvedAt = new Date().toISOString();
        } else if (gate.type === 'auto') {
          gate.resolved   = true;
          gate.resolvedAt = new Date().toISOString();
        }
      }
    }

    const parallelSteps   = group.filter((s) => s.parallel);
    const sequentialSteps = group.filter((s) => !s.parallel);

    for (const step of sequentialSteps) {
      const res = await this._runStep(step, plan);
      results.push(res);
    }

    if (parallelSteps.length > 0) {
      r.say('system', `Running ${parallelSteps.length} parallel steps: ${parallelSteps.map((s: StepDefinition) => s.id).join(', ')}`);
      const parallelResults = await Promise.all(parallelSteps.map((s) => this._runStep(s, plan)));
      results.push(...parallelResults);
    }
  }

  return results;
}
