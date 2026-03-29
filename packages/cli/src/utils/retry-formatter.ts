/**
 * Enhanced Retry with Explanations (Phase 3.3)
 * 
 * Provides clear errors, actionable tips, and live countdown for retries.
 */

/**
 * Error categories with explanations and actionable tips
 */
export interface ErrorDiagnosis {
  category: string
  issue: string
  cause: string
  tips: string[]
  emoji: string
}

/**
 * Diagnose error and provide actionable guidance
 */
export function diagnoseError(error: Error & { code?: string; statusCode?: number }): ErrorDiagnosis {
  const message = error.message || ''
  const code = error.code || ''
  const status = error.statusCode

  // Rate limiting (429)
  if (message.includes('429') || message.includes('rate_limit') || message.includes('Too Many Requests') || status === 429) {
    return {
      category: 'Rate Limit',
      issue: 'Rate limit hit (429 Too Many Requests)',
      cause: 'Sending too many requests to the API provider',
      tips: [
        'Reduce parallel agents with --max-concurrency 2',
        'Increase delays between requests',
        'Check your API tier limits',
        'Consider upgrading your API plan',
      ],
      emoji: '⏱️',
    }
  }

  // Network timeouts
  if (code === 'ETIMEDOUT' || message.includes('timeout') || message.includes('timed out')) {
    return {
      category: 'Network Timeout',
      issue: 'Request timed out',
      cause: 'Network latency or slow API response',
      tips: [
        'Check your internet connection',
        'Try again in a few moments',
        'Increase timeout with --timeout flag',
        'Consider using a faster model tier',
      ],
      emoji: '⏳',
    }
  }

  // Connection errors
  if (code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'EHOSTUNREACH') {
    return {
      category: 'Connection Error',
      issue: `Network connection failed (${code})`,
      cause: 'Unable to reach API server',
      tips: [
        'Check your internet connection',
        'Verify API endpoint is accessible',
        'Check firewall/proxy settings',
        'Retry in a few moments',
      ],
      emoji: '🔌',
    }
  }

  // Service unavailable (503)
  if (message.includes('503') || message.includes('Service Unavailable') || status === 503) {
    return {
      category: 'Service Unavailable',
      issue: 'API service temporarily unavailable (503)',
      cause: 'API provider is experiencing issues or maintenance',
      tips: [
        'Wait a few moments and retry',
        'Check API status page',
        'Use --provider mock for testing',
        'Consider fallback provider',
      ],
      emoji: '🚧',
    }
  }

  // Gateway timeout (504)
  if (message.includes('504') || message.includes('Gateway Timeout') || status === 504) {
    return {
      category: 'Gateway Timeout',
      issue: 'API gateway timeout (504)',
      cause: 'Request took too long to process',
      tips: [
        'Try with a smaller input',
        'Use faster model tier (haiku)',
        'Retry in a few moments',
        'Check API status page',
      ],
      emoji: '⏱️',
    }
  }

  // Authentication errors (401, 403)
  if (message.includes('401') || message.includes('Unauthorized') || message.includes('Invalid API key') || status === 401) {
    return {
      category: 'Authentication Error',
      issue: 'Invalid or missing API key (401)',
      cause: 'API key is incorrect or not configured',
      tips: [
        'Run "ai-kit setup" to configure API keys',
        'Check ANTHROPIC_API_KEY environment variable',
        'Verify API key is valid and active',
        'Generate new API key if needed',
      ],
      emoji: '🔑',
    }
  }

  if (message.includes('403') || message.includes('Forbidden') || status === 403) {
    return {
      category: 'Permission Error',
      issue: 'Access forbidden (403)',
      cause: 'API key lacks required permissions',
      tips: [
        'Check API key permissions',
        'Verify API tier supports this operation',
        'Contact API provider for access',
        'Use different API key with proper permissions',
      ],
      emoji: '🚫',
    }
  }

  // Context length errors
  if (message.includes('context_length') || message.includes('maximum context') || message.includes('too long')) {
    return {
      category: 'Context Length Exceeded',
      issue: 'Input too large for model context window',
      cause: 'Request exceeds maximum token limit',
      tips: [
        'Reduce input size or file count',
        'Use file filtering with --include patterns',
        'Split into smaller chunks',
        'Use model with larger context (claude-3)',
      ],
      emoji: '📏',
    }
  }

  // Generic API errors
if (message.includes('API') || message.includes('api')) {
    return {
      category: 'API Error',
      issue: 'API request failed',
      cause: message.substring(0, 100),
      tips: [
        'Check error message for details',
        'Verify API configuration',
        'Try again in a few moments',
        'Run "ai-kit doctor" for diagnostics',
      ],
      emoji: '⚠️',
    }
  }

  // Unknown errors
  return {
    category: 'Unknown Error',
    issue: 'Unexpected error occurred',
    cause: message.substring(0, 100) || 'No error message available',
    tips: [
      'Check error details above',
      'Run "ai-kit doctor" for diagnostics',
      'Enable --verbose for more details',
      'Report issue if it persists',
    ],
    emoji: '❓',
  }
}

