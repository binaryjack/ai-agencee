import * as fs from 'fs';
import * as path from 'path';
import type { ISqliteVectorMemory } from '../sqlite-vector-memory.js';
import { SqliteVectorRepository } from '../sqlite-vector-repository.js';

export function _open(this: ISqliteVectorMemory): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require('better-sqlite3');
    const dir = path.dirname(this._dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const db = new Database(this._dbPath);
    this._db = db;
    this._repo = new SqliteVectorRepository(db);
    this._repo.createSchema();
  } catch {
    this._db   = null;
    this._repo = null;
  }
}
