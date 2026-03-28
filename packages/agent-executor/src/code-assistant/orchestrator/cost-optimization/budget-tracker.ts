/**
 * Budget tracker using SQLite
 * 
 * Tracks LLM usage and costs, enforces budget limits.
 */

import Database from 'better-sqlite3';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getDefaultDatabasePath } from '../config/index.js';
import type { UsageRow } from '../database/types.js';
import type { BudgetConfig, BudgetStatus, IBudgetTracker, UsageEntry } from './cost-optimization.types.js';

export class BudgetTrackerDatabase implements IBudgetTracker {
  private db: Database.Database | null = null;
  private readonly dbPath: string;
  private readonly config: BudgetConfig;
  
  constructor(dbPath?: string, config: BudgetConfig = {}) {
    this.dbPath = dbPath || getDefaultDatabasePath('BUDGET');
    this.config = {
      dailyBudget: config.dailyBudget || 10,  // $10/day default
      monthlyBudget: config.monthlyBudget || 200,  // $200/month default
      alertThresholds: config.alertThresholds || [0.8, 0.95],
      blockOnExceeded: config.blockOnExceeded || false,
    };
  }
  
  async initialize(): Promise<void> {
    const dir = path.dirname(this.dbPath);
    await fs.mkdir(dir, { recursive: true });
    
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS usage (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        project_root TEXT NOT NULL,
        task TEXT NOT NULL,
        model TEXT NOT NULL,
        input_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        cost REAL NOT NULL,
        cached INTEGER DEFAULT 0
      );
      
      CREATE INDEX IF NOT EXISTS idx_timestamp ON usage(timestamp);
      CREATE INDEX IF NOT EXISTS idx_project_root ON usage(project_root);
    `);
  }
  
  async recordUsage(entry: UsageEntry): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    this.db.prepare(`
      INSERT INTO usage (id, timestamp, project_root, task, model, input_tokens, output_tokens, cost, cached)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id,
      entry.timestamp,
      entry.projectRoot,
      entry.task,
      entry.model,
      entry.inputTokens,
      entry.outputTokens,
      entry.cost,
      entry.cached ? 1 : 0
    );
  }
  
  async getStatus(projectRoot?: string): Promise<BudgetStatus> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    const now = Date.now();
    const dayStart = now - (now % (24 * 60 * 60 * 1000));
    const monthStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
    
    const dailyQuery = projectRoot
      ? `SELECT SUM(cost) as total FROM usage WHERE project_root = ? AND timestamp >= ?`
      : `SELECT SUM(cost) as total FROM usage WHERE timestamp >= ?`;
    
    const monthlyQuery = projectRoot
      ? `SELECT SUM(cost) as total FROM usage WHERE project_root = ? AND timestamp >= ?`
      : `SELECT SUM(cost) as total FROM usage WHERE timestamp >= ?`;
    
    const dailyParams = projectRoot ? [projectRoot, dayStart] : [dayStart];
    const monthlyParams = projectRoot ? [projectRoot, monthStart] : [monthStart];
    
    const dailySpent = (this.db.prepare(dailyQuery).get(...dailyParams) as { total: number | null } | undefined)?.total ?? 0;
    const monthlySpent = (this.db.prepare(monthlyQuery).get(...monthlyParams) as { total: number | null } | undefined)?.total ?? 0;
    
    const dailyBudget = this.config.dailyBudget || 10;
    const monthlyBudget = this.config.monthlyBudget || 200;
    
    const alerts: BudgetStatus['alerts'] = [];
    
    // Check daily alerts
    for (const threshold of this.config.alertThresholds || [0.8, 0.95]) {
      if (dailySpent >= dailyBudget * threshold) {
        alerts.push({
          type: threshold >= 0.95 ? 'critical' : 'warning',
          message: `Daily budget ${Math.round(threshold * 100)}% used ($${dailySpent.toFixed(2)} / $${dailyBudget})`,
          threshold,
        });
      }
    }
    
    // Check monthly alerts
    for (const threshold of this.config.alertThresholds || [0.8, 0.95]) {
      if (monthlySpent >= monthlyBudget * threshold) {
        alerts.push({
          type: threshold >= 0.95 ? 'critical' : 'warning',
          message: `Monthly budget ${Math.round(threshold * 100)}% used ($${monthlySpent.toFixed(2)} / $${monthlyBudget})`,
          threshold,
        });
      }
    }
    
    // Check exceeded
    const blocked = !!(this.config.blockOnExceeded && (dailySpent >= dailyBudget || monthlySpent >= monthlyBudget));
    
    if (dailySpent >= dailyBudget) {
      alerts.push({
        type: 'exceeded',
        message: `Daily budget exceeded! ($${dailySpent.toFixed(2)} / $${dailyBudget})`,
        threshold: 1,
      });
    }
    
    if (monthlySpent >= monthlyBudget) {
      alerts.push({
        type: 'exceeded',
        message: `Monthly budget exceeded! ($${monthlySpent.toFixed(2)} / $${monthlyBudget})`,
        threshold: 1,
      });
    }
    
    return {
      dailySpent,
      dailyBudget,
      dailyRemaining: Math.max(0, dailyBudget - dailySpent),
      monthlySpent,
      monthlyBudget,
      monthlyRemaining: Math.max(0, monthlyBudget - monthlySpent),
      alerts,
      blocked,
    };
  }
  
  async getUsage(projectRoot?: string, days: number = 30): Promise<UsageEntry[]> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    const since = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const query = projectRoot
      ? `SELECT * FROM usage WHERE project_root = ? AND timestamp >= ? ORDER BY timestamp DESC`
      : `SELECT * FROM usage WHERE timestamp >= ? ORDER BY timestamp DESC`;
    
    const params = projectRoot ? [projectRoot, since] : [since];
    const rows = this.db.prepare(query).all(...params) as UsageRow[];
    
    return rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      projectRoot: row.project_root,
      task: row.task,
      model: row.model,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      cost: row.cost,
      cached: row.cached === 1,
    }));
  }
  
  async clear(projectRoot?: string): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    if (projectRoot) {
      this.db.prepare(`DELETE FROM usage WHERE project_root = ?`).run(projectRoot);
    } else {
      this.db.exec(`DELETE FROM usage`);
    }
  }
  
  close(): void {
    if (this.db) this.db.close();
  }
}

export function createBudgetTracker(dbPath?: string, config?: BudgetConfig): IBudgetTracker {
  return new BudgetTrackerDatabase(dbPath, config);
}
