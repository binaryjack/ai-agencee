/**
 * Rate limiter (token bucket algorithm)
 */

import type { IRateLimiter, RateLimiterConfig } from './production.types.js';

export class RateLimiter implements IRateLimiter {
  private tokens: number;
  private lastRefill: number;
  
  constructor(private readonly config: RateLimiterConfig = {}) {
    const maxRequests = config.maxRequests || 60;
    this.tokens = maxRequests;
    this.lastRefill = Date.now();
  }
  
  /**
   * Try to acquire a token
   */
  async tryAcquire(): Promise<boolean> {
    this.refill();
    
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    
    if (this.config.blockOnExceeded) {
      return false;
    }
    
    // Wait for next token
    const windowMs = this.config.windowMs || 60000;
    const maxRequests = this.config.maxRequests || 60;
    const tokenDelay = windowMs / maxRequests;
    
    await new Promise(resolve => setTimeout(resolve, tokenDelay));
    
    return this.tryAcquire();
  }
  
  /**
   * Refill tokens based on time passed
   */
  private refill(): void {
    const now = Date.now();
    const windowMs = this.config.windowMs || 60000;
    const maxRequests = this.config.maxRequests || 60;
    
    const timePassed = now - this.lastRefill;
    const tokensToAdd = (timePassed / windowMs) * maxRequests;
    
    this.tokens = Math.min(maxRequests, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
  
  /**
   * Get current tokens
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }
  
  /**
   * Reset rate limiter
   */
  reset(): void {
    const maxRequests = this.config.maxRequests || 60;
    this.tokens = maxRequests;
    this.lastRefill = Date.now();
  }
}
