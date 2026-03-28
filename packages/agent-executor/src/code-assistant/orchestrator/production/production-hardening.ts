/**
 * @file production-hardening.ts
 * @description Production-grade hardening orchestrator
 * 
 * SOLID Principles Applied:
 * 
 * 1. Single Responsibility Principle (SRP):
 *    - This class has ONE responsibility: coordinate production hardening features
 *    - Retry logic → delegated to retry-logic.ts
 *    - Circuit breaking → delegated to CircuitBreaker class
 *    - Rate limiting → delegated to RateLimiter class
 *    - Metrics → delegated to MetricsCollector class
 * 
 * 2. Dependency Inversion Principle (DIP):
 *    - Depends on abstractions (ICircuitBreaker, IRateLimiter, IMetricsCollector)
 *    - NOT on concrete implementations
 *    - Allows easy testing with mocks
 *    - Constructor injection enables runtime configuration
 * 
 * 3. Interface Segregation Principle (ISP):
 *    - Uses focused interfaces:
 *      - ICircuitBreaker: only 3 methods (isOpen, recordSuccess, recordFailure)
 *      - IRateLimiter: only 1 method (tryAcquire)
 *      - IMetricsCollector: metrics-specific methods only
 *    - No fat interfaces forcing unnecessary dependencies
 * 
 * Example Usage:
 * ```typescript
 * // Default behavior
 * const hardening = new ProductionHardeningOrchestrator({ config });
 * 
 * // Custom dependencies (testing or different implementations)
 * const hardening = new ProductionHardeningOrchestrator({
 *   config,
 *   circuitBreaker: mockCircuitBreaker,
 *   rateLimiter: customRateLimiter,
 *   metrics: new CloudMetricsCollector(),
 * });
 * ```
 */

import { CircuitBreaker } from './circuit-breaker.js'
import { MetricsCollector } from './metrics-collector.js'
import type {
    ICircuitBreaker,
    IMetricsCollector,
    IProductionHardening,
    IRateLimiter,
    Metrics,
    ProductionConfig,
    ProductionHardeningOptions,
} from './production.types.js'
import { CircuitBreakerOpenError, RateLimitExceededError } from './production.types.js'
import { RateLimiter } from './rate-limiter.js'
import { retryWithBackoff } from './retry-logic.js'

/**
 * Production hardening orchestrator
 * 
 * Coordinates retry logic, circuit breaking, rate limiting, and metrics.
 * Demonstrates Dependency Inversion: depends on interfaces, not implementations.
 */
export class ProductionHardeningOrchestrator implements IProductionHardening {
  private readonly circuitBreaker: ICircuitBreaker;
  private readonly rateLimiter: IRateLimiter;
  private readonly metrics: IMetricsCollector;
  private readonly config: ProductionConfig;
  
  /**
   * Creates a production hardening orchestrator
   * 
   * @param options - Configuration and optional dependency overrides
   * 
   * Dependency Inversion in action:
   * - Accepts ICircuitBreaker, not CircuitBreaker (abstraction, not concrete)
   * - Accepts IRateLimiter, not RateLimiter
   * - Accepts IMetricsCollector, not MetricsCollector
   * - Provides sensible defaults while allowing full customization
   */
  constructor(options: ProductionHardeningOptions) {
    this.config = options.config;
    
    // Dependency injection with defaults
    // Callers can inject mocks for testing or custom implementations
    this.circuitBreaker = options.circuitBreaker || new CircuitBreaker(this.config.circuitBreaker);
    this.rateLimiter = options.rateLimiter || new RateLimiter(this.config.rateLimiter);
    this.metrics = options.metrics || new MetricsCollector();
  }
  
  async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit breaker
    if (this.circuitBreaker.isOpen()) {
      this.metrics.recordCircuitBreak();
      throw new CircuitBreakerOpenError();
    }
    
    // Check rate limiter
    const allowed = await this.rateLimiter.tryAcquire();
    if (!allowed) {
      throw new RateLimitExceededError();
    }
    
    // Execute with retry logic
    const start = Date.now();
    let retryCount = 0;
    
    try {
      const result = await retryWithBackoff(
        async () => {
          try {
            return await fn();
          } catch (error: unknown) {
            retryCount++;
            throw error;
          }
        },
        this.config.retry
      );
      
      const duration = Date.now() - start;
      this.circuitBreaker.recordSuccess();
      
      if (this.config.enableMetrics) {
        this.metrics.recordExecution(duration, 0, true, false, retryCount);
      }
      
      return result;
    } catch (error: unknown) {
      const duration = Date.now() - start;
      this.circuitBreaker.recordFailure();
      
      if (this.config.enableMetrics) {
        this.metrics.recordExecution(duration, 0, false, false, retryCount);
      }
      
      throw error;
    }
  }
  
  checkCircuitBreaker(): boolean {
    return !this.circuitBreaker.isOpen();
  }
  
  recordSuccess(): void {
    this.circuitBreaker.recordSuccess();
  }
  
  recordFailure(): void {
    this.circuitBreaker.recordFailure();
  }
  
  async checkRateLimit(): Promise<boolean> {
    return await this.rateLimiter.tryAcquire();
  }
  
  getMetrics(): Metrics {
    const metrics = this.metrics.getMetrics();
    return {
      ...metrics,
      currentCircuitState: this.circuitBreaker.getState(),
    };
  }
  
  reset(): void {
    this.circuitBreaker.reset();
    this.rateLimiter.reset();
    this.metrics.reset();
  }
}

export function createProductionHardening(config: ProductionConfig): IProductionHardening {
  return new ProductionHardeningOrchestrator({ config });
}

/**
 * Create production hardening with custom dependencies (for testing)
 */
export function createProductionHardeningWithDeps(
  options: ProductionHardeningOptions,
): IProductionHardening {
  return new ProductionHardeningOrchestrator(options);
}
