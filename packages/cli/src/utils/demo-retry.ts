/**
 * Demo script for Enhanced Retry with Explanations (Phase 3.3)
 * 
 * Run with: node --loader ts-node/esm demo-retry.ts
 */

import { enhancedRetryWithExplanation } from './enhanced-retry.js'

// Simulate different error types
class RateLimitError extends Error {
  statusCode = 429
  constructor() {
    super('Rate limit exceeded: Too Many Requests')
    this.name = 'RateLimitError'
  }
}

class TimeoutError extends Error {
  code = 'ETIMEDOUT'
  constructor() {
    super('Request timed out after 30s')
    this.name = 'TimeoutError'
  }
}

class ConnectionError extends Error {
  code = 'ECONNRESET'
  constructor() {
    super('Connection reset by peer')
    this.name = 'ConnectionError'
  }
}

/**
 * Demo 1: Rate limit error with retry
 */
async function demoRateLimit() {
  console.log('\n=== Demo 1: Rate Limit Error ===\n')

  let attempts = 0
  const maxAttempts = 2

  try {
    await enhancedRetryWithExplanation(async () => {
      attempts++
      if (attempts < maxAttempts) {
        throw new RateLimitError()
      }
      return 'Success!'
    }, {
      maxRetries: 3,
      initialDelay: 2000,  // 2s for demo
      backoffMultiplier: 2,
      maxDelay: 10000,
    })

    console.log('✅ Request succeeded after retry!\n')
  } catch (error: unknown) {
    console.error('❌ Request failed after all retries:', (error as Error).message || error, '\n')
  }
}

/**
 * Demo 2: Timeout error
 */
async function demoTimeout() {
  console.log('\n=== Demo 2: Timeout Error ===\n')

  let attempts = 0
  const maxAttempts = 2

  try {
    await enhancedRetryWithExplanation(async () => {
      attempts++
      if (attempts < maxAttempts) {
        throw new TimeoutError()
      }
      return 'Success!'
    }, {
      maxRetries: 3,
      initialDelay: 3000,  // 3s for demo
    })

    console.log('✅ Request succeeded after retry!\n')
  } catch (error: unknown) {
    console.error('❌ Request failed after all retries:', (error as Error).message || error, '\n')
  }
}

/**
 * Demo 3: Connection error (immediate failure - non-retryable in this demo)
 */
async function demoConnection() {
  console.log('\n=== Demo 3: Connection Error ===\n')

  let attempts = 0
  const maxAttempts = 2

  try {
    await enhancedRetryWithExplanation(async () => {
      attempts++
      if (attempts < maxAttempts) {
        throw new ConnectionError()
      }
      return 'Success!'
    }, {
      maxRetries: 3,
      initialDelay: 2000,
    })

    console.log('✅ Request succeeded after retry!\n')
  } catch (error: unknown) {
    console.error('❌ Request failed after all retries:', (error as Error).message || error, '\n')
  }
}

/**
 * Run all demos
 */
async function main() {
  console.log('\n╔═══════════════════════════════════════════╗')
  console.log('║  Enhanced Retry Demo (Phase 3.3)         ║')
  console.log('╚═══════════════════════════════════════════╝')

  // Demo 1: Rate limit
  await demoRateLimit()

  // Demo 2: Timeout
  await demoTimeout()

  // Demo 3: Connection
  await demoConnection()

  console.log('\n=== All Demos Complete ===\n')
}

// Export for testing (no auto-run to avoid CommonJS issues)
// To run: node --loader ts-node/esm demo-retry.ts

export { demoRateLimit, demoTimeout, demoConnection }
