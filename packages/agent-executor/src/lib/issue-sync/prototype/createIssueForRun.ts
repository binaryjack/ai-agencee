import type { DagEndEvent } from '../../dag-events/index.js';
import type { CreatedIssue, IIssueSync } from '../issue-sync.js';

export async function createIssueForRun(
  this:  IIssueSync,
  event: DagEndEvent,
): Promise<CreatedIssue | undefined> {
  const { failuresOnly = false } = this._opts;

  if (event.status === 'success') return undefined;
  if (failuresOnly && event.status !== 'failed') return undefined;

  const title = this._title(event);
  const body  = this._body(event);

  if (this._opts.provider === 'jira') {
    return this._createJiraIssue(title, body, event);
  } else {
    return this._createLinearIssue(title, body, event);
  }
}
