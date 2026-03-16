import type { IIssueSync } from '../issue-sync.js';

export function _extraJiraFields(this: IIssueSync): Record<string, unknown> {
  if (!this._opts.extraFields) return {};
  return {};
}
