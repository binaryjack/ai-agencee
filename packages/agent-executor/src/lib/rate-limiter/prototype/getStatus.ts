import type { IRateLimiter } from '../rate-limiter.js';
import type { RateLimitConfig, RateLimitStatus } from '../rate-limiter.types.js';

export async function getStatus(
  this:      IRateLimiter,
  principal: string,
  config?:   RateLimitConfig,
): Promise<RateLimitStatus> {
  await this._load();
  const ps          = this._getState(principal);
  const now         = Date.now();
  const windowStart = now - 60 * 60 * 1_000;
  const runsThisHour    = ps.runStartTimes.filter((t) => t >= windowStart).length;
  const today           = this._utcDate(now);
  const tokensUsedToday = ps.tokensByDay[today] ?? 0;

  let exceeded = false;
  let reason: string | undefined;

  if (config) {
    if (config.maxConcurrentRuns !== undefined && ps.concurrentRuns >= config.maxConcurrentRuns) {
      exceeded = true;
      reason   = `maxConcurrentRuns: ${ps.concurrentRuns}/${config.maxConcurrentRuns}`;
    } else if (config.maxRunsPerHour !== undefined && runsThisHour >= config.maxRunsPerHour) {
      exceeded = true;
      reason   = `maxRunsPerHour: ${runsThisHour}/${config.maxRunsPerHour}`;
    } else if (config.tokenBudgetPerDay !== undefined && tokensUsedToday >= config.tokenBudgetPerDay) {
      exceeded = true;
      reason   = `tokenBudgetPerDay: ${tokensUsedToday}/${config.tokenBudgetPerDay}`;
    }
  }

  return { principal, tokensUsedToday, concurrentRuns: ps.concurrentRuns, runsThisHour, exceeded, reason };
}
