/**
 * Circuit breaker pattern
 * 
 * Opens circuit after N failures, closes after successful test in half-open state.
 */

import type { CircuitBreakerConfig, CircuitState, ICircuitBreaker } from './production.types.js';

export class CircuitBreaker implements ICircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttemptTime: number = 0;
  
  constructor(private readonly config: CircuitBreakerConfig = {}) {}
  
  /**
   * Check if circuit allows execution
   */
  isOpen(): boolean {
    const now = Date.now();
    
    if (this.state === 'open') {
      // Check if we should try half-open
      if (now >= this.nextAttemptTime) {
        this.state = 'half-open';
        this.successCount = 0;
        return false;  // Allow one attempt
      }
      return true;  // Still open
    }
    
    return false;
  }
  
  /**
   * Record successful execution
   */
  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      
      const successThreshold = this.config.successThreshold || 2;
      if (this.successCount >= successThreshold) {
        this.state = 'closed';
        this.failureCount = 0;
      }
    } else {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }
  
  /**
   * Record failed execution
   */
  recordFailure(): void {
    this.failureCount++;
    
    const failureThreshold = this.config.failureThreshold || 5;
    
    if (this.failureCount >= failureThreshold) {
      this.state = 'open';
      const resetTimeout = this.config.resetTimeout || 60000;
      this.nextAttemptTime = Date.now() + resetTimeout;
    }
  }
  
  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }
  
  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = 0;
  }
}
