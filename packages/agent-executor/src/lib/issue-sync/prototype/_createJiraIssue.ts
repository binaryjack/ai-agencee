import type { DagEndEvent } from '../../dag-events/index.js';
import type { CreatedIssue, IIssueSync } from '../issue-sync.js';
import { httpPost } from './httpPost.js';

export async function _createJiraIssue(
  this:  IIssueSync,
  title: string,
  body:  string,
  event: DagEndEvent,
): Promise<CreatedIssue> {
  const jira = this._opts.jira;
  if (!jira) throw new Error('IssueSync: Jira options not provided');

  const issueType = event.status === 'failed' ? (jira.issueType ?? 'Bug') : 'Task';

  const payload = {
    fields: {
      project:     { key: jira.projectKey },
      summary:     title,
      description: {
        type:    'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: body }] }],
      },
      issuetype: { name: issueType },
      priority:  { name: event.status === 'failed' ? 'High' : 'Medium' },
      labels:    ['ai-agent-run', `dag:${event.dagName}`],
      ...this._extraJiraFields(),
    },
  };

  const auth = Buffer.from(`${jira.email}:${jira.token}`).toString('base64');
  const data = await httpPost(
    `${jira.url.replace(/\/$/, '')}/rest/api/3/issue`,
    { Authorization: `Basic ${auth}` },
    payload,
  ) as { id: string; key: string; self: string };

  const issueUrl = `${jira.url.replace(/\/$/, '')}/browse/${data.key}`;
  return { provider: 'jira', id: data.key, url: issueUrl, title };
}
