/**
 * Prototype method: execute
 *
 * Main entry point for Codernic code generation.  Coordinates the helper
 * methods defined in the other prototype files:
 *
 *   _openStore()      → open (or reuse) the SQLite index
 *   _gatherContext()  → FTS5 symbol search + file snippet loading
 *   _buildRouter()    → model router bootstrap
 *   _parsePatches()   → LLM response → ordered FilePatch list
 *
 * This file contains no business logic — it is the thin orchestration layer
 * that calls the helpers in order and handles failures at each boundary.
 *
 * Token-sustainability notes:
 * - context is gathered BEFORE the router is initialised so a missing index
 *   surfaces immediately without burning an API call.
 * - dry-run returns the raw LLM output as `plan` without writing any files,
 *   so users can review before committing a generation budget.
 * - The store is closed unconditionally in a finally block unless the caller
 *   supplied their own pre-opened instance (options.indexStore).
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import type { TaskType } from '../../../lib/llm-provider.js';

import type {
    ExecutionRequest,
    ExecutionResult,
    FilePatch,
} from '../../code-assistant-orchestrator.types.js';
import type { CodebaseIndexStoreInstance } from '../../storage/codebase-index-store.types.js';
import type { ICodeAssistantOrchestrator } from '../code-assistant-orchestrator.js';
import { MODE_TASK_TYPE, SYSTEM_PROMPT } from './constants.js';
import { executeTests } from '../test-runner/index.js';
import { executeGitCommit } from '../git-integration/index.js';
import { validatePatches, formatValidationResult } from '../validation/index.js';
import { executeApprovalGate } from '../approval/approval-orchestrator.js';
import { CliApprovalHandler } from '../approval/cli-approval-handler.js';
import { createRollbackOrchestrator } from '../rollback/index.js';
import { createLearningOrchestrator } from '../learning/index.js';
import { createContextIntelligence, buildContextString, extractKeywords } from '../context/index.js';
import { ORCHESTRATOR_DEFAULTS } from '../config/defaults.js';
import type { ContextPrioritizationConfig } from '../context/index.js';

export async function execute(
  this: ICodeAssistantOrchestrator,
  req:  ExecutionRequest,
): Promise<ExecutionResult> {
  const start = Date.now();
  
  const {
    task,
    dryRun = false,
    mode = 'feature',
    approvalTrustLevel = 'auto',
    autoApproveIfValidationPasses = false,
    autoApprovePatterns,
    alwaysRequireApprovalPatterns,
    approvalTimeout = 300000,
    runValidation = true,
    skipSyntaxValidation = false,
    skipImportValidation = false,
    skipTypeValidation = false,
    strictValidation = false,
    validationTimeout = 30000,
    runTests = false,
    testTimeout = 60000,
    collectCoverage = false,
    autoCommit = false,
    commitOnlyIfTestsPass = true,
    commitMessage,
    useConventionalCommits = true,
    createSnapshot = true,
    snapshotStrategy = 'git-stash',
    snapshotIncludeUntracked = true,
    enableLearning = true,
    maxLearningExamples = 5,
    correctionDetectionWindow = 60 * 60 * 1000,
    enableContextIntelligence = true,
    maxContextTokens = 8000,
    contextKeywords,
    alwaysIncludeInContext,
  } = req;

  // ── 1. Open index store ───────────────────────────────────────────────────

  let store: CodebaseIndexStoreInstance;
  try {
    store = await this._openStore();
  } catch {
    return {
      success:       false,
      filesModified: [],
      totalCost:     0,
      duration:      Date.now() - start,
      error:         'Index not found. Run: ai-kit code index first.',
    };
  }

  // ── 2. Gather codebase context (no API cost) ──────────────────────────────

  let context = '';
  try {
    context = await this._gatherContext(store, task);
  } finally {
    // Close the store only when we opened it; leave caller-supplied stores alone
    if (!this._options.indexStore) {
      await store.close();
    }
  }

  // ── 3. Obtain model router ────────────────────────────────────────────────

  const router = await this._buildRouter();
  if (!router) {
    return {
      success:       false,
      filesModified: [],
      totalCost:     0,
      duration:      Date.now() - start,
      error:         'No LLM provider available. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.',
    };
  }

  // ── 3.5. Build learning context (if enabled) ─────────────────────────────

  let learningContext = '';
  let learningExamplesUsed = 0;

  if (enableLearning) {
    try {
      const learning = this._options.learningOrchestrator || createLearningOrchestrator({
        enabled: true,
        maxExamples: maxLearningExamples,
        minConfidence: ORCHESTRATOR_DEFAULTS.LEARNING.MIN_CONFIDENCE,
      });

      learningContext = await learning.buildLearningContext(this._options.projectRoot);
      
      if (learningContext) {
        const examples = await learning.getLearningExamples(this._options.projectRoot);
        learningExamplesUsed = examples.length;
      }
    } catch (learningError: unknown) {
      // Silent failure - don't block execution
      console.warn('Learning context error:', learningError instanceof Error ? learningError.message : String(learningError));
    }
  }

  // ── 3.6. Optimize context with intelligence (if enabled) ─────────────────

  let intelligentContext = context;
  let contextResult: ExecutionResult['contextResult'];

  if (enableContextIntelligence) {
    try {
      const contextIntel = this._options.contextIntelligence || createContextIntelligence({
        projectRoot: this._options.projectRoot,
        autoIndex: true,
      });

      // Extract keywords from task if not provided
      const keywords = contextKeywords || extractKeywords(task);

      // Update index for recently modified files (incremental)
      // This is fast because it only re-indexes changed files
      const modifiedFiles: string[] = []; // TODO: Get from git status
      if (modifiedFiles.length >0) {
        await contextIntel.updateIndex(modifiedFiles);
      }

      // Optimize context
      const prioritizationConfig: ContextPrioritizationConfig = {
        maxTokens: maxContextTokens,
        keywords,
        alwaysInclude: alwaysIncludeInContext,
        weights: {
          keywordMatch: 0.4,
          recency: 0.2,
          dependency: 0.3,
          usage: 0.1,
        },
      };

      const optimization = await contextIntel.optimizeContext(prioritizationConfig);

      // Build formatted context string
      intelligentContext = buildContextString(optimization);

      contextResult = {
        totalSymbols: optimization.stats.totalSymbols,
        selectedSymbols: optimization.stats.selectedSymbols,
        filesIncluded: optimization.filesIncluded.length,
        estimatedTokens: optimization.estimatedTokens,
        compressionRatio: optimization.stats.compressionRatio,
      };
    } catch (contextError: unknown) {
      // Silent failure - use fallback context
      console.warn('Context intelligence error:', contextError instanceof Error ? contextError.message : String(contextError));
      intelligentContext = context; // Fallback to original context
    }
  }

  // ── 4. Build prompt ───────────────────────────────────────────────────────

  const taskType: TaskType = MODE_TASK_TYPE[mode] ?? 'code-generation';

  const contextSection = (intelligentContext || context).length > 0
    ? '## Codebase context\n' + (intelligentContext || context)
    : '(No index symbols matched — generating from task description alone.)';

  const dryRunDirective = dryRun
    ? '\n**Dry run:** describe the planned changes in plain English. Do NOT emit ## FILE or ## DELETE blocks.'
    : '';

  const userContent =
    learningContext +
    contextSection +
    '\n\n## Task\n' + task +
    '\n\n## Mode: ' + mode +
    dryRunDirective;

  // ── 5. Call LLM ──────────────────────────────────────────────────────────

  let llmContent:  string;
  let totalCost:   number;
  try {
    const response = await router.route(taskType, {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userContent },
      ],
      maxTokens:   8192,
      temperature: 0.2,
    });
    llmContent = response.content;
    totalCost  = response.estimatedCostUSD ?? 0;
  } catch (err: unknown) {
    return {
      success:       false,
      filesModified: [],
      totalCost:     0,
      duration:      Date.now() - start,
      error:         String(err),
    };
  }

  // ── 6. Parse patches ─────────────────────────────────────────────────────

  const patches: FilePatch[] = this._parsePatches(llmContent);

  if (dryRun || patches.length === 0) {
    return {
      success:       true,
      filesModified: [],
      newFiles:      [],
      totalCost,
      duration:      Date.now() - start,
      plan:          llmContent,
    };
  let validation: Awaited<ReturnType<typeof validatePatches>> | undefined;

  if (runValidation) {
    try {
      validation = await validatePatches(patches, {
        skipSyntax: skipSyntaxValidation,
        skipImports: skipImportValidation,
        skipTypes: skipTypeValidation,
        strictMode: strictValidation,
        timeout: validationTimeout,
        projectRoot: this._options.projectRoot,
      });

      validationResult = {
        passed: validation.passed,
        totalErrors: validation.totalErrors,
        totalWarnings: validation.totalWarnings,
        duration: validation.duration,
      };

      // If validation failed, return without applying patches
      if (!validation.passed) {
        return {
          success: false,
          filesModified: [],
          newFiles: [],
          totalCost,
          duration: Date.now() - start,
          validationResult,
          error: `Validation failed:\n${formatValidationResult(validation)}`,
        };
      }
    } catch (validationError: unknown) {
      return {
        success: false,
        filesModified: [],
        newFiles: [],
        totalCost,
        duration: Date.now() - start,
        error: `Validation error: ${String(validationError)}`,
      };
    }
  }

  // ── 7.5. Approval gate (after validation, before applying) ───────────────

  let approvalResult: ExecutionResult['approvalResult'];
  let patchesToApply = patches;

  if (approvalTrustLevel !== 'auto') {
    try {
      // Use CLI approval handler if none provided
      const approvalHandler = this._options.approvalHandler || new CliApprovalHandler();
      
      const approvalGate = await executeApprovalGate(
        task,
        mode,
        patches,
        totalCost,
        {
          trustLevel: approvalTrustLevel,
          approvalHandler,
          autoApproveIfValidationPasses,
          autoApprovePatterns,
          alwaysRequireApprovalPatterns,
          approvalTimeout,
        },
        this._options.projectRoot,
        validation,
      );

      approvalResult = {
        approved: approvalGate.approved,
        approvalDuration: approvalGate.approvalDuration,
        patchesApproved: approvalGate.filteredPatches.length,
        patchesRejected: patches.length - approvalGate.filteredPatches.length,
        patchesEdited: 0, // TODO: track edited count
        rejectionReason: approvalGate.rejectionReason,
      };

      if (!approvalGate.approved) {
        return {
          success: false,
          filesModified: [],
          newFiles: [],
          totalCost,
          duration: Date.now() - start,
          validationResult,
          approvalResult,
          error: `User rejected changes: ${approvalGate.rejectionReason || 'No reason provided'}`,
        };
      }

      patchesToApply = approvalGate.filteredPatches;
    } catch (approvalError: unknown) {
      return {
        success: false,
        filesModified: [],
        newFiles: [],
        totalCost,
        duration: Date.now() - start,
        validationResult,
        error: `Approval error: ${String(approvalError)}`,
      };
    }7.8. Create snapshot (before applying patches) ───────────────────────

  let snapshotResult: ExecutionResult['snapshotResult'];
  let snapshotId: string | undefined;

  if (createSnapshot && snapshotStrategy !== 'none') {
    try {
      const rollback = this._options.rollbackOrchestrator || createRollbackOrchestrator();
      
      const filesToModify: string[] = [];
      const filesToCreate: string[] = [];

      for (const patch of patchesToApply) {
        const abs = path.isAbsolute(patch.relativePath)
          ? patch.relativePath
          : path.join(this._options.projectRoot, patch.relativePath);
        
        const existed = await fs.access(abs).then(() => true, () => false);

        if (!patch.delete) {
          if (existed) {
            filesToModify.push(patch.relativePath);
          } else {
            filesToCreate.push(patch.relativePath);
          }
        }
      }

      const snapshot = await rollback.createSnapshot({
        projectRoot: this._options.projectRoot,
        task,
        mode,
        filesToModify,
        filesToCreate,
        strategy: snapshotStrategy,
        includeUntracked: snapshotIncludeUntracked,
      });

      snapshotResult = {
        success: snapshot.success,
        snapshotId: snapshot.snapshot?.id,
        strategy: snapshotStrategy,
        error: snapshot.error,
        duration: snapshot.duration,
      };

      if (snapshot.success && snapshot.snapshot) {
        snapshotId = snapshot.snapshot.id;
      }

      // Don't fail execution if snapshot creation fails - just warn
      if (!snapshot.success) {
        console.warn(
'Snapshot creation failed:', snapshot.error || 'Unknown error'
        );
      }
    } catch (snapshotError: unknown) {
      console.warn('Snapshot error:', String(snapshotError));
      snapshotResult = {
        success: false,
        strategy: snapshotStrategy,
        error: String(snapshotError),
        duration: 0,
      };
    }
  }

  // ── 
  }

  // ── 8. Apply patches to disk ──────────────────────────────────────────────

  const filesModified: string[] = [];
  const newFiles:      string[] = [];

  for (const patch of patchesToApplyisk ──────────────────────────────────────────────

  const filesModified: string[] = [];
  const newFiles:      string[] = [];

  for (const patch of patches) {
    const abs = path.isAbsolute(patch.relativePath)
      ? patch.relativePath
      : path.join(this._options.projectRoot, patch.relativePath);

    if (patch.delete) {
      try { await fs.unlink(abs); } catch { /* already absent */ }
      continue;
    }

    const existed = await fs.access(abs).then(() => true, () => false);
    try {
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, patch.content, 'utf-8');
      if (existed) {
        filesModified.push(patch.relativePath);
      } else {
        newFiles.push(patch.relativePath);
      }
    } catch (writeErr: unknown) {
      return {
        success:       false,
        filesModified,
        newFiles,
        totalCost,
        duration:      Date.now() - start,
        snapshotResult,
        error:         String(writeErr),
      };
    }
  }

  // ── 8.5. Mark snapshot as applied ─────────────────────────────────────────

  if (snapshotId) {
    try {
      const rollback = this._options.rollbackOrchestrator || createRollbackOrchestrator();
      await rollback.markSnapshotApplied(snapshotId);
    } catch (markError: unknown) {
      // Silent failure - don't block execution
      console.warn('Failed to mark snapshot as applied:', String(markError));
    }
  }

  // ── 9. Run tests if requested ─────────────────────────────────────────────

  let testResults: ExecutionResult['testResults'];

  if (runTests && (filesModified.length > 0 || newFiles.length > 0)) {
    try {
      const testRun = await executeTests({
        projectRoot: this._options.projectRoot,
        modifiedFiles: [...filesModified, ...(newFiles || [])],
        timeout: testTimeout,
        collectCoverage,
      });

      testResults = {
        framework: testRun.framework,
        totalTests: testRun.totalTests,
        passedTests: testRun.passedTests,
        failedTests: testRun.failedTests,
        testsPassed: testRun.success,
        duration: testRun.duration,
      };

      // If tests failed, mark execution as failed
      if (!testRun.success) {
        return {
          success: false,
          filesModified,
          newFiles,
          totalCost,
          duration: Date.now() - start,
          validationResult,
          testResults,
          snapshotResult,
          error: `Tests failed: ${testRun.failedTests}/${testRun.totalTests} tests failed. ${testRun.error || ''}`,
        };
      }
    } catch (testError: unknown) {
      return {
        success: false,
        filesModified,
        newFiles,
        totalCost,
        duration: Date.now() - start,
        validationResult,
        snapshotResult,
        error: `Test execution error: ${String(testError)}`,
      };
    }
  }

  // ── 10. Commit changes if requested ───────────────────────────────────────

  let commitResult: ExecutionResult['commitResult'];

  if (autoCommit && (filesModified.length > 0 || newFiles.length > 0)) {
    // Check if we should commit (either tests not required, or tests passed)
    const shouldCommit = !commitOnlyIfTestsPass || (testResults?.testsPassed ?? true);

    if (shouldCommit) {
      try {
        const commit = await executeGitCommit({
          projectRoot: this._options.projectRoot,
          modifiedFiles: filesModified,
          newFiles: newFiles || [],
          message: commitMessage,
          useConventionalCommits,
          task,
        });

        commitResult = {
          success: commit.success,
          commitHash: commit.hash,
          message: commit.message,
          filesCommitted: commit.filesCommitted,
        };

        if (!commit.success) {
          return {
            success: false,
            filesModified,
            newFiles,
            totalCost,
            duration: Date.now() - start,
            validationResult,
            snapshotResult,
            error: `Git commit failed: ${commit.error || 'Unknown error'}`,
          };
        }
      } catch (commitError: unknown) {
        return {
          success: false,
          filesModified,
          newFiles,
          totalCost,
          duration: Date.now() - start,
          validationResult,
          testResults,
          snapshotResult,
          error: `Git commit error: ${String(commitError)}`,
        };
      }
    }
  }

  // ── 11. Schedule correction detection (background task) ──────────────────

  let learningResult: ExecutionResult['learningResult'];

  if (enableLearning && snapshotId && (filesModified.length > 0 || newFiles.length > 0)) {
    // Schedule correction detection in background (don't await)
    setTimeout(async () => {
      try {
        const learning = this._options.learningOrchestrator || createLearningOrchestrator();
        
        await learning.detectAndStoreCorrections({
          projectRoot: this._options.projectRoot,
          snapshotId,
          generatedFiles: [...filesModified, ...(newFiles || [])],
          timeWindow: correctionDetectionWindow,
        });
      } catch (detectionError: unknown) {
        // Silent failure - learning is non-critical
        console.warn('Correction detection error:', detectionError instanceof Error ? detectionError.message : String(detectionError));
      }
    }, correctionDetectionWindow);

    // Get current stats
    try {
      const learning = this._options.learningOrchestrator || createLearningOrchestrator();
      const stats = await learning.getStats(this._options.projectRoot);

      learningResult = {
        correctionsDetected: 0, // Will be updated by background task
        examplesUsed: learningExamplesUsed,
        accuracyImprovement: stats.accuracyImprovement,
      };
    } catch {
      // Silent failure
      learningResult = {
        correctionsDetected: 0,
        examplesUsed: learningExamplesUsed,
      };
    }
  }

  //── 12. Success ───────────────────────────────────────────────────────────

  return {
    success:       true,
    filesModified,
    newFiles,
    totalCost,
    duration:      Date.now() - start,
    approvalResult,
    validationResult,
    testResults,
    commitResult,
    snapshotResult,
    learningResult,
    contextResult,
  };
}
