/**
 * Model selection based on task complexity
 */

import type { ModelSelectionConfig, ModelTier, TaskComplexity } from './cost-optimization.types.js';

/**
 * Estimate task complexity from task description
 */
export function estimateComplexity(task: string, mode: string): TaskComplexity {
  const lowerTask = task.toLowerCase();
  
  // Complex indicators
  const complexIndicators = [
    'refactor', 'architecture', 'design', 'optimize', 'performance',
    'security', 'authentication', 'database', 'algorithm', 'complex',
    'large scale', 'distributed', 'microservice',
  ];
  
  // Simple indicators
  const simpleIndicators = [
    'fix typo', 'update comment', 'rename', 'format', 'add test',
    'update docs', 'change color', 'adjust spacing',
  ];
  
  // Check mode
  if (mode === 'quick-fix') return 'simple';
  if (mode === 'refactor') return 'complex';
  
  // Check task length (longer = more complex usually)
  if (task.length < 50) return 'simple';
  if (task.length > 300) return 'complex';
  
  // Check indicators
  const hasComplexIndicator = complexIndicators.some(indicator => lowerTask.includes(indicator));
  const hasSimpleIndicator = simpleIndicators.some(indicator => lowerTask.includes(indicator));
  
  if (hasComplexIndicator && !hasSimpleIndicator) return 'complex';
  if (hasSimpleIndicator && !hasComplexIndicator) return 'simple';
  
  // Default to moderate
  return 'moderate';
}

/**
 * Select model tier based on complexity
 */
export function selectModelTier(
  complexity: TaskComplexity,
  config: ModelSelectionConfig
): { tier: ModelTier; model: string } {
  // Force tier if specified
  if (config.forceTier) {
    const model = config.models[config.forceTier];
    return {
      tier: config.forceTier,
      model: model || config.models.balanced || 'gpt-4',
    };
  }
  
  // Auto-select based on complexity
  if (!config.autoSelect) {
    // Default to balanced if auto-select disabled
    const model = config.models.balanced || 'gpt-4';
    return { tier: 'balanced', model };
  }
  
  switch (complexity) {
    case 'simple':
      return {
        tier: 'fast',
        model: config.models.fast || config.models.balanced || 'gpt-3.5-turbo',
      };
    
    case 'moderate':
      return {
        tier: 'balanced',
        model: config.models.balanced || 'gpt-4',
      };
    
    case 'complex':
      return {
        tier: 'powerful',
        model: config.models.powerful || config.models.balanced || 'gpt-4',
      };
    
    default:
      return {
        tier: 'balanced',
        model: config.models.balanced || 'gpt-4',
      };
  }
}
