/**
 * @file cost-optimization.ts
 * @description Cost optimization orchestrator
 * 
 * SOLID Principles Applied:
 * 
 * 1. Single Responsibility Principle (SRP):
 *    - This class coordinates cost optimization
 *    - Caching → delegated to IResponseCache
 *    - Budget tracking → delegated to IBudgetTracker
 *    - Compression → delegated to prompt-compression.ts
 *    - Model selection → delegated to model-selection.ts
 * 
 * 2. Dependency Inversion Principle (DIP):
 *    - Depends on IResponseCache abstraction (not ResponseCacheDatabase)
 *    - Depends on IBudgetTracker abstraction (not BudgetTrackerDatabase)
 *    - Factory methods provide defaults, but consumers can inject alternatives
 * 
 * 3. Open/Closed Principle (OCP):
 *    - Open for extension: new cache/budget implementations via DI
 *    - Closed for modification: core logic unchanged when adding features
 * 
 * Example Usage:
 * ```typescript
 * // Default behavior
 * const costOpt = new CostOptimizationOrchestrator({ config });
 * 
 * // Custom cache (e.g., Redis instead of SQLite)
 * const costOpt = new CostOptimizationOrchestrator({
 *   config,
 *   cache: new RedisResponseCache(),
 *   budget: new CloudBudgetTracker(),
 * });
 * ```
 */

import { randomBytes } from 'node:crypto'
import { createBudgetTracker } from './budget-tracker.js'
import type {
    BudgetStatus,
    CostOptimizationConfig,
    CostOptimizationOptions,
    IBudgetTracker,
    ICostOptimization,
    IResponseCache,
} from './cost-optimization.types.js'
import { estimateComplexity, selectModelTier } from './model-selection.js'
import { compressPrompt } from './prompt-compression.js'
import { createResponseCache, generateCacheKey } from './response-cache.js'

/**
 * Cost optimization orchestrator
 * 
 * Coordinates caching, compression, model selection, and budget tracking.
 * Demonstrates Dependency Inversion: depends on interfaces, not databases.
 */
export class CostOptimizationOrchestrator implements ICostOptimization {
  private readonly config: CostOptimizationConfig;
  private readonly cache: IResponseCache;
  private readonly budget: IBudgetTracker;
  
  /**
   * Creates a cost optimization orchestrator
   * 
   * @param options - Configuration and optional dependency overrides
   * 
   * Dependency Inversion in action:
   * - Accepts IResponseCache (could be SQLite, Redis, in-memory)
   * - Accepts IBudgetTracker (could be database, API, mock)
   * - Not tied to specific storage implementations
   */
  constructor(options: CostOptimizationOptions) {
    this.config = options.config;
    
    // Dependency injection with defaults
    // SQLite implementations provided as defaults, but easily swapped
    this.cache = options.cache || createResponseCache(
      undefined,
      this.config.cache?.ttl
    );
    
    this.budget = options.budget || createBudgetTracker(
      undefined,
      this.config.budget
    );
  }
  
  async preExecute(params: {
    systemPrompt: string;
    userPrompt: string;
    task: string;
    mode: string;
  }): Promise<{
    cacheHit: boolean;
    cachedResponse?: string;
selectedModel: string;
    modelTier: any;
    compressedPrompt: string;
    originalTokens: number;
    compressedTokens: number;
  }> {
    const { systemPrompt, userPrompt, task, mode } = params;
    
    // Estimate complexity
    const complexity = estimateComplexity(task, mode);
    
    // Select model
    const { tier, model } = selectModelTier(complexity, this.config.modelSelection || {
      models: { balanced: 'gpt-4' },
      autoSelect: true,
    });
    
    // Check cache first (before compression)
    const cacheKey = generateCacheKey(systemPrompt, userPrompt, model);
    const cached = await this.cache.get(cacheKey);
    
    if (cached && this.config.cache?.enabled !== false) {
      return {
        cacheHit: true,
        cachedResponse: cached.response,
        selectedModel: model,
        modelTier: tier,
        compressedPrompt: userPrompt,
        originalTokens: cached.inputTokens,
        compressedTokens: cached.inputTokens,
      };
    }
    
    // Compress prompt
    const compression = compressPrompt(userPrompt, this.config.compression);
    
    return {
      cacheHit: false,
      selectedModel: model,
      modelTier: tier,
      compressedPrompt: compression.compressed,
      originalTokens: compression.originalTokens,
      compressedTokens: compression.compressedTokens,
    };
  }
  
  async postExecute(params: {
    systemPrompt: string;
    userPrompt: string;
    response: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }): Promise<void> {
    const { systemPrompt, userPrompt, response, model, inputTokens, outputTokens, cost } = params;
    
    // Cache response
    if (this.config.cache?.enabled !== false) {
      const cacheKey = generateCacheKey(systemPrompt, userPrompt, model);
      await this.cache.set({
        key: cacheKey,
        response,
        model,
        inputTokens,
        outputTokens,
        cost,
        timestamp: Date.now(),
        hitCount: 1,
        projectRoot: this.config.projectRoot,
      });
    }
    
    // Track usage
    await this.budget.recordUsage({
      id: randomBytes(8).toString('hex'),
      timestamp: Date.now(),
      projectRoot: this.config.projectRoot,
      task: '', // Would need to pass task here
      model,
      inputTokens,
      outputTokens,
      cost,
      cached: false,
    });
  }
  
  async getBudgetStatus(): Promise<BudgetStatus> {
    return await this.budget.getStatus(this.config.projectRoot);
  }
  
  async clearCache(): Promise<void> {
    await this.cache.clear(this.config.projectRoot);
  }
}

export function createCostOptimization(config: CostOptimizationConfig): ICostOptimization {
  return new CostOptimizationOrchestrator({ config });
}

/**
 * Create cost optimization with custom dependencies (for testing)
 */
export function createCostOptimizationWithDeps(
  options: CostOptimizationOptions,
): ICostOptimization {
  return new CostOptimizationOrchestrator(options);
}
