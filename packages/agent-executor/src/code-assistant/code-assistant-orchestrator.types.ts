/**
 * Type definitions for Code Assistant orchestrator
 */

export type CodeAssistantOptions = {
  projectRoot: string;
  dagPath?: string;
  budgetCap?: number;
  modelProvider?: string;
  indexStore?: any; // CodebaseIndexStore
  parserRegistry?: any; // ParserRegistry
  auditLog?: any; // AuditLog
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
  plan?: any;
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
