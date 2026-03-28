/**
 * Orchestrator Configuration Module
 * 
 * Centralized configuration for all orchestrator components.
 * Supports environment variable overrides with CODERNIC_ prefix.
 * 
 * @example
 * ```typescript
 * import { loadOrchestratorConfig, ORCHESTRATOR_DEFAULTS } from './config';
 * 
 * // Load config from environment
 * const config = loadOrchestratorConfig();
 * 
 * // Or use defaults directly
 * const maxRetries = ORCHESTRATOR_DEFAULTS.PRODUCTION.RETRY.MAX_RETRIES;
 * ```
 */

export { ORCHESTRATOR_DEFAULTS } from './defaults.js';
export {
    getDefaultDatabasePath, loadApprovalConfig, loadCostOptimizationConfig, loadDatabaseConfig, loadLearningConfig, loadOrchestratorConfig, loadProductionConfig, loadRollbackConfig, loadTestRunnerConfig
} from './loader.js';

