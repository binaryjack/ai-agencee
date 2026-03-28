/**
 * Retry logic with exponential backoff
 */

import type { RetryConfig } from './production.types.js';

const DEFAULT_RETRYABLE_ERRORS = [
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'rate_limit',
  'timeout',
  '429',  // Too Many Requests
  '503',  // Service Unavailable
  '504',  // Gateway Timeout
];

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    backoffMultiplier = 2,
    maxDelay = 30000,
    retryableErrors = DEFAULT_RETRYABLE_ERRORS,
  } = config;
  
  let lastError: Error | null = null;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error as Error;
      
      // Check if error is retryable
      const errorObj = error as Error & { code?: string };
      const isRetryable = retryableErrors.some(pattern =>
        (errorObj?.message || '').includes(pattern) ||
        (errorObj?.code || '').includes(pattern) ||
        (errorObj?.name || '').includes('RetryableError')
      );
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry with exponential backoff
      const jitter = Math.random() * 0.1 * delay;  // Add 10% jitter
      const actualDelay = Math.min(delay + jitter, maxDelay);
      
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(actualDelay)}ms...`);
      
      await sleep(actualDelay);
      
      // Exponential backoff
      delay *= backoffMultiplier;
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
