/**
 * @file rollback-orchestrator.ts
 * @description High-level rollback orchestrator
 * 
 * SOLID Principles Applied:
 * 
 * 1. Single Responsibility Principle (SRP):
 *    - This class coordinates rollback operations only
 *    - Snapshot creation → delegated to snapshot-manager.ts
 *    - Rollback execution → delegated to rollback-executor.ts (Strategy Pattern)
 *    - Database persistence → delegated to ISnapshotDatabase
 *    - Each module has one reason to change
 * 
 * 2. Open/Closed Principle (OCP):
 *    - Open for extension: new rollback strategies via rollback-executor.ts
 *    - Closed for modification: this orchestrator unchanged when adding strategies
 *    - Currently supports: git-stash, git-branch, git-commit, file-backup, etc.
 * 
 * 3. Dependency Inversion Principle (DIP):
 *    - Depends on ISnapshotDatabase abstraction, not SnapshotDatabase class
 *    - Can inject mock database for testing
 *    - Can inject alternative storage (e.g., cloud-backed)
 * 
 * Workflow:
 * 1. Create snapshot before execution
 * 2. Save to database
 * 3. Execute code changes
 * 4. Mark snapshot as applied
 * 5. On rollback: Restore from snapshot
 * 6. Clean up old snapshots periodically
 */

import { loadRollbackConfig } from '../config/index.js'
import { executeRollback, undoFile } from './rollback-executor.js'
import type {
    ISnapshotDatabase,
    RollbackOptions,
    RollbackResult,
    Snapshot,
    SnapshotCleanupOptions,
    SnapshotCleanupResult,
    SnapshotConfig,
    SnapshotResult,
    UndoFileOptions,
    UndoFileResult,
} from './rollback.types.js'
import { SnapshotDatabase } from './snapshot-database.js'
import { createSnapshot } from './snapshot-manager.js'

/**
 * Rollback orchestrator options
 */
export interface RollbackOrchestratorOptions {
  /** Custom snapshot database (optional) */
  snapshotDatabase?: ISnapshotDatabase;
  /** Path to snapshot database file (optional) */
  databasePath?: string;
  /** Auto-cleanup old snapshots (default: true) */
  autoCleanup?: boolean;
  /** Maximum snapshots to keep per project (default: 10) */
  maxSnapshots?: number;
  /** Maximum age of snapshots in milliseconds (default: 7 days) */
  maxAge?: number;
}

/**
 * High-level rollback orchestrator
 * 
 * Coordinates snapshot creation, rollback execution, and cleanup.
 * Demonstrates Single Responsibility and Dependency Inversion.
 */
export class RollbackOrchestrator {
  private readonly _db: ISnapshotDatabase;
  private readonly _options: RollbackOrchestratorOptions;

  /**
   * Creates a rollback orchestrator
   * 
   * @param options - Configuration and optional database override
   * 
   * Dependency Inversion in action:
   * - Accepts ISnapshotDatabase, not SnapshotDatabase
   * - Enables testing with mock databases
   * - Supports alternative storage backends
   */
  constructor(options: RollbackOrchestratorOptions = {}) {
    const config = loadRollbackConfig();
    
    this._options = {
      autoCleanup: config.autoCleanup,
      maxSnapshots: config.maxSnapshots,
      maxAge: config.maxAge,
      ...options,
    };

    this._db = options.snapshotDatabase || new SnapshotDatabase(options.databasePath);
  }

  /**
   * Create snapshot before execution
   * 
   * @param config - Snapshot configuration
   * @returns Snapshot result
   */
  async createSnapshot(config: SnapshotConfig): Promise<SnapshotResult> {
    // Create git snapshot
    const snapshotResult = await createSnapshot(config);

    if (!snapshotResult.success || !snapshotResult.snapshot) {
      return snapshotResult;
    }

    // Save to database
    try {
      await this._db.saveSnapshot(snapshotResult.snapshot);

      // Auto-cleanup if enabled
      if (this._options.autoCleanup) {
        await this._autoCleanup(config.projectRoot);
      }

      return snapshotResult;

    } catch (error: unknown) {
      return {
        success: false,
        error: `Failed to save snapshot to database: ${error instanceof Error ? error.message : String(error)}`,
        duration: snapshotResult.duration,
      };
    }
  }

