/**
 * Configuration loader with environment variable support
 * 
 * Loads configuration from environment variables with fallback to defaults.
 * All environment variables are prefixed with CODERNIC_
 */

import { ORCHESTRATOR_DEFAULTS } from './defaults.js';

/**
 * Parse boolean environment variable
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Parse number environment variable
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse array of numbers from environment variable (comma-separated)
 */
function parseNumberArray(value: string | undefined, defaultValue: number[]): number[] {
  if (value === undefined) return defaultValue;
  try {
    return value.split(',').map(v => Number(v.trim())).filter(n => !Number.isNaN(n));
  } catch {
    return defaultValue;
  }
}

/**
 * Load rollback configuration from environment
 */
export function loadRollbackConfig() {
  return {
    maxSnapshots: parseNumber(
      process.env.CODERNIC_MAX_SNAPSHOTS,
      ORCHESTRATOR_DEFAULTS.ROLLBACK.MAX_SNAPSHOTS
    ),
    maxAge: parseNumber(
      process.env.CODERNIC_SNAPSHOT_MAX_AGE_MS,
      ORCHESTRATOR_DEFAULTS.ROLLBACK.MAX_AGE_MS
    ),
    autoCleanup: parseBoolean(
      process.env.CODERNIC_AUTO_CLEANUP_SNAPSHOTS,
      ORCHESTRATOR_DEFAULTS.ROLLBACK.AUTO_CLEANUP
    ),
  };
}

/**
 * Load learning configuration from environment
 */
export function loadLearningConfig() {
  return {
    enabled: parseBoolean(
      process.env.CODERNIC_LEARNING_ENABLED,
      ORCHESTRATOR_DEFAULTS.LEARNING.ENABLED
    ),
    maxExamples: parseNumber(
      process.env.CODERNIC_MAX_LEARNING_EXAMPLES,
      ORCHESTRATOR_DEFAULTS.LEARNING.MAX_EXAMPLES
    ),
    minConfidence: parseNumber(
      process.env.CODERNIC_MIN_LEARNING_CONFIDENCE,
      ORCHESTRATOR_DEFAULTS.LEARNING.MIN_CONFIDENCE
    ),
  };
}

/**
 * Load production hardening configuration from environment
 */
export function loadProductionConfig() {
  return {
    retry: {
      maxRetries: parseNumber(
        process.env.CODERNIC_MAX_RETRIES,
        ORCHESTRATOR_DEFAULTS.PRODUCTION.RETRY.MAX_RETRIES
      ),
      initialDelay: parseNumber(
        process.env.CODERNIC_RETRY_INITIAL_DELAY_MS,
        ORCHESTRATOR_DEFAULTS.PRODUCTION.RETRY.INITIAL_DELAY_MS
      ),
      backoffMultiplier: parseNumber(
        process.env.CODERNIC_RETRY_BACKOFF_MULTIPLIER,
        ORCHESTRATOR_DEFAULTS.PRODUCTION.RETRY.BACKOFF_MULTIPLIER
      ),
      maxDelay: parseNumber(
        process.env.CODERNIC_RETRY_MAX_DELAY_MS,
        ORCHESTRATOR_DEFAULTS.PRODUCTION.RETRY.MAX_DELAY_MS
      ),
    },
    circuitBreaker: {
      failureThreshold: parseNumber(
        process.env.CODERNIC_CIRCUIT_FAILURE_THRESHOLD,
        ORCHESTRATOR_DEFAULTS.PRODUCTION.CIRCUIT_BREAKER.FAILURE_THRESHOLD
      ),
      resetTimeout: parseNumber(
        process.env.CODERNIC_CIRCUIT_RESET_TIMEOUT_MS,
        ORCHESTRATOR_DEFAULTS.PRODUCTION.CIRCUIT_BREAKER.RESET_TIMEOUT_MS
      ),
      successThreshold: parseNumber(
        process.env.CODERNIC_CIRCUIT_SUCCESS_THRESHOLD,
        ORCHESTRATOR_DEFAULTS.PRODUCTION.CIRCUIT_BREAKER.SUCCESS_THRESHOLD
      ),
    },
    rateLimiter: {
      maxRequests: parseNumber(
        process.env.CODERNIC_RATE_LIMIT_MAX_REQUESTS,
        ORCHESTRATOR_DEFAULTS.PRODUCTION.RATE_LIMITER.MAX_REQUESTS
      ),
      windowMs: parseNumber(
        process.env.CODERNIC_RATE_LIMIT_WINDOW_MS,
        ORCHESTRATOR_DEFAULTS.PRODUCTION.RATE_LIMITER.WINDOW_MS
      ),
      blockOnExceeded: parseBoolean(
        process.env.CODERNIC_RATE_LIMIT_BLOCK_ON_EXCEEDED,
        ORCHESTRATOR_DEFAULTS.PRODUCTION.RATE_LIMITER.BLOCK_ON_EXCEEDED
      ),
    },
    enableMetrics: parseBoolean(
      process.env.CODERNIC_METRICS_ENABLED,
      ORCHESTRATOR_DEFAULTS.PRODUCTION.METRICS_ENABLED
    ),
    enableLogging: parseBoolean(
      process.env.CODERNIC_LOGGING_ENABLED,
      ORCHESTRATOR_DEFAULTS.PRODUCTION.LOGGING_ENABLED
    ),
  };
}

