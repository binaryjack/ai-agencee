/**
 * Metrics collector
 */

import type { IMetricsCollector, Metrics } from './production.types.js';

export class MetricsCollector implements IMetricsCollector {
  private executions: number[] = [];  // Durations
  private costs: number[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;
  private retries = 0;
  private circuitBreaks = 0;
  private successes = 0;
  private failures = 0;
  
  recordExecution(duration: number, cost: number, success: boolean, cached: boolean, retryCount: number): void {
    this.executions.push(duration);
    this.costs.push(cost);
    
    if (cached) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
    
    if (success) {
      this.successes++;
    } else {
      this.failures++;
    }
    
    this.retries += retryCount;
  }
  
  recordCircuitBreak(): void {
    this.circuitBreaks++;
  }
  
  getMetrics(): Omit<Metrics, 'currentCircuitState'> {
    const sorted = [...this.executions].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
    
    const avg = this.executions.length > 0
      ? this.executions.reduce((sum, d) => sum + d, 0) / this.executions.length
      : 0;
    
    const avgCost = this.costs.length > 0
      ? this.costs.reduce((sum, c) => sum + c, 0) / this.costs.length
      : 0;
    
    const total = this.successes + this.failures;
    const avgRetries = total > 0 ? this.retries / total : 0;
    
    return {
      totalExecutions: total,
      successfulExecutions: this.successes,
      failedExecutions: this.failures,
      averageDuration: avg,
      p50Duration: p50,
      p95Duration: p95,
      p99Duration: p99,
      totalCost: this.costs.reduce((sum, c) => sum + c, 0),
      averageCost: avgCost,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheHitRate: (this.cacheHits + this.cacheMisses) > 0
        ? this.cacheHits / (this.cacheHits + this.cacheMisses)
        : 0,
      totalRetries: this.retries,
      averageRetries: avgRetries,
      circuitBreaks: this.circuitBreaks,
    };
  }
  
  reset(): void {
    this.executions = [];
    this.costs = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.retries = 0;
    this.circuitBreaks = 0;
    this.successes = 0;
    this.failures = 0;
  }
}
