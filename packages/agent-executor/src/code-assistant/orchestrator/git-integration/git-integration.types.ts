/**
 * @file git-integration.types.ts
 * @description Type definitions for git integration
 * 
 * Part of Phase 1.2: Git Integration
 * Enables Codernic to commit validated changes automatically
 */

/**
 * Git commit result
 */
export interface GitCommitResult {
  /** Commit was successful */
  success: boolean;
  /** Commit hash (SHA) */
  commitHash?: string;
  /** Commit message used */
  message: string;
  /** Files that were committed */
  filesCommitted: string[];
  /** Error message if commit failed */
  error?: string;
  /** Duration in milliseconds */
  duration: number;
}

/**
 * Git change detection result
 */
export interface GitChangesResult {
  /** Files modified (tracked files) */
  modified: string[];
  /** Files added (untracked files) */
  added: string[];
  /** Files deleted */
  deleted: string[];
  /** Total number of changed files */
  totalChanges: number;
  /** Git repository exists */
  hasGitRepo: boolean;
  /** Working directory is clean (no changes) */
  isClean: boolean;
}

/**
 * Commit message generation config
 */
export interface CommitMessageConfig {
  /** Files that were changed */
  changedFiles: string[];
  /** Type of change (feat, fix, refactor, etc.) */
  changeType?: 'feat' | 'fix' | 'refactor' | 'docs' | 'test' | 'chore';
  /** Short description of changes */
  description?: string;
  /** Use conventional commits format */
  useConventionalCommits?: boolean;
  /** Maximum message length */
  maxLength?: number;
}

/**
 * Commit message generation result
 */
export interface CommitMessageResult {
  /** Generated commit message */
  message: string;
  /** Subject line (first line) */
  subject: string;
  /** Body (remaining lines if any) */
  body?: string;
  /** Conventional commit type if applicable */
  type?: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Git integration configuration
 */
export interface GitIntegrationConfig {
  /** Project root directory */
  projectRoot: string;
  /** Files that were modified by code generation */
  modifiedFiles: string[];
  /** Commit message (if not provided, will be generated) */
  commitMessage?: string;
  /** Stage files before committing (default: true) */
  stageFiles?: boolean;
  /** Use conventional commits format (default: true) */
  useConventionalCommits?: boolean;
  /** Task description (used for commit message generation) */
  taskDescription?: string;
}
