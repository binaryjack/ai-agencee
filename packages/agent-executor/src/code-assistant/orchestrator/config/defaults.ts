/**
 * Default configuration values for orchestrator
 * 
 * This file centralizes all magic numbers and default values
 * to make them configurable and maintainable.
 */

/**
 * Rollback & Snapshot Configuration
 */
export const ROLLBACK_DEFAULTS = {
  /**
   * Maximum number of snapshots to keep per project
   * @env CODERNIC_MAX_SNAPSHOTS
   */
  MAX_SNAPSHOTS: 10,
  
  /**
   * Maximum age of snapshots in milliseconds (7 days)
   * @env CODERNIC_SNAPSHOT_MAX_AGE_MS
   */
  MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000,
  
  /**
   * Enable automatic cleanup of old snapshots
   * @env CODERNIC_AUTO_CLEANUP_SNAPSHOTS
   */
  AUTO_CLEANUP: true,
} as const;

/**
 * Learning System Configuration
 */
export const LEARNING_DEFAULTS = {
  /**
   * Maximum learning examples to include in prompts
   * @env CODERNIC_MAX_LEARNING_EXAMPLES
   */
  MAX_EXAMPLES: 5,
  
  /**
   * Minimum confidence score to include example (0-1)
   * @env CODERNIC_MIN_LEARNING_CONFIDENCE
   */
  MIN_CONFIDENCE: 0.7,
  
  /**
   * Enable learning system
   * @env CODERNIC_LEARNING_ENABLED
   */
  ENABLED: true,
  
  /**
   * Confidence thresholds for correction types
   */
  CONFIDENCE_THRESHOLDS: {
    IMPORT_FIX: 0.8,
    TYPE_FIX: 0.7,
    SYNTAX_FIX: 0.9,
    STYLE_FIX: 0.95,
    SECURITY_FIX: 0.6,
    LOGIC_FIX: 0.5,
    PERFORMANCE_FIX: 0.65,
    REFACTOR: 0.4,
  },
} as const;

/**
 * Production Hardening Configuration
 */
export const PRODUCTION_DEFAULTS = {
  /**
   * Retry configuration
   */
  RETRY: {
    /**
     * Maximum number of retries
     * @env CODERNIC_MAX_RETRIES
     */
    MAX_RETRIES: 3,
    
    /**
     * Initial delay in milliseconds
     * @env CODERNIC_RETRY_INITIAL_DELAY_MS
     */
    INITIAL_DELAY_MS: 1000,
    
    /**
     * Backoff multiplier for exponential backoff
     * @env CODERNIC_RETRY_BACKOFF_MULTIPLIER
     */
    BACKOFF_MULTIPLIER: 2,
    
    /**
     * Maximum delay in milliseconds (30 seconds)
     * @env CODERNIC_RETRY_MAX_DELAY_MS
     */
    MAX_DELAY_MS: 30000,
  },
  
  /**
   * Circuit breaker configuration
   */
  CIRCUIT_BREAKER: {
    /**
     * Failure threshold to open circuit
     * @env CODERNIC_CIRCUIT_FAILURE_THRESHOLD
     */
    FAILURE_THRESHOLD: 5,
    
    /**
     * Timeout to try half-open in milliseconds (1 minute)
     * @env CODERNIC_CIRCUIT_RESET_TIMEOUT_MS
     */
    RESET_TIMEOUT_MS: 60000,
    
    /**
     * Success threshold to close circuit when half-open
     * @env CODERNIC_CIRCUIT_SUCCESS_THRESHOLD
     */
    SUCCESS_THRESHOLD: 2,
  },
  
  /**
   * Rate limiter configuration
   */
  RATE_LIMITER: {
    /**
     * Maximum requests per window
     * @env CODERNIC_RATE_LIMIT_MAX_REQUESTS
     */
    MAX_REQUESTS: 60,
    
    /**
     * Time window in milliseconds (1 minute)
     * @env CODERNIC_RATE_LIMIT_WINDOW_MS
     */
    WINDOW_MS: 60000,
    
    /**
     * Block when limit exceeded (vs queue)
     * @env CODERNIC_RATE_LIMIT_BLOCK_ON_EXCEEDED
     */
    BLOCK_ON_EXCEEDED: false,
  },
  
  /**
   * Enable metrics collection
   * @env CODERNIC_METRICS_ENABLED
   */
  METRICS_ENABLED: true,
  
  /**
   * Enable structured logging
   * @env CODERNIC_LOGGING_ENABLED
   */
  LOGGING_ENABLED: true,
} as const;

