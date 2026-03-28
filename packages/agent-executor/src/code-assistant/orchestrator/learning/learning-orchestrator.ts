/**
 * @file learning-orchestrator.ts
 * @description High-level learning orchestrator
 * 
 * Workflow:
 * 1. After execution, wait for time window
 * 2. Detect user corrections
 * 3. Store corrections in database
 * 4. Generate learning examples
 * 5. Include examples in next LLM prompt
 */

import { loadLearningConfig } from '../config/index.js';
import { detectCorrections } from './correction-detector.js';
import { LearningDatabase } from './learning-database.js';
import type {
    Correction,
    CorrectionDetectionConfig,
    CorrectionLearningConfig,
    CorrectionLearningResult,
    ILearningDatabase,
    LearningExample,
    LearningStats,
} from './learning.types.js';

/**
 * Learning orchestrator options
 */
export interface LearningOrchestratorOptions {
  /** Custom learning database (optional) */
  learningDatabase?: ILearningDatabase;
  /** Path to learning database file (optional) */
  databasePath?: string;
  /** Enable learning from corrections (default: true) */
  enabled?: boolean;
  /** Maximum learning examples to include in prompts (default: 5) */
  maxExamples?: number;
  /** Minimum confidence score to include example (default: 0.7) */
  minConfidence?: number;
}

/**
 * High-level learning orchestrator
 */
export class LearningOrchestrator {
  private readonly _db: ILearningDatabase;
  private readonly _options: LearningOrchestratorOptions;

  constructor(options: LearningOrchestratorOptions = {}) {
    const config = loadLearningConfig();
    
    this._options = {
      enabled: config.enabled,
      maxExamples: config.maxExamples,
      minConfidence: config.minConfidence,
      ...options,
    };

    this._db = options.learningDatabase || new LearningDatabase(options.databasePath);
  }

  /**
   * Detect and store corrections after execution
   * 
   * @param config - Detection configuration
   * @returns Learning result
   */
  async detectAndStoreCorrections(
    config: CorrectionDetectionConfig,
  ): Promise<CorrectionLearningResult> {
    const start = Date.now();

    if (!this._options.enabled) {
      return {
        success: true,
        correctionsDetected: 0,
        examplesGenerated: 0,
        duration: Date.now() - start,
      };
    }

    try {
      // Detect corrections
      const detectionResult = await detectCorrections(config);

      if (!detectionResult.success) {
        return {
          success: false,
          correctionsDetected: 0,
          examplesGenerated: 0,
          error: detectionResult.error,
          duration: Date.now() - start,
        };
      }

      // Store corrections in database
      for (const correction of detectionResult.corrections) {
        await this._db.saveCorrection(correction);
      }

      // Generate learning examples
      const examples = await this.getLearningExamples(config.projectRoot);

      return {
        success: true,
        correctionsDetected: detectionResult.corrections.length,
        examplesGenerated: examples.length,
        duration: Date.now() - start,
      };

    } catch (error: unknown) {
      return {
        success: false,
        correctionsDetected: 0,
        examplesGenerated: 0,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Get learning examples for LLM prompts
   * 
   * @param projectRoot - Project root directory
   * @returns Learning examples
   */
  async getLearningExamples(projectRoot: string): Promise<LearningExample[]> {
    if (!this._options.enabled) {
      return [];
    }

    const examples = await this._db.getLearningExamples(
      projectRoot,
      this._options.maxExamples,
    );

    // Filter by confidence
    return examples.filter(
      (example) => example.confidence >= (this._options.minConfidence || 0.7),
    );
  }

  /**
   * Build learning context for LLM prompts
   * 
   * @param projectRoot - Project root directory
   * @param config - Learning configuration
   * @returns Learning context string
   */
  async buildLearningContext(
    projectRoot: string,
    config?: CorrectionLearningConfig,
  ): Promise<string> {
    if (!this._options.enabled) {
      return '';
    }

    const examples = await this.getLearningExamples(projectRoot);

    if (examples.length === 0) {
      return '';
    }

    let context = '## Learning from Past Corrections\n\n';
    context += 'You previously made mistakes in similar tasks. Learn from these corrections:\n\n';

    for (let i = 0; i < examples.length; i++) {
      const example = examples[i];
      
      context += `### Correction ${i + 1}: ${example.correctionType}\n`;
      context += `Task: ${example.task}\n`;
      context += `Occurrences: ${example.occurrences}x\n\n`;
      
      context += `**What you generated (incorrect):**\n`;
      context += '```\n';
      context += example.incorrect;
      context += '\n```\n\n';
      
      context += `**What the user corrected it to:**\n`;
      context += '```\n';
      context += example.correct;
      context += '\n```\n\n';
      
      context += `⚠️ **Lesson**: Avoid this pattern. Generate code matching the corrected version.\n\n`;
      context += '---\n\n';
    }

    return context;
  }

  /**
   * Get learning statistics
   * 
   * @param projectRoot - Project root directory
   * @returns Learning statistics
   */
  async getStats(projectRoot: string): Promise<LearningStats> {
    return this._db.getStats(projectRoot);
  }

  /**
   * Get all corrections for a snapshot
   * 
   * @param snapshotId - Snapshot ID
   * @returns Corrections
   */
  async getSnapshotCorrections(snapshotId: string): Promise<Correction[]> {
    return this._db.getSnapshotCorrections(snapshotId);
  }

  /**
   * Delete all corrections for a project
   * 
   * @param projectRoot - Project root directory
   * @returns Number of corrections deleted
   */
  async deleteProjectCorrections(projectRoot: string): Promise<number> {
    return this._db.deleteProjectCorrections(projectRoot);
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this._db instanceof LearningDatabase) {
      this._db.close();
    }
  }
}

/**
 * Create default learning orchestrator instance
 */
export function createLearningOrchestrator(
  options?: LearningOrchestratorOptions,
): LearningOrchestrator {
  return new LearningOrchestrator(options);
}