/**
 * Format retry message with live countdown
 */
export function formatRetryMessage(
  diagnosis: ErrorDiagnosis,
  attempt: number,
  maxAttempts: number,
  delays: number[]
): string {
  // Build retry schedule lines
  const scheduleLines = delays.map((delay, i) => {
    const marker = i === 0 ? '├─' : i === delays.length - 1 ? '└─' : '├─'
    const delaySec = Math.round(delay / 1000)
    return `  ${marker} Attempt ${attempt + i + 1} will wait ${delaySec}s`
  })

  // Build tip lines
  const tipLines = diagnosis.tips.length > 0 
    ? ['💡 Tips:', ...diagnosis.tips.map(tip => `  • ${tip}`), '']
    : []

  // Combine all sections
  const lines = [
    '',
    `${diagnosis.emoji}  Agent failed (attempt ${attempt}/${maxAttempts})`,
    '',
    `Issue: ${diagnosis.issue}`,
    `Cause: ${diagnosis.cause}`,
    '',
    'Retrying with exponential backoff...',
    ...scheduleLines,
    '',
    ...tipLines,
  ]

  return lines.join('\n')
}

/**
 * Show live countdown with progress bar
 */
export async function countdownWithProgress(
  delayMs: number,
  onTick?: (remaining: number) => void
): Promise<void> {
  const startTime = Date.now()
  const endTime = startTime + delayMs
  const totalSec = Math.ceil(delayMs / 1000)

  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, endTime - now)
      const remainingSec = Math.ceil(remaining / 1000)

      if (remaining <= 0) {
        clearInterval(interval)
        // Clear countdown line
        process.stdout.write('\r' + ' '.repeat(80) + '\r')
        resolve()
        return
      }

      // Progress bar
      const progress = 1 - (remaining / delayMs)
      const barWidth = 30
      const filled = Math.floor(progress * barWidth)
      const empty = barWidth - filled
      const bar = '█'.repeat(filled) + '░'.repeat(empty)

      // Countdown message
      const message = `[RETRYING IN ${remainingSec}s...] ${bar} ${Math.floor(progress * 100)}%`

      // Update line (no newline)
      process.stdout.write('\r' + message)

      if (onTick) {
        onTick(remaining)
      }
    }, 100)  // Update every 100ms for smooth countdown
  })
}

/**
 * Calculate exponential backoff delays
 */
export function calculateBackoffDelays(
  attempt: number,
  maxAttempts: number,
  initialDelay: number,
  multiplier: number,
  maxDelay: number
): number[] {
  const delays: number[] = []
  let delay = initialDelay * Math.pow(multiplier, attempt)

  for (let i = attempt + 1; i <= maxAttempts; i++) {
    const actualDelay = Math.min(delay, maxDelay)
    delays.push(actualDelay)
    delay *= multiplier
  }

  return delays
}
