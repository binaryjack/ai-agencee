import { extractMarker } from './extract-marker.js'
import { type GitHubComment } from './github-comment.types.js'

export async function deleteBotComments(
  commentsUrl: string,
  headers: Record<string, string>,
  newBody: string,
): Promise<void> {
  try {
    const resp = await fetch(`${commentsUrl}?per_page=100`, { headers });
    if (!resp.ok) return;

    const comments = (await resp.json()) as GitHubComment[];
    const MARKER = extractMarker(newBody);

    for (const comment of comments) {
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
