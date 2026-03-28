/**
 * Git Stash Rollback Strategy
 * 
 * Rolls back changes by applying a git stash.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { executeGitCommand } from '../git-utils.js';
import type { RollbackResult, Snapshot, UndoFileResult } from '../rollback.types.js';
import type { IRollbackStrategy } from './rollback-strategy.interface.js';

export class GitStashStrategy implements IRollbackStrategy {
  validate(snapshot: Snapshot): string | undefined {
    if (!snapshot.stashRef) {
      return 'No stash reference in snapshot';
    }
    return undefined;
  }

  async executeRollback(
    snapshot: Snapshot,
    filesToRollback: string[],
    dryRun: boolean,
    start: number,
  ): Promise<RollbackResult> {
    const validationError = this.validate(snapshot);
    if (validationError) {
      return {
        success: false,
        filesRolledBack: [],
        filesFailed: filesToRollback,
        error: validationError,
        duration: Date.now() - start,
      };
    }

    if (dryRun) {
      return {
        success: true,
        filesRolledBack: filesToRollback,
        filesFailed: [],
        duration: Date.now() - start,
      };
    }

    // Apply stash
    const { exitCode, stderr } = await executeGitCommand(
      ['stash', 'apply', snapshot.stashRef!],
      snapshot.projectRoot,
    );

    if (exitCode !== 0) {
      return {
        success: false,
        filesRolledBack: [],
        filesFailed: filesToRollback,
        error: `Git stash apply failed: ${stderr}`,
        duration: Date.now() - start,
      };
    }

    return {
      success: true,
      filesRolledBack: filesToRollback,
      filesFailed: [],
      duration: Date.now() - start,
    };
  }

  async undoFile(
    snapshot: Snapshot,
    filePath: string,
    originalContent: string | undefined,
    start: number,
  ): Promise<UndoFileResult> {
    const validationError = this.validate(snapshot);
    if (validationError) {
      return {
        success: false,
        filePath,
        originalContent,
        error: validationError,
        duration: Date.now() - start,
      };
    }

    // Checkout file from stash
    const { exitCode, stderr } = await executeGitCommand(
      ['checkout', snapshot.stashRef!, '--', filePath],
      snapshot.projectRoot,
    );

    if (exitCode !== 0) {
      return {
        success: false,
        filePath,
        originalContent,
        error: `Git checkout failed: ${stderr}`,
        duration: Date.now() - start,
      };
    }

    // Read new content
    const fullPath = path.join(snapshot.projectRoot, filePath);
    const contentAfterUndo = await fs.readFile(fullPath, 'utf-8');

    return {
      success: true,
      filePath,
      originalContent,
      contentAfterUndo,
      duration: Date.now() - start,
    };
  }
}
