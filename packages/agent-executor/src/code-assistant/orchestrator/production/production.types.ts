/**
 * Phase 5: Production Hardening Types
 * 
 * Error handling, retry logic, rate limiting, circuit breakers, and observability.
 */

/**
 * Retry configuration
 */
export interface RetryConfig {
  // Maximum number of retries (default: 3)
  maxRetries?: number;
  
  // Initial delay in ms (default: 1000)
  initialDelay?: number;
  
  // Backoff multiplier (default: 2 for exponential backoff)
  backoffMultiplier?: number;
  
  // Maximum delay in ms (default: 30000)
  maxDelay?: number;
  
  // Retry on these error types
  retryableErrors?: string[];  // e.g., ['ECONNRESET', 'ETIMEDOUT', 'rate_limit']
}

/**
 * Circuit breaker state
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  // Failure threshold to open circuit (default: 5)
  failureThreshold?: number;
  
  // Timeout to try half-open in ms (default: 60000 = 1 min)
  resetTimeout?: number;
  
  // Success threshold to close circuit when half-open (default: 2)
  successThreshold?: number;
}

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  // Max requests per window
  maxRequests?: number;  // default: 60
  
  // Time window in ms
  windowMs?: number;  // default: 60000 (1 minute)
  
  // Block when limit exceeded (vs queue)
  blockOnExceeded?: boolean;  // default: false
}

/**
 * Observability metrics
 */
export interface Metrics {
  // Execution metrics
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  
  // Performance metrics
  averageDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  
  // Cost metrics
  totalCost: number;
  averageCost: number;
  
  // Cache metrics
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  
  // Retry metrics
  totalRetries: number;
  averageRetries: number;
  
  // Circuit breaker metrics
  circuitBreaks: number;
  currentCircuitState: CircuitState;
}

/**
 * Production hardening configuration
 */
export interface ProductionConfig {
  projectRoot: string;
  
  // Retry config
  retry?: RetryConfig;
  
  // Circuit breaker config
  circuitBreaker?: CircuitBreakerConfig;
  
  // Rate limiter config
  rateLimiter?: RateLimiterConfig;
  
  // Enable metrics collection
  enableMetrics?: boolean;  // default: true
  
  // Enable structured logging
  enableLogging?: boolean;  // default: true
}

/**
 * Production hardening orchestrator options with dependency injection
 */
export interface ProductionHardeningOptions {
  config: ProductionConfig;
  
  // Optional dependencies for testing/customization
  circuitBreaker?: ICircuitBreaker;
  rateLimiter?: IRateLimiter;
  metrics?: IMetricsCollector;
}

/**
 * Circuit breaker interface
 */
export interface ICircuitBreaker {
  isOpen(): boolean;
  recordSuccess(): void;
  recordFailure(): void;
  reset(): void;
  getState(): CircuitState;
}

/**
 * Rate limiter interface
 */
export interface IRateLimiter {
  tryAcquire(): Promise<boolean>;
  reset(): void;
}

/**
 * Metrics collector interface
 */
export interface IMetricsCollector {
  recordExecution(duration: number, cost: number, success: boolean, cached: boolean, retries: number): void;
  recordCircuitBreak(): void;
  getMetrics(): Omit<Metrics, 'currentCircuitState'>;
  reset(): void;
}

/**
 * Error types
 */
export class RetryableError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'RetryableError';
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string = 'Circuit breaker is open') {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class RateLimitExceededError extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

/**
 * Production hardening orchestrator interface
 */
export interface IProductionHardening {
  // Execute with retry logic
  executeWithRetry<T>(fn: () => Promise<T>): Promise<T>;
  
  // Check circuit breaker state
  checkCircuitBreaker(): boolean;
  
  // Record success/failure for circuit breaker
  recordSuccess(): void;
  recordFailure(): void;
  
  // Check rate limiter
  checkRateLimit(): Promise<boolean>;
  
  // Get metrics
  getMetrics(): Metrics;
  
  // Reset all state
  reset(): void;
}
