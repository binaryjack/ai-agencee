/**
 * Database Type Definitions
 * 
 * Provides type-safe interfaces for SQLite database operations.
 * Replaces 72+ instances of `as any[]` casts with proper types.
 */

/**
 * SQLite database instance interface
 * Compatible with better-sqlite3
 */
export interface SqliteDatabase {
  prepare(sql: string): SqliteStatement;
  exec(sql: string): void;
  close(): void;
  readonly open: boolean;
  readonly inTransaction: boolean;
}

/**
 * Prepared statement interface
 */
export interface SqliteStatement {
  run(...params: any[]): RunResult;
  get(...params: any[]): any | undefined;
  all(...params: any[]): any[];
  iterate(...params: any[]): IterableIterator<any>;
  pluck(toggleState?: boolean): this;
  expand(toggleState?: boolean): this;
  raw(toggleState?: boolean): this;
  bind(...params: any[]): this;
}

/**
 * Result of a run operation
 */
export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

// ============================================================================
// Row Type Definitions
// ============================================================================

/**
 * Snapshot database row (rollback/snapshot-database.ts)
 */
export interface SnapshotRow {
  id: string;
  project_root: string;
  task: string;
  mode: string;
  strategy: string;
  stash_ref: string | null;
  branch_name: string | null;
  commit_hash: string | null;
  files_modified: string;  // JSON string
  files_created: string;   // JSON string
  timestamp: number;
  applied: number;         // SQLite boolean (0 or 1)
  rolled_back: number;     // SQLite boolean (0 or 1)
}

/**
 * File snapshot row (rollback/snapshot-database.ts)
 */
export interface FileSnapshotRow {
  id: string;
  snapshot_id: string;
  file_path: string;
  original_content: string | null;
  modified_content: string;
  operation: string;
}

/**
 * Correction database row (learning/learning-database.ts)
 */
export interface CorrectionRow {
  id: string;
  snapshot_id: string;
  project_root: string;
  task: string;
  mode: string;
  file_path: string;
  original_content: string;
  corrected_content: string;
  diff: string;
  correction_type: string;
  language: string | null;
  timestamp: number;
  confidence: number;
}

/**
 * Learning example row (learning/learning-database.ts)
 */
export interface LearningExampleRow {
  id: string;
  project_root: string;
  pattern: string;
  example: string;
  category: string;
  confidence: number;
  created_at: number;
  last_used: number | null;
  use_count: number;
}

/**
 * Symbol index row (context/context-index.ts)
 * Matches: CREATE TABLE symbols (id, file_path, name, type, start_line, end_line, code, language, is_exported)
 */
export interface SymbolRow {
  id: string;
  file_path: string;
  name: string;
  type: string;
  start_line: number;
  end_line: number;
  code: string;
  language: string | null;
  is_exported: number;  // SQLite boolean (0 or 1)
}

/**
 * File index row (context/context-index.ts)
 * Matches: CREATE TABLE files (file_path, last_modified, last_indexed, hash)
 */
export interface FileIndexRow {
  file_path: string;
  last_modified: number;
  last_indexed: number;
  hash: string;
}

/**
 * Dependency row (context/context-index.ts)
 * Matches: CREATE TABLE dependencies (id, file_path, dependency_path)
 */
export interface DependencyRow {
  id: string;
  file_path: string;
  dependency_path: string;
}

/**
 * Response cache row (cost-optimization/response-cache.ts)
 * Matches: CREATE TABLE cache (key, response, model, input_tokens, output_tokens, cost, timestamp, hit_count, project_root)
 */
export interface CacheRow {
  key: string;
  response: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  timestamp: number;
  hit_count: number;
  project_root: string;
}

/**
 * Budget usage row (cost-optimization/budget-tracker.ts)
 */
export interface UsageRow {
  id: string;
  timestamp: number;
  project_root: string;
  task: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  cached: number;  // SQLite boolean (0 or 1)
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for SQLite boolean fields (0 or 1)
 */
export function toBoolean(value: number): boolean {
  return value === 1;
}

/**
 * Convert boolean to SQLite integer
 */
export function fromBoolean(value: boolean): number {
  return value ? 1 : 0;
}

/**
 * Type guard for nullable fields
 */
export function isNullOrUndefined(value: any): value is null | undefined {
  return value === null || value === undefined;
}

// ============================================================================
// Error Formatter (Phase 1.4)
// ============================================================================

/**
 * Centralized error formatting utility
 * Replaces duplicated error handling across modules
 */
export class ErrorFormatter {
  /**
   * Format unknown error to string
   */
  static format(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  /**
   * Extract error stack trace
   */
  static getStack(error: unknown): string | undefined {
    if (error instanceof Error) {
      return error.stack;
    }
    return undefined;
  }

  /**
   * Check if error has specific code
   */
  static hasCode(error: unknown, code: string): boolean {
    return error instanceof Error && 'code' in error && error.code === code;
  }

  /**
   * Create error result object
   */
  static toErrorResult<T extends object>(error: unknown): T & { success: false; error: string } {
    return {
      success: false,
      error: this.format(error),
    } as T & { success: false; error: string };
  }
}
