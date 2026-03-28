/**
 * None Rollback Strategy
 * 
 * No-op strategy used when rollback mechanism is set to 'none'.
 * Always succeeds without performing any git operations.
 */

import type { RollbackResult, Snapshot, UndoFileResult } from '../rollback.types.js';
import type { IRollbackStrategy } from './rollback-strategy.interface.js';

export class NoneStrategy implements IRollbackStrategy {
  validate(_snapshot: Snapshot): string | undefined {
    // No validation needed for 'none' strategy
    return undefined;
  }

  async executeRollback(
    _snapshot: Snapshot,
    filesToRollback: string[],
    _dryRun: boolean,
    start: number,
  ): Promise<RollbackResult> {
    return {
      success: true,
      filesRolledBack: filesToRollback,
      filesFailed: [],
      duration: Date.now() - start,
    };
  }

  async undoFile(
    _snapshot: Snapshot,
    filePath: string,
    originalContent: string | undefined,
    start: number,
  ): Promise<UndoFileResult> {
    return {
      success: true,
      filePath,
      originalContent,
      duration: Date.now() - start,
    };
  }
}
