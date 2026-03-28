/**
 * Rollback Strategy Interface
 * 
 * Defines the contract for all rollback strategies.
 * Follows the Strategy Pattern for different rollback mechanisms.
 */

import type { RollbackResult, Snapshot, UndoFileResult } from '../rollback.types.js';

/**
 * Base interface for rollback strategies
 */
export interface IRollbackStrategy {
  /**
   * Execute rollback for multiple files
   * 
   * @param snapshot - Snapshot to rollback from
   * @param filesToRollback - Files to rollback
   * @param dryRun - If true, don't actually execute rollback
   * @param start - Start timestamp for duration calculation
   * @returns Rollback result
   */
  executeRollback(
    snapshot: Snapshot,
    filesToRollback: string[],
    dryRun: boolean,
    start: number,
  ): Promise<RollbackResult>;

  /**
   * Undo changes for a single file
   * 
   * @param snapshot - Snapshot to undo from
   * @param filePath - File to undo
   * @param originalContent - Original content before undo
   * @param start - Start timestamp for duration calculation
   * @returns Undo result
   */
  undoFile(
    snapshot: Snapshot,
    filePath: string,
    originalContent: string | undefined,
    start: number,
  ): Promise<UndoFileResult>;

  /**
   * Validate that this strategy can be used with the given snapshot
   * 
   * @param snapshot - Snapshot to validate
   * @returns Validation error message, or undefined if valid
   */
  validate(snapshot: Snapshot): string | undefined;
}
