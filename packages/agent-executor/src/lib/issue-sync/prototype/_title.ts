import type { DagEndEvent } from '../../dag-events/index.js';
import type { IIssueSync } from '../issue-sync.js';

export function _title(this: IIssueSync, event: DagEndEvent): string {
  const statusLabel = event.status === 'failed' ? '🔴 FAILED' : '🟡 PARTIAL';
  return `[${statusLabel}] DAG "${event.dagName}" — run ${event.runId}`;
}
