/**
 * @file snapshot-database.ts
 * @description SQLite database for snapshot persistence
 * 
 * Schema:
 * - snapshots table: Stores snapshot metadata
 * 
 * Features:
 * - Fast lookups by snapshot ID
 * - Automatic cleanup of old snapshots
 * - Concurrent-safe (SQLite transactions)
 */

import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getDefaultDatabasePath } from '../config/index.js';
import type { SnapshotRow } from '../database/types.js';
import type {
    ISnapshotDatabase,
    Snapshot,
    SnapshotCleanupOptions,
    SnapshotCleanupResult,
    SnapshotStrategy,
} from './rollback.types.js';

/**
 * SQLite-based snapshot database
 */
export class SnapshotDatabase implements ISnapshotDatabase {
  private readonly _db: Database.Database;

  constructor(dbPath?: string) {
    const finalDbPath = dbPath || getDefaultDatabasePath('SNAPSHOTS');

    // Ensure directory exists
    const dbDir = path.dirname(finalDbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Open database
    this._db = new Database(finalDbPath);

    // Enable WAL mode for better concurrency
    this._db.pragma('journal_mode = WAL');

    // Initialize schema
    this._initializeSchema();
  }

  /**
   * Initialize database schema
   */
  private _initializeSchema(): void {
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        task TEXT NOT NULL,
        mode TEXT NOT NULL,
        strategy TEXT NOT NULL,
        stash_ref TEXT,
        branch_name TEXT,
        commit_hash TEXT,
        files_modified TEXT NOT NULL,
        files_created TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        project_root TEXT NOT NULL,
        applied INTEGER NOT NULL DEFAULT 0,
        rolled_back INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_project_root ON snapshots(project_root);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON snapshots(timestamp);
      CREATE INDEX IF NOT EXISTS idx_applied ON snapshots(applied);
      CREATE INDEX IF NOT EXISTS idx_rolled_back ON snapshots(rolled_back);
    `);
  }

  /**
   * Save snapshot to database
   */
  async saveSnapshot(snapshot: Snapshot): Promise<void> {
    const stmt = this._db.prepare(`
      INSERT INTO snapshots (
        id, task, mode, strategy, stash_ref, branch_name, commit_hash,
        files_modified, files_created, timestamp, project_root, applied, rolled_back
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      snapshot.id,
      snapshot.task,
      snapshot.mode,
      snapshot.strategy,
      snapshot.stashRef || null,
      snapshot.branchName || null,
      snapshot.commitHash || null,
      JSON.stringify(snapshot.filesModified),
      JSON.stringify(snapshot.filesCreated),
      snapshot.timestamp,
      snapshot.projectRoot,
      snapshot.applied ? 1 : 0,
      snapshot.rolledBack ? 1 : 0,
    );
  }

  /**
   * Get snapshot by ID
   */
  async getSnapshot(snapshotId: string): Promise<Snapshot | undefined> {
    const stmt = this._db.prepare(`
      SELECT * FROM snapshots WHERE id = ?
    `);

    const row = stmt.get(snapshotId) as SnapshotRow | undefined;

    if (!row) {
      return undefined;
    }

    return this._rowToSnapshot(row);
  }

  /**
   * Get all snapshots for a project
   */
  async getSnapshots(projectRoot: string): Promise<Snapshot[]> {
    const stmt = this._db.prepare(`
      SELECT * FROM snapshots
      WHERE project_root = ?
      ORDER BY timestamp DESC
    `);

    const rows = stmt.all(projectRoot) as SnapshotRow[];

    return rows.map((row) => this._rowToSnapshot(row));
  }

  /**
   * Mark snapshot as applied
   */
  async markSnapshotApplied(snapshotId: string): Promise<void> {
    const stmt = this._db.prepare(`
      UPDATE snapshots SET applied = 1 WHERE id = ?
    `);

    stmt.run(snapshotId);
  }

  /**
   * Mark snapshot as rolled back
   */
  async markSnapshotRolledBack(snapshotId: string): Promise<void> {
    const stmt = this._db.prepare(`
      UPDATE snapshots SET rolled_back = 1 WHERE id = ?
    `);

    stmt.run(snapshotId);
  }

  /**
   * Delete snapshot
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    const stmt = this._db.prepare(`
      DELETE FROM snapshots WHERE id = ?
    `);

    stmt.run(snapshotId);
  }

  /**
   * Delete multiple snapshots
   */
  async deleteSnapshots(snapshotIds: string[]): Promise<number> {
    if (snapshotIds.length === 0) {
      return 0;
    }

    const placeholders = snapshotIds.map(() => '?').join(',');
    const stmt = this._db.prepare(`
      DELETE FROM snapshots WHERE id IN (${placeholders})
    `);

    const result = stmt.run(...snapshotIds);

    return result.changes;
  }

  /**
   * Clean up old snapshots
   */
  async cleanup(options: SnapshotCleanupOptions): Promise<SnapshotCleanupResult> {
    const start = Date.now();
    const {
      projectRoot,
      maxSnapshots = 10,
      maxAge = 7 * 24 * 60 * 60 * 1000, // 7 days
      onlyRolledBack = false,
    } = options;

    try {
      // Get all snapshots for project
      let query = `
        SELECT * FROM snapshots
        WHERE project_root = ?
      `;

      if (onlyRolledBack) {
        query += ` AND rolled_back = 1`;
      }

      query += ` ORDER BY timestamp DESC`;

      const stmt = this._db.prepare(query);
      const allSnapshots = (stmt.all(projectRoot) as SnapshotRow[]).map((row) =>
        this._rowToSnapshot(row),
      );

      const now = Date.now();
      const snapshotsToDelete: Snapshot[] = [];

      // Delete snapshots older than maxAge
      for (const snapshot of allSnapshots) {
        if (now - snapshot.timestamp > maxAge) {
          snapshotsToDelete.push(snapshot);
        }
      }

      // Delete excess snapshots (keep only maxSnapshots)
      const recentSnapshots = allSnapshots.filter(
        (s) => !snapshotsToDelete.includes(s),
      );

      if (recentSnapshots.length > maxSnapshots) {
        const excess = recentSnapshots.slice(maxSnapshots);
        snapshotsToDelete.push(...excess);
      }

      // Delete snapshots
      const snapshotIds = snapshotsToDelete.map((s) => s.id);
      const deletedCount = await this.deleteSnapshots(snapshotIds);

      return {
        success: true,
        snapshotsDeleted: deletedCount,
        deletedSnapshots: snapshotsToDelete,
        duration: Date.now() - start,
      };

    } catch (error: unknown) {
      return {
        success: false,
        snapshotsDeleted: 0,
        deletedSnapshots: [],
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Convert database row to Snapshot object
   */
  private _rowToSnapshot(row: SnapshotRow): Snapshot {
    return {
      id: row.id,
      task: row.task,
      mode: row.mode,
      strategy: row.strategy as SnapshotStrategy,
      stashRef: row.stash_ref || undefined,
      branchName: row.branch_name || undefined,
      commitHash: row.commit_hash || undefined,
      filesModified: JSON.parse(row.files_modified),
      filesCreated: JSON.parse(row.files_created),
      timestamp: row.timestamp,
      projectRoot: row.project_root,
      applied: row.applied === 1,
      rolledBack: row.rolled_back === 1,
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this._db.close();
  }
}
