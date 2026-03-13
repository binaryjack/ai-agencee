/**
 * Type definitions for Code Assistant orchestrator
 */

import type { IIndexerAuditLog } from './indexer/codebase-indexer.types';
import type { ParserRegistryInstance } from './parsers/parser-registry';
import type { CodebaseIndexStoreInstance } from './storage/codebase-index-store.types';

export type CodeAssistantOptions = {
  projectRoot: string;
  dagPath?: string;
  budgetCap?: number;
  modelProvider?: string;
  indexStore?: CodebaseIndexStoreInstance;
  parserRegistry?: ParserRegistryInstance;
  auditLog?: IIndexerAuditLog;
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
