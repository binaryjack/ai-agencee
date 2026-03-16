import type { IRateLimiter } from '../rate-limiter.js';

export async function recordTokens(
  this:         IRateLimiter,
  principal:    string,
  inputTokens:  number,
  outputTokens: number,
): Promise<void> {
  await this._load();
  const ps    = this._getState(principal);
  const today = this._utcDate(Date.now());
  ps.tokensByDay[today] = (ps.tokensByDay[today] ?? 0) + inputTokens + outputTokens;
  const keep = new Set(Object.keys(ps.tokensByDay).sort().slice(-8));
  for (const k of Object.keys(ps.tokensByDay)) {
    if (!keep.has(k)) delete ps.tokensByDay[k];
  }
  await this._save();
}