  /**
   * Mark snapshot as applied (after successful execution)
   * 
   * @param snapshotId - Snapshot ID
   */
  async markSnapshotApplied(snapshotId: string): Promise<void> {
    await this._db.markSnapshotApplied(snapshotId);
  }

  /**
   * Rollback to snapshot
   * 
   * @param options - Rollback options
   * @returns Rollback result
   */
  async rollback(options: RollbackOptions): Promise<RollbackResult> {
    // Get snapshot from database
    const snapshot = await this._db.getSnapshot(options.snapshotId);

    if (!snapshot) {
      return {
        success: false,
        filesRolledBack: [],
        filesFailed: [],
        error: `Snapshot not found: ${options.snapshotId}`,
        duration: 0,
      };
    }

    // Execute rollback
    const rollbackResult = await executeRollback(snapshot, options);

    // Mark as rolled back in database
    if (rollbackResult.success && rollbackResult.snapshotAfterRollback) {
      await this._db.markSnapshotRolledBack(options.snapshotId);
    }

    return rollbackResult;
  }

  /**
   * Undo individual file
   * 
   * @param options - Undo file options
   * @returns Undo result
   */
  async undoFile(options: UndoFileOptions): Promise<UndoFileResult> {
    // Get snapshot from database
    const snapshot = await this._db.getSnapshot(options.snapshotId);

    if (!snapshot) {
      return {
        success: false,
        filePath: options.filePath,
        error: `Snapshot not found: ${options.snapshotId}`,
        duration: 0,
      };
    }

    // Execute undo
    return undoFile(snapshot, options);
  }

  /**
   * Get snapshot by ID
   * 
   * @param snapshotId - Snapshot ID
   * @returns Snapshot or undefined
   */
  async getSnapshot(snapshotId: string): Promise<Snapshot | undefined> {
    return this._db.getSnapshot(snapshotId);
  }

  /**
   * Get all snapshots for a project
   * 
   * @param projectRoot - Project root directory
   * @returns List of snapshots
   */
  async getSnapshots(projectRoot: string): Promise<Snapshot[]> {
    return this._db.getSnapshots(projectRoot);
  }

  /**
   * Get recent snapshots (last N)
   * 
   * @param projectRoot - Project root directory
   * @param count - Number of snapshots to return (default: 10)
   * @returns List of recent snapshots
   */
  async getRecentSnapshots(projectRoot: string, count = 10): Promise<Snapshot[]> {
    const allSnapshots = await this._db.getSnapshots(projectRoot);
    return allSnapshots.slice(0, count);
  }

  /**
   * Delete snapshot
   * 
   * @param snapshotId - Snapshot ID
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    await this._db.deleteSnapshot(snapshotId);
  }

  /**
   * Manual cleanup of old snapshots
   * 
   * @param options - Cleanup options
   * @returns Cleanup result
   */
  async cleanup(options: SnapshotCleanupOptions): Promise<SnapshotCleanupResult> {
    return this._db.cleanup(options);
  }

  /**
   * Auto cleanup (runs in background)
   */
  private async _autoCleanup(projectRoot: string): Promise<void> {
    try {
      await this._db.cleanup({
        projectRoot,
        maxSnapshots: this._options.maxSnapshots,
        maxAge: this._options.maxAge,
        onlyRolledBack: false,
      });
    } catch (error: unknown) {
      // Silent failure - auto cleanup should not block execution
      console.warn('Auto cleanup failed:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this._db instanceof SnapshotDatabase) {
      this._db.close();
    }
  }
}

/**
 * Create default rollback orchestrator instance
 */
export function createRollbackOrchestrator(
  options?: RollbackOrchestratorOptions,
): RollbackOrchestrator {
  return new RollbackOrchestrator(options);
}
