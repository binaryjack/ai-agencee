import { type DagEventMap } from '@ai-agencee/engine'

export const DAG_EVENT_TYPES: Array<keyof DagEventMap> = [
  'dag:start',
  'dag:end',
  'lane:start',
  'lane:end',
  'llm:call',
  'budget:exceeded',
  'rbac:denied',
  'checkpoint:complete',
];
