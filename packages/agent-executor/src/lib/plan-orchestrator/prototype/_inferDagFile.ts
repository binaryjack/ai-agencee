import type { PlanDefinition, StepDefinition } from '../../plan-types.js';
import type { IPlanOrchestrator } from '../plan-orchestrator.js';

export function _inferDagFile(
  this:  IPlanOrchestrator,
  step:  StepDefinition,
  _plan: PlanDefinition,
): string | null {
  const knownDags: Partial<Record<string, string>> = {
    requirements: 'dag.json',
    architecture: 'dag.json',
    backend:      'dag.json',
    frontend:     'dag.json',
    testing:      'dag.json',
    e2e:          'dag.json',
    security:     'audit.dag.json',
  };
  return knownDags[step.id] ?? null;
}
