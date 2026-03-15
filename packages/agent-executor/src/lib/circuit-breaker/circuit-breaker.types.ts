export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Human-readable provider name (used in error messages). */
  name: string;
  /** Consecutive failures before the circuit opens. Default: 5 */
  failureThreshold?: number;
  /** Milliseconds to wait before probing again. Default: 60_000 */
  cooldownMs?: number;
}

type CircuitBreakerOpenErrorMutable = Error & { providerName: string; recoverAfter: Date }
export type CircuitBreakerOpenErrorInstance = Error & {
  readonly providerName: string
  readonly recoverAfter: Date
}

export const CircuitBreakerOpenError = function(
  this: CircuitBreakerOpenErrorMutable,
  name:         string,
  recoverAfter: Date,
): void {
  this.name         = 'CircuitBreakerOpenError'
  this.message      = `[CircuitBreaker] Provider "${name}" is OPEN — fast-failing. Will retry after ${recoverAfter.toISOString()}.`
  this.providerName = name
  this.recoverAfter = recoverAfter
  this.stack        = new Error(this.message).stack
} as unknown as new (name: string, recoverAfter: Date) => CircuitBreakerOpenErrorInstance

Object.setPrototypeOf(CircuitBreakerOpenError.prototype, Error.prototype)

export type CircuitBreakerOpenError = CircuitBreakerOpenErrorInstance
