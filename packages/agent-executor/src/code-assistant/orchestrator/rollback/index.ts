/**
 * @file index.ts
 * @description Rollback & Undo System - Public API
 * 
 * Part of Phase 2.2: Rollback & Undo System
 * Allows users to safely undo AI-generated changes
 * 
 * Usage:
 * ```ts
 * import { RollbackOrchestrator } from './rollback';
 * 
 * const rollback = new RollbackOrchestrator();
 * 
 * // Before execution: Create snapshot
 * const snapshotResult = await rollback.createSnapshot({
 *   projectRoot: '/path/to/project',
 *   task: 'Add authentication',
 *   mode: 'feature',
 *   filesToModify: ['src/api/auth.ts', 'src/routes.ts'],
 *   filesToCreate: ['src/middleware/auth.ts'],
 * });
 * 
 * const snapshotId = snapshotResult.snapshot?.id;
 * 
 * // ... execute code changes ...
 * 
 * // After execution: Mark snapshot as applied
 * await rollback.markSnapshotApplied(snapshotId);
 * 
 * // Later: Rollback if something went wrong
 * const rollbackResult = await rollback.rollback({
 *   snapshotId,
 *   force: false,
 *   dryRun: false,
 * });
 * 
 * if (rollbackResult.success) {
 *   console.log(`Rolled back ${rollbackResult.filesRolledBack.length} files`);
 * }
 * ```
 */

// Main orchestrator
export {
    RollbackOrchestrator,
    createRollbackOrchestrator,
    type RollbackOrchestratorOptions
} from './rollback-orchestrator.js';

// Snapshot creation
export { createSnapshot } from './snapshot-manager.js';

// Rollback execution
export { executeRollback, undoFile } from './rollback-executor.js';

// Database
export { SnapshotDatabase } from './snapshot-database.js';

// Types
export type {
    ISnapshotDatabase, RollbackOptions,
    RollbackResult, Snapshot, SnapshotCleanupOptions,
    SnapshotCleanupResult, SnapshotConfig,
    SnapshotResult, SnapshotStrategy, UndoFileOptions,
    UndoFileResult
} from './rollback.types.js';