/**
 * Load cost optimization configuration from environment
 */
export function loadCostOptimizationConfig() {
  return {
    cache: {
      enabled: parseBoolean(
        process.env.CODERNIC_CACHE_ENABLED,
        ORCHESTRATOR_DEFAULTS.COST_OPTIMIZATION.CACHE.ENABLED
      ),
      ttl: parseNumber(
        process.env.CODERNIC_CACHE_TTL_MS,
        ORCHESTRATOR_DEFAULTS.COST_OPTIMIZATION.CACHE.TTL_MS
      ),
      maxEntries: parseNumber(
        process.env.CODERNIC_CACHE_MAX_ENTRIES,
        ORCHESTRATOR_DEFAULTS.COST_OPTIMIZATION.CACHE.MAX_ENTRIES
      ),
    },
    compression: {
      enabled: parseBoolean(
        process.env.CODERNIC_COMPRESSION_ENABLED,
        ORCHESTRATOR_DEFAULTS.COST_OPTIMIZATION.COMPRESSION.ENABLED
      ),
      targetRatio: parseNumber(
        process.env.CODERNIC_COMPRESSION_TARGET_RATIO,
        ORCHESTRATOR_DEFAULTS.COST_OPTIMIZATION.COMPRESSION.TARGET_RATIO
      ),
      strategies: ORCHESTRATOR_DEFAULTS.COST_OPTIMIZATION.COMPRESSION.STRATEGIES,
    },
    budget: {
      alertThresholds: parseNumberArray(
        process.env.CODERNIC_BUDGET_ALERT_THRESHOLDS,
        [...ORCHESTRATOR_DEFAULTS.COST_OPTIMIZATION.BUDGET.ALERT_THRESHOLDS]
      ),
      blockOnExceeded: parseBoolean(
        process.env.CODERNIC_BUDGET_BLOCK_ON_EXCEEDED,
        ORCHESTRATOR_DEFAULTS.COST_OPTIMIZATION.BUDGET.BLOCK_ON_EXCEEDED
      ),
    },
  };
}

/**
 * Load test runner configuration from environment
 */
export function loadTestRunnerConfig() {
  return {
    timeoutMs: parseNumber(
      process.env.CODERNIC_TEST_TIMEOUT_MS,
      ORCHESTRATOR_DEFAULTS.TEST_RUNNER.TIMEOUT_MS
    ),
  };
}

/**
 * Load database configuration from environment
 */
export function loadDatabaseConfig() {
  const baseDir = process.env.CODERNIC_DB_DIR || ORCHESTRATOR_DEFAULTS.DATABASE.BASE_DIR;
  
  return {
    baseDir,
    files: ORCHESTRATOR_DEFAULTS.DATABASE.FILES,
  };
}

/**
 * Load approval configuration from environment
 */
export function loadApprovalConfig() {
  return {
    maxLinesPerPatch: parseNumber(
      process.env.CODERNIC_APPROVAL_MAX_LINES_PER_PATCH,
      ORCHESTRATOR_DEFAULTS.APPROVAL.MAX_LINES_PER_PATCH
    ),
  };
}

/**
 * Load all configuration from environment
 */
export function loadOrchestratorConfig() {
  return {
    rollback: loadRollbackConfig(),
    learning: loadLearningConfig(),
    production: loadProductionConfig(),
    costOptimization: loadCostOptimizationConfig(),
    testRunner: loadTestRunnerConfig(),
    database: loadDatabaseConfig(),
    approval: loadApprovalConfig(),
  };
}

/**
 * Get default database path for a specific database
 */
export function getDefaultDatabasePath(dbName: keyof typeof ORCHESTRATOR_DEFAULTS.DATABASE.FILES): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
  const config = loadDatabaseConfig();
  return `${homeDir}/${config.baseDir}/${config.files[dbName]}`;
}