/**
 * Cost Optimization Configuration
 */
export const COST_OPTIMIZATION_DEFAULTS = {
  /**
   * Cache configuration
   */
  CACHE: {
    /**
     * Enable response caching
     * @env CODERNIC_CACHE_ENABLED
     */
    ENABLED: true,
    
    /**
     * Cache TTL in milliseconds (7 days)
     * @env CODERNIC_CACHE_TTL_MS
     */
    TTL_MS: 7 * 24 * 60 * 60 * 1000,
    
    /**
     * Maximum cache entries
     * @env CODERNIC_CACHE_MAX_ENTRIES
     */
    MAX_ENTRIES: 1000,
  },
  
  /**
   * Prompt compression configuration
   */
  COMPRESSION: {
    /**
     * Enable compression
     * @env CODERNIC_COMPRESSION_ENABLED
     */
    ENABLED: true,
    
    /**
     * Target compression ratio (0-1, e.g., 0.7 = reduce by 30%)
     * @env CODERNIC_COMPRESSION_TARGET_RATIO
     */
    TARGET_RATIO: 0.7,
    
    /**
     * Compression strategies
     */
    STRATEGIES: {
      REMOVE_COMMENTS: true,
      REMOVE_WHITESPACE: true,
      SHORTEN_VARIABLES: false,
      SUMMARIZE_LONG_FILES: true,
    },
  },
  
  /**
   * Budget tracking configuration
   */
  BUDGET: {
    /**
     * Alert thresholds (0-1)
     */
    ALERT_THRESHOLDS: [0.8, 0.95],
    
    /**
     * Block execution when budget exceeded
     * @env CODERNIC_BUDGET_BLOCK_ON_EXCEEDED
     */
    BLOCK_ON_EXCEEDED: false,
  },
} as const;

/**
 * Test Runner Configuration
 */
export const TEST_RUNNER_DEFAULTS = {
  /**
   * Test timeout in milliseconds (60 seconds)
   * @env CODERNIC_TEST_TIMEOUT_MS
   */
  TIMEOUT_MS: 60000,
  
  /**
   * Test framework detection confidence thresholds
   */
  CONFIDENCE_THRESHOLDS: {
    PACKAGE_JSON: 0.95,
    CONFIG_FILE: 0.8,
    FALLBACK: 0.7,
  },
} as const;

/**
 * Database Configuration
 */
export const DATABASE_DEFAULTS = {
  /**
   * Base directory for database files
   * Falls back to HOME/.codernic if not set
   * @env CODERNIC_DB_DIR
   */
  BASE_DIR: '.codernic',
  
  /**
   * Database file names
   */
  FILES: {
    SNAPSHOTS: 'snapshots.db',
    LEARNING: 'learning.db',
    CONTEXT_INDEX: 'context-index.db',
    RESPONSE_CACHE: 'response-cache.db',
    BUDGET: 'budget.db',
  },
} as const;

/**
 * Approval Configuration
 */
export const APPROVAL_DEFAULTS = {
  /**
   * Maximum lines to show per patch
   * @env CODERNIC_APPROVAL_MAX_LINES_PER_PATCH
   */
  MAX_LINES_PER_PATCH: 50,
} as const;

/**
 * All default values in one object
 */
export const ORCHESTRATOR_DEFAULTS = {
  ROLLBACK: ROLLBACK_DEFAULTS,
  LEARNING: LEARNING_DEFAULTS,
  PRODUCTION: PRODUCTION_DEFAULTS,
  COST_OPTIMIZATION: COST_OPTIMIZATION_DEFAULTS,
  TEST_RUNNER: TEST_RUNNER_DEFAULTS,
  DATABASE: DATABASE_DEFAULTS,
  APPROVAL: APPROVAL_DEFAULTS,
} as const;
