import { randomUUID } from 'crypto';
import * as path from 'path';
import { promptUser } from '../../chat-renderer/index.js';
import type {
    ActorId,
    AlignmentGate,
    DiscoveryResult,
    PlanDefinition,
    QualityGrade,
} from '../../plan-types.js';
import type { IPlanSynthesizer } from '../plan-synthesizer.js';
import { selectAgents } from '../plan-synthesizer.js';

export async function synthesize(
  this:      IPlanSynthesizer,
  discovery: DiscoveryResult,
): Promise<PlanDefinition> {
  const r = this._renderer;

  r.phaseHeader('synthesize');
  r.say('ba',
    `Based on our discovery session I'm now assembling the team and building the plan skeleton. `
    + `Project: "${discovery.projectName}" — Quality grade: ${discovery.qualityGrade.toUpperCase()}`,
  );
  r.newline();

  const agents = selectAgents(discovery);
  r.say('ba', `Selected agents: ${agents.map((a) => `${a}`).join(' · ')}`);
  r.newline();

  r.separator();
  for (const agentId of agents.filter((a) => a !== 'ba')) {
    const intro = await this._agentIntroduction(agentId as ActorId, discovery);
    r.say(agentId as ActorId, intro);
  }
  r.separator();
  r.newline();

  const steps = await this._buildStepsWithFallback(discovery, agents);

  r.say('ba', `Plan skeleton ready — ${steps.length} steps:`);
  r.newline();
  for (const step of steps) {
    const deps = step.dependsOn.length > 0 ? ` (after: ${step.dependsOn.join(', ')})` : ' (starts immediately)';
    const par  = step.parallel ? ' ⇒ runs in parallel with siblings' : '';
    r.system(`  ${step.id.padEnd(16)} ${step.name}${deps}${par}`);
  }
  r.newline();

  let approved = false;
  while (!approved) {
    r.approvalPrompt('Review the plan above. Type "ok" to approve, or describe changes.');
    const response = await promptUser(r, '');
    if (!response || ['ok', 'yes', 'y', 'approve', 'looks good', 'lgtm'].includes(response.toLowerCase())) {
      approved = true;
      r.say('ba', 'Plan skeleton approved. Moving to sprint planning.');
    } else {
      r.say('ba', `Understood — "${response}". Let me adjust…`);
      const feedback = await this._processApprovalFeedback(response, steps, discovery);
      r.say('ba', feedback);
      r.say('ba', 'Type "ok" to continue with the current plan, or describe another change.');
    }
  }

  const allGates: AlignmentGate[] = steps
    .filter((s) => s.alignmentGate)
    .map((s) => s.alignmentGate!);

  const plan: PlanDefinition = {
    id:             randomUUID(),
    name:           discovery.projectName,
    description:    discovery.problem,
    version:        '1.0',
    phase:          'synthesize',
    qualityGrade:   discovery.qualityGrade as QualityGrade,
    discoveryRef:   path.join('.agencee', 'plan-state', 'discovery.json'),
    steps,
    alignmentGates: allGates,
    artifacts:      [],
    createdAt:      new Date().toISOString(),
    updatedAt:      new Date().toISOString(),
  };

  this._save(plan);

  r.phaseSummary('synthesize', [
    `Plan ID: ${plan.id}`,
    `Steps:   ${steps.length}`,
    `Gates:   ${allGates.length}`,
  ]);

  return plan;
}
