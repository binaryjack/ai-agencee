/**
 * @file rollback.types.ts
 * @description Type definitions for rollback and undo system
 * 
 * Part of Phase 2.2: Rollback & Undo System
 * Allows users to safely undo AI-generated changes
 */

/**
 * Snapshot strategy
 */
export type SnapshotStrategy = 'git-stash' | 'git-branch' | 'git-commit' | 'none';

/**
 * Snapshot metadata stored in database
 */
export interface Snapshot {
  /** Unique snapshot ID (auto-generated) */
  id: string;
  /** Task description that created this snapshot */
  task: string;
  /** Execution mode (ask/plan/agent) */
  mode: string;
  /** Snapshot strategy used */
  strategy: SnapshotStrategy;
  /** Git stash reference (if strategy is 'git-stash') */
  stashRef?: string;
  /** Git branch name (if strategy is 'git-branch') */
  branchName?: string;
  /** Git commit hash (if strategy is 'git-commit') */
  commitHash?: string;
  /** Files that were modified in this execution */
  filesModified: string[];
  /** Files that were created in this execution */
  filesCreated: string[];
  /** Timestamp when snapshot was created */
  timestamp: number;
  /** Project root directory */
  projectRoot: string;
  /** Whether this snapshot has been applied (can't rollback if not applied) */
  applied: boolean;
  /** Whether this snapshot has been rolled back */
  rolledBack: boolean;
}

/**
 * Snapshot creation config
 */
export interface SnapshotConfig {
  /** Project root directory */
  projectRoot: string;
  /** Task description */
  task: string;
  /** Execution mode */
  mode: string;
  /** Files that will be modified */
  filesToModify: string[];
  /** Files that will be created */
  filesToCreate?: string[];
  /** Snapshot strategy to use */
  strategy?: SnapshotStrategy;
  /** Include untracked files in snapshot */
  includeUntracked?: boolean;
}

/**
 * Snapshot creation result
 */
export interface SnapshotResult {
  /** Snapshot was created successfully */
  success: boolean;
  /** Created snapshot metadata */
  snapshot?: Snapshot;
  /** Error message if creation failed */
  error?: string;
  /** Duration in milliseconds */
  duration: number;
}

/**
 * Rollback options
 */
export interface RollbackOptions {
  /** Snapshot ID to rollback to */
  snapshotId: string;
  /** Specific files to rollback (undefined = all files) */
  filesToRollback?: string[];
  /** Force rollback even if working directory has uncommitted changes */
  force?: boolean;
  /** Preview rollback without actually executing it */
  dryRun?: boolean;
}

/**
 * Rollback result
 */
export interface RollbackResult {
  /** Rollback was successful */
  success: boolean;
  /** Files that were rolled back */
  filesRolledBack: string[];
  /** Files that failed to rollback */
  filesFailed: string[];
  /** Error message if rollback failed */
  error?: string;
  /** Duration in milliseconds */
  duration: number;
  /** Snapshot after rollback */
  snapshotAfterRollback?: Snapshot;
}

/**
 * Undo individual file options
 */
export interface UndoFileOptions {
  /** Snapshot ID to undo from */
  snapshotId: string;
  /** File path to undo */
  filePath: string;
  /** Preview undo without executing */
  dryRun?: boolean;
}

/**
 * Undo individual file result
 */
export interface UndoFileResult {
  /** Undo was successful */
  success: boolean;
  /** File path that was undone */
  filePath: string;
  /** Error message if undo failed */
  error?: string;
  /** Original content before undo */
  originalContent?: string;
  /** Content after undo */
  contentAfterUndo?: string;
  /** Duration in milliseconds */
  duration: number;
}

/**
 * Snapshot cleanup options
 */
export interface SnapshotCleanupOptions {
  /** Project root directory */
  projectRoot: string;
  /** Maximum number of snapshots to keep (default: 10) */
  maxSnapshots?: number;
  /** Maximum age in milliseconds (default: 7 days) */
  maxAge?: number;
  /** Delete only rolled-back snapshots */
  onlyRolledBack?: boolean;
}

/**
 * Snapshot cleanup result
 */
export interface SnapshotCleanupResult {
  /** Cleanup was successful */
  success: boolean;
  /** Number of snapshots deleted */
  snapshotsDeleted: number;
  /** Snapshots that were deleted */
  deletedSnapshots: Snapshot[];
  /** Error message if cleanup failed */
  error?: string;
  /** Duration in milliseconds */
  duration: number;
}

/**
 * Snapshot database interface
 */
export interface ISnapshotDatabase {
  /** Save snapshot to database */
  saveSnapshot(snapshot: Snapshot): Promise<void>;
  
  /** Get snapshot by ID */
  getSnapshot(snapshotId: string): Promise<Snapshot | undefined>;
  
  /** Get all snapshots for a project */
  getSnapshots(projectRoot: string): Promise<Snapshot[]>;
  
  /** Mark snapshot as applied */
  markSnapshotApplied(snapshotId: string): Promise<void>;
  
  /** Mark snapshot as rolled back */
  markSnapshotRolledBack(snapshotId: string): Promise<void>;
  
  /** Delete snapshot */
  deleteSnapshot(snapshotId: string): Promise<void>;
  
  /** Delete multiple snapshots */
  deleteSnapshots(snapshotIds: string[]): Promise<number>;
  
  /** Clean up old snapshots */
  cleanup(options: SnapshotCleanupOptions): Promise<SnapshotCleanupResult>;
}
