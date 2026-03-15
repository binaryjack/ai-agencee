export interface RateLimitConfig {
  /** Maximum total tokens (inputTokens + outputTokens) consumed in a calendar day (UTC) */
  tokenBudgetPerDay?: number;
  /** Maximum number of simultaneously running DAG runs for this principal */
  maxConcurrentRuns?: number;
  /** Maximum DAG run starts within any rolling 60-minute window */
  maxRunsPerHour?: number;
}

export interface RateLimitStatus {
  principal: string;
  /** Tokens used since UTC midnight today */
  tokensUsedToday: number;
  /** Currently running DAG count */
  concurrentRuns: number;
  /** Run starts in the last 60 minutes */
  runsThisHour: number;
  /** Whether any limit is currently exceeded */
  exceeded: boolean;
  /** Human-readable reason, present when `exceeded` is true */
  reason?: string;
}

export interface PrincipalState {
  runStartTimes: number[];
  concurrentRuns: number;
  tokensByDay: Record<string, number>;
}

export interface PersistedState {
  version: 1;
  updatedAt: string;
  principals: Record<string, PrincipalState>;
}

type RateLimitExceededErrorMutable = Error & {
  principal:         string
  limitType:         'tokenBudgetPerDay' | 'maxConcurrentRuns' | 'maxRunsPerHour'
  current:           number
  limit:             number
  retryAfterSeconds: number
}
export type RateLimitExceededErrorInstance = Error & {
  readonly principal:         string
  readonly limitType:         'tokenBudgetPerDay' | 'maxConcurrentRuns' | 'maxRunsPerHour'
  readonly current:           number
  readonly limit:             number
  readonly retryAfterSeconds: number
}

export const RateLimitExceededError = function(
  this: RateLimitExceededErrorMutable,
  principal:         string,
  limitType:         'tokenBudgetPerDay' | 'maxConcurrentRuns' | 'maxRunsPerHour',
  current:           number,
  limit:             number,
  retryAfterSeconds: number,
): void {
  const msg              = `Rate limit exceeded for "${principal}": ${limitType} (${current}/${limit}). Retry after ${retryAfterSeconds}s.`
  this.name              = 'RateLimitExceededError'
  this.message           = msg
  this.principal         = principal
  this.limitType         = limitType
  this.current           = current
  this.limit             = limit
  this.retryAfterSeconds = retryAfterSeconds
  this.stack             = new Error(msg).stack
} as unknown as new (
  principal: string,
  limitType: 'tokenBudgetPerDay' | 'maxConcurrentRuns' | 'maxRunsPerHour',
  current: number,
  limit: number,
  retryAfterSeconds: number,
) => RateLimitExceededErrorInstance

Object.setPrototypeOf(RateLimitExceededError.prototype, Error.prototype)

export type RateLimitExceededError = RateLimitExceededErrorInstance
