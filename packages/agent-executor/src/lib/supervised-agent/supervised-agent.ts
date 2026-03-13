import * as fs from 'fs/promises'
import type { AgentDefinition, AgentResult } from '../agent-types.js'
import type { CheckpointMode, CheckpointPayload, ContractSnapshot, SupervisorVerdict } from '../dag-types.js'
import type { IModelRouter, RoutedResponse } from '../model-router/index.js'
import { run } from './prototype/run.js'

export interface ISupervisedAgent {
  _definition: AgentDefinition;
  name: string;
  icon: string;
  run(
    projectRoot: string,
    defaultMode?: CheckpointMode,
    publishContract?: () => ContractSnapshot,
    modelRouter?: IModelRouter,
    onLlmResponse?: (response: RoutedResponse) => void,
    onLlmStream?: (token: string) => void,
  ): AsyncGenerator<CheckpointPayload, AgentResult | null, SupervisorVerdict>;
}

export const SupervisedAgent = function(
  this: ISupervisedAgent,
  definition: AgentDefinition,
) {
  this._definition = definition;
  this.name = definition.name;
  this.icon = definition.icon;
} as unknown as {
  new(definition: AgentDefinition): ISupervisedAgent;
  fromFile(agentFile: string): Promise<ISupervisedAgent>;
};

(SupervisedAgent as unknown as Record<string, unknown>).fromFile = async function(agentFile: string): Promise<ISupervisedAgent> {
  const raw = await fs.readFile(agentFile, 'utf-8');
  const definition: AgentDefinition = JSON.parse(raw);
  return new SupervisedAgent(definition);
};

// Attach prototype methods after SupervisedAgent is defined (avoids circular-import race)
Object.assign((SupervisedAgent as unknown as { prototype: object }).prototype, { run });

// ─── Error Types ────────────────────────────────────────────────────────────────

class EscalationError extends Error {
  constructor(
    message: string,
    public readonly verdict: SupervisorVerdict,
  ) {
    super(message);
    this.name = 'EscalationError';
  }
}
export { EscalationError }

