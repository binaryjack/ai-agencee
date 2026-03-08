import type { DagStep } from './dag-step.types.js';

export interface DagDefinition {
  name?: string;
  description?: string;
  steps?: DagStep[];
  lanes?: Array<{ id: string; agent?: string; dependsOn?: string[] }>;
  barriers?: Array<{ after: string[] }>;
}
