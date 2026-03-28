/**
 * @file learning-database.ts
 * @description SQLite database for correction learning
 * 
 * Schema:
 * - corrections table: Stores all corrections
 * 
 * Features:
 * - Fast lookups by correction ID, snapshot ID, file path
 * - Aggregated learning examples
 * - Statistics tracking
 */

import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getDefaultDatabasePath } from '../config/index.js';
import type { CorrectionRow } from '../database/types.js';
import type {
    Correction,
    CorrectionType,
    ILearningDatabase,
    LearningExample,
    LearningStats,
} from './learning.types.js';

/**
 * SQLite-based learning database
 */
export class LearningDatabase implements ILearningDatabase {
  private readonly _db: Database.Database;

  constructor(dbPath?: string) {
    const finalDbPath = dbPath || getDefaultDatabasePath('LEARNING');

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
      CREATE TABLE IF NOT EXISTS corrections (
        id TEXT PRIMARY KEY,
        snapshot_id TEXT NOT NULL,
        task TEXT NOT NULL,
        mode TEXT NOT NULL,
        file_path TEXT NOT NULL,
        original_content TEXT NOT NULL,
        corrected_content TEXT NOT NULL,
        diff TEXT NOT NULL,
        correction_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        project_root TEXT NOT NULL,
        language TEXT,
        confidence REAL NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_snapshot_id ON corrections(snapshot_id);
      CREATE INDEX IF NOT EXISTS idx_project_root ON corrections(project_root);
      CREATE INDEX IF NOT EXISTS idx_file_path ON corrections(file_path);
      CREATE INDEX IF NOT EXISTS idx_correction_type ON corrections(correction_type);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON corrections(timestamp);
    `);
  }

  /**
   * Save correction to database
   */
  async saveCorrection(correction: Correction): Promise<void> {
    const stmt = this._db.prepare(`
      INSERT INTO corrections (
        id, snapshot_id, task, mode, file_path,
        original_content, corrected_content, diff,
        correction_type, timestamp, project_root, language, confidence
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      correction.id,
      correction.snapshotId,
      correction.task,
      correction.mode,
      correction.filePath,
      correction.originalContent,
      correction.correctedContent,
      correction.diff,
      correction.correctionType,
      correction.timestamp,
      correction.projectRoot,
      correction.language || null,
      correction.confidence,
    );
  }

  /**
   * Get correction by ID
   */
  async getCorrection(correctionId: string): Promise<Correction | undefined> {
    const stmt = this._db.prepare(`
      SELECT * FROM corrections WHERE id = ?
    `);

    const row = stmt.get(correctionId) as CorrectionRow | undefined;

    if (!row) {
      return undefined;
    }

    return this._rowToCorrection(row);
  }

  /**
   * Get all corrections for a project
   */
  async getCorrections(projectRoot: string): Promise<Correction[]> {
    const stmt = this._db.prepare(`
      SELECT * FROM corrections
      WHERE project_root = ?
      ORDER BY timestamp DESC
    `);

    const rows = stmt.all(projectRoot) as CorrectionRow[];

    return rows.map((row) => this._rowToCorrection(row));
  }

  /**
   * Get corrections for a specific snapshot
   */
  async getSnapshotCorrections(snapshotId: string): Promise<Correction[]> {
    const stmt = this._db.prepare(`
      SELECT * FROM corrections
      WHERE snapshot_id = ?
      ORDER BY timestamp DESC
    `);

    const rows = stmt.all(snapshotId) as CorrectionRow[];

    return rows.map((row) => this._rowToCorrection(row));
  }

  /**
   * Get corrections by type
   */
  async getCorrectionsByType(
    projectRoot: string,
    type: CorrectionType,
  ): Promise<Correction[]> {
    const stmt = this._db.prepare(`
      SELECT * FROM corrections
      WHERE project_root = ? AND correction_type = ?
      ORDER BY timestamp DESC
    `);

    const rows = stmt.all(projectRoot, type) as CorrectionRow[];

    return rows.map((row) => this._rowToCorrection(row));
  }

  /**
   * Get corrections for a specific file
   */
  async getFileCorrections(
    projectRoot: string,
    filePath: string,
  ): Promise<Correction[]> {
    const stmt = this._db.prepare(`
      SELECT * FROM corrections
      WHERE project_root = ? AND file_path = ?
      ORDER BY timestamp DESC
    `);

    const rows = stmt.all(projectRoot, filePath) as CorrectionRow[];

    return rows.map((row) => this._rowToCorrection(row));
  }

  /**
   * Get learning examples for LLM prompts
   */
  async getLearningExamples(
    projectRoot: string,
    limit = 5,
  ): Promise<LearningExample[]> {
    // Group similar corrections and create examples
    const stmt = this._db.prepare(`
      SELECT
        task,
        original_content,
        corrected_content,
        correction_type,
        COUNT(*) as occurrences,
        AVG(confidence) as avg_confidence
      FROM corrections
      WHERE project_root = ?
      GROUP BY task, correction_type
      ORDER BY occurrences DESC, avg_confidence DESC
      LIMIT ?
    `);

    const rows = stmt.all(projectRoot, limit) as Array<{
      task: string;
      original_content: string;
      corrected_content: string;
      correction_type: string;
      occurrences: number;
      avg_confidence: number;
    }>;

    return rows.map((row) => ({
      task: row.task,
      incorrect: row.original_content.substring(0, 500), // First 500 chars
      correct: row.corrected_content.substring(0, 500),
      correctionType: row.correction_type as CorrectionType,
      occurrences: row.occurrences,
      confidence: row.avg_confidence,
    }));
  }

  /**
   * Get learning statistics
   */
  async getStats(projectRoot: string): Promise<LearningStats> {
    const corrections = await this.getCorrections(projectRoot);

    const totalCorrections = corrections.length;

    // Corrections by type
    const correctionsByType: Record<CorrectionType, number> = {
      'syntax-fix': 0,
      'import-fix': 0,
      'type-fix': 0,
      'logic-fix': 0,
      'style-fix': 0,
      'refactor': 0,
      'optimization': 0,
      'security-fix': 0,
      'other': 0,
    };

    for (const correction of corrections) {
      correctionsByType[correction.correctionType]++;
    }

    // Most common type
    let mostCommonType: CorrectionType | null = null;
    let maxCount = 0;

    for (const [type, count] of Object.entries(correctionsByType)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonType = type as CorrectionType;
      }
    }

    // Top corrected files
    const fileCounts: Record<string, number> = {};

    for (const correction of corrections) {
      fileCounts[correction.filePath] = (fileCounts[correction.filePath] || 0) + 1;
    }

    const topCorrectedFiles = Object.entries(fileCounts)
      .map(([filePath, correctionCount]) => ({ filePath, correctionCount }))
      .sort((a, b) => b.correctionCount - a.correctionCount)
      .slice(0, 10);

    // Accuracy improvement (simplified calculation)
    // Real implementation would track corrections over time
    const recentCorrections = corrections.slice(0, 10);
    const oldCorrections = corrections.slice(-10);

    const recentAvg = recentCorrections.length > 0
      ? recentCorrections.length / 10
      : 0;
    const oldAvg = oldCorrections.length > 0
      ? oldCorrections.length / 10
      : 0;

    const accuracyImprovement = oldAvg > 0
      ? 1 - (recentAvg / oldAvg)
      : 0;

    // Get unique snapshots
    const uniqueSnapshots = new Set(corrections.map(c => c.snapshotId));
    const avgCorrectionsPerExecution = totalCorrections / Math.max(uniqueSnapshots.size, 1);

    return {
      totalCorrections,
      correctionsByType,
      mostCommonType,
      accuracyImprovement: Math.max(0, Math.min(1, accuracyImprovement)),
      avgCorrectionsPerExecution,
      topCorrectedFiles,
    };
  }

  /**
   * Delete correction
   */
  async deleteCorrection(correctionId: string): Promise<void> {
    const stmt = this._db.prepare(`
      DELETE FROM corrections WHERE id = ?
    `);

    stmt.run(correctionId);
  }

  /**
   * Delete all corrections for a project
   */
  async deleteProjectCorrections(projectRoot: string): Promise<number> {
    const stmt = this._db.prepare(`
      DELETE FROM corrections WHERE project_root = ?
    `);

    const result = stmt.run(projectRoot);

    return result.changes;
  }

  /**
   * Convert database row to Correction object
   */
  private _rowToCorrection(row: CorrectionRow): Correction {
    return {
      id: row.id,
      snapshotId: row.snapshot_id,
      task: row.task,
      mode: row.mode,
      filePath: row.file_path,
      originalContent: row.original_content,
      correctedContent: row.corrected_content,
      diff: row.diff,
      correctionType: row.correction_type as CorrectionType,
      timestamp: row.timestamp,
      projectRoot: row.project_root,
      language: row.language || undefined,
      confidence: row.confidence,
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this._db.close();
  }
}
