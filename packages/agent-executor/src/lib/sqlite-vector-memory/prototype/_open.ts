import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import * as fs from 'fs';
import * as path from 'path';
import type { ISqliteVectorMemory } from '../sqlite-vector-memory.js';
import { SqliteVectorRepository } from '../sqlite-vector-repository.js';

// Module-level singleton — WASM loads only once across all instances.
let _sqlite3Cache: Promise<any> | null = null;
function getSqlite3(): Promise<any> {
  if (!_sqlite3Cache) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _sqlite3Cache = (sqlite3InitModule as any)();
  }
  return _sqlite3Cache!;
}

export async function _open(this: ISqliteVectorMemory): Promise<void> {
  try {
    const sqlite3 = await getSqlite3();
    const dir = path.dirname(this._dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const db = new sqlite3.oo1.DB(this._dbPath, 'cw');
    this._db = db;
    this._repo = new SqliteVectorRepository(db);
    this._repo.createSchema();
  } catch {
    this._db   = null;
    this._repo = null;
  }
}
