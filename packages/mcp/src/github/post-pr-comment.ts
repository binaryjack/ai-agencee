import { deleteBotComments } from './delete-bot-comments.js'
import { type PostPrCommentOptions } from './post-pr-comment-options.types.js'

export async function postPrComment(options: PostPrCommentOptions): Promise<string> {
  const token = options.token ?? process.env['GITHUB_TOKEN'] ?? '';
  const repository = options.repository ?? process.env['GITHUB_REPOSITORY'] ?? '';
  const prNumber = options.prNumber ?? Number(process.env['GITHUB_PR_NUMBER'] ?? '0');
  const replacePrevious = options.replacePrevious ?? true;

  if (!token) throw new Error('GITHUB_TOKEN is required');
  if (!repository) throw new Error('GITHUB_REPOSITORY is required (e.g. "owner/repo")');
  if (!prNumber || isNaN(prNumber)) throw new Error('GITHUB_PR_NUMBER is required');

  const [owner, repo] = repository.split('/');
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ai-kit-mcp-agent/1.0',
  };

  if (replacePrevious) {
    await deleteBotComments(`${baseUrl}/issues/${prNumber}/comments`, headers, options.body);
  }

  const resp = await fetch(`${baseUrl}/issues/${prNumber}/comments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ body: options.body }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`GitHub API error ${resp.status}: ${err}`);
  }

  const data = (await resp.json()) as { html_url: string };
  return data.html_url;
}
