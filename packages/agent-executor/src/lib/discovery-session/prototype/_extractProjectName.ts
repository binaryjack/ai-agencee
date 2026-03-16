import { IDiscoverySession } from '../discovery-session.js';

export async function _extractProjectName(
  this: IDiscoverySession,
  problem: string,
): Promise<string> {
  if (this._modelRouter && problem.length > 10) {
    try {
      const resp = await this._modelRouter.route('file-analysis', {
        messages: [
          {
            role:    'system',
            content: 'Extract a short, memorable project name (2-4 words, title case) from '
              + 'this problem statement. Reply with ONLY the name, nothing else.',
          },
          { role: 'user', content: problem },
        ],
        maxTokens: 20,
      });
      const name = resp.content.trim().replace(/["']/g, '');
      if (name.length > 2 && name.length < 50) return name;
    } catch { /* fall through */ }
  }
  return problem.split(/\s+/).slice(0, 4).join(' ') || 'Unnamed Project';
}
