/**
 * Type definitions for Code Assistant orchestrator
 *
 * Kept deliberately provider-agnostic — no imports from heavy runtime modules so
 * callers can import these types without pulling in SQLite or the model router.
 */

import type { IModelRouter } from '../lib/model-router/index.js'
import type { EmbeddingProvider } from './embeddings/embedding-provider.types.js'
import type { IIndexerAuditLog } from './indexer/codebase-indexer.types'
import type { ParserRegistryInstance } from './parsers/parser-registry'
import type { CodebaseIndexStoreInstance } from './storage/codebase-index-store.types'
import type { ApprovalHandler } from './orchestrator/approval/approval.types.js'
import type { RollbackOrchestrator } from './orchestrator/rollback/index.js'
import type { LearningOrchestrator } from './orchestrator/learning/index.js'
import type { IContextIntelligence } from './orchestrator/context/index.js'

// ─── Options ─────────────────────────────────────────────────────────────────

export type CodeAssistantOptions = {
  projectRoot: string;
  /** Path to a model-router.json or agents/ directory containing one. */
  dagPath?: string;
  budgetCap?: number;
  modelProvider?: string;
  /** Pre-wired model router — skips the bootstrap step when provided. */
  modelRouter?: IModelRouter;
  /** Pre-opened index store — used in tests and when the caller already holds one. */
  indexStore?: CodebaseIndexStoreInstance;
  parserRegistry?: ParserRegistryInstance;
  auditLog?: IIndexerAuditLog;
  /**
   * Embedding provider used to enable semantic (vector) search in _gatherContext.
   * When omitted, context gathering falls back to FTS5-only keyword search.
   * Use TransformersEmbeddingProvider for a fully local, zero-cost option.
   */
  embeddingProvider?: EmbeddingProvider;
  /** Approval handler for human-in-the-loop approval gates */
  approvalHandler?: ApprovalHandler;
  /** Rollback orchestrator for snapshot and undo functionality */
  rollbackOrchestrator?: RollbackOrchestrator;
  /** Learning orchestrator for correction tracking and learning */
  learningOrchestrator?: LearningOrchestrator;
  /** Context intelligence for smart context prioritization */
  contextIntelligence?: IContextIntelligence;
};

export type ExecutionRequest = {
  task: string;
  dryRun?: boolean;
  autoApprove?: boolean;
  mode?: 'quick-fix' | 'feature' | 'refactor' | 'debug';
  /** Approval trust level: preview (always ask), approve-each (conditional), auto (never ask) */
  approvalTrustLevel?: 'preview' | 'approve-each' | 'auto';
  /** Auto-approve if validation passes (default: false) */
  autoApproveIfValidationPasses?: boolean;
  /** File patterns to auto-approve (e.g., ['**/*.test.ts']) */
  autoApprovePatterns?: string[];
  /** File patterns that always require approval (e.g., ['**/*.config.js']) */
  alwaysRequireApprovalPatterns?: string[];
  /** Timeout for approval in milliseconds (default: 300000 = 5 minutes) */
  approvalTimeout?: number;
  /** Run validation before applying patches (default: true) */
  runValidation?: boolean;
  /** Skip syntax validation (default: false) */
  skipSyntaxValidation?: boolean;
  /** Skip import validation (default: false) */
  skipImportValidation?: boolean;
  /** Skip type validation (default: false) */
  skipTypeValidation?: boolean;
  /** Treat warnings as errors in validation (default: false) */
  strictValidation?: boolean;
  /** Timeout for validation in milliseconds (default: 30000) */
  validationTimeout?: number;
  /** Run tests after applying patches (default: false) */
  runTests?: boolean;
  /** Timeout for test execution in milliseconds (default: 60000) */
  testTimeout?: number;
  /** Collect code coverage during test run (default: false) */
  collectCoverage?: boolean;
  /** Commit changes after successful execution (default: false) */
  autoCommit?: boolean;
  /** Commit only if tests pass (requires runTests: true, default: true) */
  commitOnlyIfTestsPass?: boolean;
  /** Custom commit message (if not provided, will be generated) */
  commitMessage?: string;
  /** Use conventional commits format (default: true) */
  useConventionalCommits?: boolean;
  /** Create snapshot before execution for rollback (default: true) */
  createSnapshot?: boolean;
  /** Snapshot strategy: 'git-stash' | 'git-branch' | 'git-commit' | 'none' (default: 'git-stash') */
  snapshotStrategy?: 'git-stash' | 'git-branch' | 'git-commit' | 'none';
  /** Include untracked files in snapshot (default: true) */
  snapshotIncludeUntracked?: boolean;
  /** Enable learning from corrections (default: true) */
  enableLearning?: boolean;
  /** Maximum learning examples to include in prompt (default: 5) */
  maxLearningExamples?: number;
  /** Enable context intelligence (default: true) */
  enableContextIntelligence?: boolean;
  /** Maximum context tokens (default: 8000) */
  maxContextTokens?: number;
  /** Context prioritization keywords (auto-extracted from task if not provided) */
  contextKeywords?: string[];
  /** Files to always include in context */
  alwaysIncludeInContext?: string[];
  /** Time window to detect corrections after execution (default: 1 hour) */
  correctionDetectionWindow?: number;
};

export type ExecutionResult = {
  success: boolean;
  filesModified: string[];
  newFiles?: string[];
  totalCost: number;
  /** Approval result if approval gate was used */
  approvalResult?: {
    approved: boolean;
    approvalDuration: number;
    patchesApproved: number;
    patchesRejected: number;
    patchesEdited: number;
    rejectionReason?: string;
  };
  /** Validation results if runValidation was enabled */
  validationResult?: {
    passed: boolean;
    totalErrors: number;
    totalWarnings: number;
    duration: number;
  };
  /** Test execution results if runTests was enabled */
  testResults?: {
    framework: string;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    testsPassed: boolean;
    duration: number;
  };
  /** Git commit result if autoCommit was enabled */
  commitResult?: {
    success: boolean;
    commitHash?: string;
    message?: string;
    filesCommitted: number;
  };
  /** Snapshot result if createSnapshot was enabled */
  snapshotResult?: {
    success: boolean;
    snapshotId?: string;
    strategy: string;
    error?: string;
  /** Context intelligence result if enableContextIntelligence was enabled */
  contextResult?: {
    totalSymbols: number;
    selectedSymbols: number;
    filesIncluded: number;
    estimatedTokens: number;
    compressionRatio: number;
  };
    duration: number;
  };
  /** Learning result if enableLearning was enabled */
  learningResult?: {
    correctionsDetected: number;
    examplesUsed: number;
    accuracyImprovement?: number;
  };
  duration: number;
  plan?: unknown;
  planId?: string;
  error?: string;
  rollback?: boolean;
  indexingCost?: number;
};

export type IndexStatus = {
  indexed: boolean;
  filesIndexed: number;
  symbolsExtracted: number;
  lastIndexedAt?: number;
};

// ─── Internal patch descriptor ────────────────────────────────────────────────

/**
 * A single file operation emitted by the LLM and applied by execute().
 * Shared between parse-patches.ts and execute.ts to avoid circular imports.
 */
export type FilePatch = {
  /** Relative (or absolute) path as declared in the ## FILE / ## DELETE block. */
  relativePath: string;
  /** Full replacement content for FILE blocks; empty string for DELETE. */
  content:      string;
  delete?:      boolean;
};
