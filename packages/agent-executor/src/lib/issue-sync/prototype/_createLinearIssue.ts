import type { DagEndEvent } from '../../dag-events/index.js';
import type { CreatedIssue, IIssueSync } from '../issue-sync.js';
import { httpPost } from './httpPost.js';

export async function _createLinearIssue(
  this:  IIssueSync,
  title: string,
  body:  string,
  event: DagEndEvent,
): Promise<CreatedIssue> {
  const linear = this._opts.linear;
  if (!linear) throw new Error('IssueSync: Linear options not provided');

  const priorityMap: Record<string, number> = { failed: 1, partial: 2, success: 3 };
  const priority = priorityMap[event.status] ?? 3;

  const query = `
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          url
        }
      }
    }
  `;

  const variables = {
    input: {
      teamId:      linear.teamId,
      title,
      description: body,
      priority,
      labelIds:    [],
    },
  };

  const data = await httpPost(
    'https://api.linear.app/graphql',
    { Authorization: linear.apiKey, 'Content-Type': 'application/json' },
    { query, variables },
  ) as {
    data?: {
      issueCreate?: {
        success: boolean;
        issue?: { id: string; identifier: string; url: string };
      };
    };
    errors?: Array<{ message: string }>;
  };

  if (data.errors?.length) {
    throw new Error(`Linear GraphQL error: ${data.errors.map((e) => e.message).join(', ')}`);
  }

  const issue = data.data?.issueCreate?.issue;
  if (!issue) throw new Error('Linear: issueCreate returned no issue object');

  return { provider: 'linear', id: issue.identifier, url: issue.url, title };
}
