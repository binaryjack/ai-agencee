/**
 * Type definitions for Code Assistant orchestrator
 *
 * Kept deliberately provider-agnostic — no imports from heavy runtime modules so
 * callers can import these types without pulling in SQLite or the model router.
 */

import type { IModelRouter } from '../lib/model-router/index.js';
import type { EmbeddingProvider } from './embeddings/embedding-provider.types.js';
import type { IIndexerAuditLog } from './indexer/codebase-indexer.types';
import type { ParserRegistryInstance } from './parsers/parser-registry';
import type { CodebaseIndexStoreInstance } from './storage/codebase-index-store.types';

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
};

export type ExecutionRequest = {
  task: string;
  dryRun?: boolean;
  autoApprove?: boolean;
  mode?: 'quick-fix' | 'feature' | 'refactor' | 'debug';
};

export type ExecutionResult = {
  success: boolean;
  filesModified: string[];
  newFiles?: string[];
  totalCost: number;
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
