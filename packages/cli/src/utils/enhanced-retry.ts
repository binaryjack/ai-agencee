/**
 * Enhanced Retry Wrapper (Phase 3.3)
 * 
 * Wraps existing retry logic with user-friendly explanations and live countdown.
 */

import {
  diagnoseError,
  formatRetryMessage,
  countdownWithProgress,
  calculateBackoffDelays,
} from './retry-formatter.js'

export interface EnhancedRetryConfig {
  maxRetries?: number
  initialDelay?: number
  backoffMultiplier?: number
  maxDelay?: number
  retryableErrors?: string[]
  silent?: boolean  // Disable enhanced UI (fallback to basic retry)
}

/**
 * Enhanced retry with explanations, countdown, and actionable tips.
 * 
 * This wraps the core retry logic with a user-friendly interface that:
 * - Diagnoses errors and explains what went wrong
 * - Shows retry schedule with exponential backoff
 * - Provides actionable tips based on error type
 * - Displays live countdown before retry
 */
export async function enhancedRetryWithExplanation<T>(
  fn: () => Promise<T>,
  config: EnhancedRetryConfig = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    backoffMultiplier = 2,
    maxDelay = 30000,
    retryableErrors = [
      'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH',
      'rate_limit', 'timeout', '429', '503', '504'
    ],
    silent = false,
  } = config

  let lastError: Error | null = null
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      lastError = error as Error

      // Check if error is retryable
      const errorObj = error as Error & { code?: string; statusCode?: number }
      const isRetryable = retryableErrors.some(pattern =>
        (errorObj?.message || '').includes(pattern) ||
        (errorObj?.code || '').includes(pattern) ||
        (errorObj?.name || '').includes('RetryableError')
      )

      // Don't retry if not retryable or max attempts reached
      if (!isRetryable || attempt === maxRetries) {
        throw error
      }

      // Calculate actual delay with jitter
      const jitter = Math.random() * 0.1 * delay  // 10% jitter
      const actualDelay = Math.min(delay + jitter, maxDelay)

      // Enhanced UI output (unless silent mode)
      if (silent) {
        // Silent mode - basic log
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(actualDelay)}ms...`)
        await sleep(actualDelay)
      } else {
        // Diagnose error
        const diagnosis = diagnoseError(errorObj)

        // Calculate future delays for display
        const futureDelays = calculateBackoffDelays(
          attempt,
          maxRetries,
          initialDelay,
          backoffMultiplier,
          maxDelay
        )

        // Show retry message with tips
        const message = formatRetryMessage(
          diagnosis,
          attempt + 1,
          maxRetries,
          futureDelays
        )
        console.log(message)

        // Live countdown
        await countdownWithProgress(actualDelay)

        console.log('\n🔄 Retrying now...\n')
      }

      // Exponential backoff for next attempt
      delay *= backoffMultiplier
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry with explanation - shorter alias
 */
export const retryWithExplanation = enhancedRetryWithExplanation
