/**
 * @file index.ts
 * @description Learning from Corrections System - Public API
 * 
 * Part of Phase 2.3: Learning from Corrections
 * Tracks human edits to AI-generated code and uses them as training data
 * 
 * Usage:
 * ```ts
 * import { LearningOrchestrator } from './learning';
 * 
 * const learning = new LearningOrchestrator();
 * 
 * // After execution: Detect corrections
 * const learningResult = await learning.detectAndStoreCorrections({
 *   projectRoot: '/path/to/project',
 *   snapshotId,
 *   generatedFiles: ['src/api/auth.ts', 'src/routes.ts'],
 *   timeWindow: 60 * 60 * 1000, // 1 hour
 * });
 * 
 * // Before next execution: Get learning context
 * const learningContext = await learning.buildLearningContext(
 *   '/path/to/project'
 * );
 * 
 * // Include in LLM prompt:
 * // const userContent = learningContext + taskDescription;
 * 
 * // Get statistics
 * const stats = await learning.getStats('/path/to/project');
 * console.log(`Accuracy improvement: ${(stats.accuracyImprovement * 100).toFixed(1)}%`);
 * ```
 */

// Main orchestrator
export {
    LearningOrchestrator,
    createLearningOrchestrator,
    type LearningOrchestratorOptions
} from './learning-orchestrator.js';

// Correction detection
export { detectCorrections } from './correction-detector.js';

// Database
export { LearningDatabase } from './learning-database.js';

// Types
export type {
    Correction, CorrectionDetectionConfig,
    CorrectionDetectionResult, CorrectionLearningConfig,
    CorrectionLearningResult, CorrectionType, ILearningDatabase, LearningExample,
    LearningStats
} from './learning.types.js';

