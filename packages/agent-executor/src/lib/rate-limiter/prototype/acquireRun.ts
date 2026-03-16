import type { IRateLimiter } from '../rate-limiter.js';

export async function acquireRun(this: IRateLimiter, principal: string): Promise<() => void> {
  await this._load();
  const ps = this._getState(principal);
  ps.concurrentRuns += 1;
  ps.runStartTimes.push(Date.now());
  const cutoff = Date.now() - 60 * 60 * 1_000;
  ps.runStartTimes = ps.runStartTimes.filter((t) => t >= cutoff);
  await this._save();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const s = this._getState(principal);
    s.concurrentRuns = Math.max(0, s.concurrentRuns - 1);
    this._save().catch(() => undefined);
  };
}
