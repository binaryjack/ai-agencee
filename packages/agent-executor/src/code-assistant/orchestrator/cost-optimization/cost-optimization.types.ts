/**
 * Phase 4: Cost Optimization Types
 * 
 * Response caching, prompt compression, model selection, and budget tracking
 * to minimize LLM API costs.
 */

/**
 * Cache entry for LLM responses
 */
export interface CacheEntry {
  key: string;  // Hash of (system_prompt + user_prompt + model)
  response: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: number;
  hitCount: number;  // How many times this cache entry was used
  projectRoot: string;
}

/**
 * Response cache database interface
 */
export interface IResponseCache {
  // Get cached response
  get(key: string): Promise<CacheEntry | null>;
  
  // Save response
  set(entry: CacheEntry): Promise<void>;
  
  // Clear cache
  clear(projectRoot?: string): Promise<void>;
  
  // Get statistics
  getStats(projectRoot?: string): Promise<{
    totalEntries: number;
    totalHits: number;
    totalSaved: number;  // Total cost saved
    hitRate: number;  // Cache hit rate (0-1)
  }>;
}

/**
 * Model tier for cost optimization
 */
export type ModelTier = 'fast' | 'balanced' | 'powerful';

/**
 * Task complexity estimate
 */
export type TaskComplexity = 'simple' | 'moderate' | 'complex';

/**
 * Model selection configuration
 */
export interface ModelSelectionConfig {
  // Available models by tier
  models: {
    fast?: string;      // e.g., 'gpt-3.5-turbo' ($0.0015/1k tokens)
    balanced?: string;  // e.g., 'gpt-4' ($0.03/1k tokens)
    powerful?: string;  // e.g., 'gpt-4-32k' ($0.06/1k tokens)
  };
  
  // Auto-select model based on task complexity
  autoSelect?: boolean;  // default: true
  
  // Override auto-selection
  forceTier?: ModelTier;
}

/**
 * Budget tracking configuration
 */
export interface BudgetConfig {
  // Daily budget in USD
  dailyBudget?: number;
  
  // Monthly budget in USD
  monthlyBudget?: number;
  
  // Alert thresholds (0-1, e.g., 0.8 = 80%)
  alertThresholds?: number[];  // default: [0.8, 0.95]
  
  // Block execution when budget exceeded
  blockOnExceeded?: boolean;  // default: false
}

/**
 * Budget status
 */
export interface BudgetStatus {
  dailySpent: number;
  dailyBudget: number;
  dailyRemaining: number;
  
  monthlySpent: number;
  monthlyBudget: number;
  monthlyRemaining: number;
  
  alerts: Array<{
    type: 'warning' | 'critical' | 'exceeded';
    message: string;
    threshold: number;
  }>;
  
  blocked: boolean;
}

/**
 * Usage entry for budget tracking
 */
export interface UsageEntry {
  id: string;
  timestamp: number;
  projectRoot: string;
  task: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  cached: boolean;  // Was response from cache?
}

/**
 * Budget database interface
 */
export interface IBudgetTracker {
  // Record usage
  recordUsage(entry: UsageEntry): Promise<void>;
  
  // Get budget status
  getStatus(projectRoot?: string): Promise<BudgetStatus>;
  
  // Get usage history
  getUsage(projectRoot?: string, days?: number): Promise<UsageEntry[]>;
  
  // Clear history
  clear(projectRoot?: string): Promise<void>;
}

/**
 * Prompt compression configuration
 */
export interface PromptCompressionConfig {
  // Enable compression (default: true)
  enabled?: boolean;
  
  // Target compression ratio (0-1, e.g., 0.7 = reduce tokens by 30%)
  targetRatio?: number;  // default: 0.7
  
  // Compression strategies
  strategies?: {
    removeComments?: boolean;      // Strip code comments (default: true)
    removeWhitespace?: boolean;    // Minimize whitespace (default: true)
    shortenVariables?: boolean;    // Replace long var names (default: false, risky)
    summarizeLongFiles?: boolean;  // Summarize files >500 lines (default: true)
  };
}

/**
 * Cost optimization orchestrator configuration
 */
export interface CostOptimizationConfig {
  projectRoot: string;
  
  // Cache configuration
  cache?: {
    enabled?: boolean;  // default: true
    ttl?: number;       // Time to live in ms, default: 7 days
    maxEntries?: number; // Max cache entries, default: 1000
  };
  
  // Model selection
  modelSelection?: ModelSelectionConfig;
  
  // Budget tracking
  budget?: BudgetConfig;
  
  // Prompt compression
  compression?: PromptCompressionConfig;
}

/**
 * Cost optimization orchestrator options with dependency injection
 */
export interface CostOptimizationOptions {
  config: CostOptimizationConfig;
  
  // Optional dependencies for testing/customization
  cache?: IResponseCache;
  budget?: IBudgetTracker;
}

/**
 * Cost optimization result
 */
export interface CostOptimizationResult {
  // Cache hit/miss
  fromCache: boolean;
  cacheKey?: string;
  
  // Model selection
  selectedModel: string;
  modelTier: ModelTier;
  taskComplexity: TaskComplexity;
  
  // Compression
  originalTokens?: number;
  compressedTokens?: number;
  compressionRatio?: number;
  
  // Costs
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  
  // Budget status
  budgetStatus?: BudgetStatus;
}

/**
 * Cost optimization orchestrator interface
 */
export interface ICostOptimization {
  // Pre-execution: check cache, select model, compress prompt
  preExecute(config: {
    systemPrompt: string;
    userPrompt: string;
    task: string;
    mode: string;
  }): Promise<{
    cacheHit: boolean;
    cachedResponse?: string;
    selectedModel: string;
    modelTier: ModelTier;
    compressedPrompt: string;
    originalTokens: number;
    compressedTokens: number;
  }>;
  
  // Post-execution: cache response, track usage
  postExecute(config: {
    systemPrompt: string;
    userPrompt: string;
    response: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }): Promise<void>;
  
  // Get budget status
  getBudgetStatus(): Promise<BudgetStatus>;
  
  // Clear cache
  clearCache(): Promise<void>;
}
