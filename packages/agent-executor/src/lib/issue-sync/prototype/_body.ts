import type { DagEndEvent } from '../../dag-events/index.js';
import type { IIssueSync } from '../issue-sync.js';

export function _body(this: IIssueSync, event: DagEndEvent): string {
  const lines = [
    `DAG run ${event.runId} ended with status: ${event.status.toUpperCase()}`,
    `DAG name:    ${event.dagName}`,
    `Duration:    ${(event.durationMs / 1000).toFixed(1)}s`,
    `Timestamp:   ${event.timestamp}`,
  ];

  for (const [k, v] of Object.entries(this._opts.extraFields ?? {})) {
    lines.push(`${k}: ${v}`);
  }

  return lines.join('\n');
}
