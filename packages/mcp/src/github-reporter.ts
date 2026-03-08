/**
 * G-44: GitHub PR Auto-Reporter
 *
 * Posts structured AI review summaries as GitHub PR comments.
 *
 * Requirements:
 *   - GITHUB_TOKEN env var (or pass token explicitly)
 *   - GITHUB_REPOSITORY env var in the form "owner/repo"
 *   - GITHUB_PR_NUMBER env var (integer)
 *
 * These are all set automatically by GitHub Actions.
 *
 * Usage:
 *   import { postPrComment } from './github-reporter.js';
 *   await postPrComment({ body: '## AI Review\n\n…' });
 *
 * To delete previous bot comments before posting a fresh one:
 *   await postPrComment({ body: '…', replacePrevious: true });
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PostPrCommentOptions {
  /** Markdown body of the comment */
  body: string;
  /**
   * If true, deletes any existing comments left by the same bot token before
   * posting.  Prevents duplicate comments on re-runs. Default: true
   */
  replacePrevious?: boolean;
  /** GitHub token. Falls back to GITHUB_TOKEN env. */
  token?: string;
  /** 'owner/repo'. Falls back to GITHUB_REPOSITORY env. */
  repository?: string;
  /** PR number. Falls back to GITHUB_PR_NUMBER env. */
  prNumber?: number;
}

interface GitHubComment {
  id: number;
  body: string;
  user: { login: string; type: string };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Post (or update) a comment on a GitHub Pull Request.
 * Returns the comment URL on success.
 */
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

  // ── 1. Delete previous bot comments ────────────────────────────────────────
  if (replacePrevious) {
    await deleteBotComments(`${baseUrl}/issues/${prNumber}/comments`, headers, options.body);
  }

  // ── 2. Post new comment ─────────────────────────────────────────────────────
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function deleteBotComments(
  commentsUrl: string,
  headers: Record<string, string>,
  newBody: string
): Promise<void> {
  try {
    const resp = await fetch(`${commentsUrl}?per_page=100`, { headers });
    if (!resp.ok) return;

    const comments = (await resp.json()) as GitHubComment[];
    const MARKER = extractMarker(newBody);

    for (const comment of comments) {
      // Only delete our own bot comments (Bot users or comments containing our marker)
      if (
        comment.user.type === 'Bot' ||
        (MARKER && comment.body.includes(MARKER))
      ) {
        const deleteUrl = `${commentsUrl}/${comment.id}`;
        await fetch(deleteUrl, { method: 'DELETE', headers }).catch(() => undefined);
      }
    }
  } catch {
    // non-fatal
  }
}

/**
 * Extract a unique marker from comment body to identify previous runs.
 * Looks for an HTML comment like <!-- ai-kit:marker -->
 */
function extractMarker(body: string): string | null {
  const m = /<!--\s*(ai-kit:[^\s]+)\s*-->/.exec(body);
  return m?.[1] ?? null;
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

/**
 * Build a well-structured PR comment body from a DAG run summary.
 */
export function buildPrCommentBody(options: {
  dagName: string;
  runId: string;
  status: 'success' | 'partial' | 'failed';
  lanes: Array<{ id: string; status: string; durationMs: number }>;
  totalCostUSD: number;
  summary?: string;
}): string {
  const { dagName, runId, status, lanes, totalCostUSD, summary } = options;

  const statusEmoji = status === 'success' ? '✅' : status === 'partial' ? '⚠️' : '❌';
  const marker = `<!-- ai-kit:pr-comment -->`;

  const laneRows = lanes
    .map((l) => `| ${l.id} | ${l.status} | ${(l.durationMs / 1000).toFixed(1)}s |`)
    .join('\n');

  return [
    marker,
    `## ${statusEmoji} AI Review — ${dagName}`,
    '',
    `**Run ID:** \`${runId}\`  **Status:** ${status}  **Cost:** $${totalCostUSD.toFixed(4)}`,
    '',
    summary ? `### Summary\n${summary}\n` : '',
    '### Lane Results',
    '',
    '| Lane | Status | Duration |',
    '|------|--------|----------|',
    laneRows,
    '',
    `<sub>Generated by [ai-agencee](https://github.com/binaryjack/ai-agencee) — ${new Date().toISOString()}</sub>`,
  ]
    .filter((l) => l !== null)
    .join('\n');
}
