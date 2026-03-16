import type Database from 'better-sqlite3';
import type { ISqliteVectorRepository, VectorItem } from './sqlite-vector-repository.types.js';

export const SqliteVectorRepository = function(
  this: ISqliteVectorRepository,
  db: Database.Database,
) {
  this._db = db;
} as unknown as new (db: Database.Database) => ISqliteVectorRepository;

Object.assign((SqliteVectorRepository as Function).prototype, {

  createSchema(this: ISqliteVectorRepository): void {
    this._db.pragma('journal_mode = WAL');
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS vectors (
        store      TEXT    NOT NULL,
        id         TEXT    NOT NULL,
        content    TEXT,
        embedding  BLOB    NOT NULL,
        metadata   TEXT    NOT NULL DEFAULT '{}',
        created_at TEXT    NOT NULL,
        PRIMARY KEY (store, id)
      );
      CREATE INDEX IF NOT EXISTS idx_vectors_store ON vectors(store);
    `);
  },

  insert(this: ISqliteVectorRepository, item: VectorItem): void {
    this._db
      .prepare(
        `INSERT OR REPLACE INTO vectors (store, id, content, embedding, metadata, created_at)
         VALUES (@store, @id, @content, @embedding, @metadata, @created_at)`,
      )
      .run({
        store:      item.store,
        id:         item.id,
        content:    item.content,
        embedding:  item.embedding,
        metadata:   item.metadata,
        created_at: item.createdAt,
      });
  },

  fetchAll(this: ISqliteVectorRepository, namespace: string): VectorItem[] {
    const rows = (this._db
      .prepare('SELECT store, id, content, embedding, metadata, created_at FROM vectors WHERE store = ?')
      .all(namespace)) as Array<{
      store: string; id: string; content: string | null;
      embedding: Buffer; metadata: string; created_at: string;
    }>;
    return rows.map((r) => ({
      id:        r.id,
      store:     r.store,
      content:   r.content,
      embedding: r.embedding,
      metadata:  r.metadata,
      createdAt: r.created_at,
    }));
  },

  count(this: ISqliteVectorRepository, namespace: string): number {
    const row = this._db
      .prepare('SELECT COUNT(*) as n FROM vectors WHERE store = ?')
      .get(namespace) as { n: number };
    return row.n;
  },

  trimOldest(this: ISqliteVectorRepository, namespace: string, excess: number): void {
    this._db
      .prepare(
        `DELETE FROM vectors WHERE store = ? AND id IN (
           SELECT id FROM vectors WHERE store = ? ORDER BY created_at ASC LIMIT ?
         )`,
      )
      .run(namespace, namespace, excess);
  },

  delete(this: ISqliteVectorRepository, id: string, namespace: string): void {
    this._db.prepare('DELETE FROM vectors WHERE store = ? AND id = ?').run(namespace, id);
  },

  clear(this: ISqliteVectorRepository, namespace: string): void {
    this._db.prepare('DELETE FROM vectors WHERE store = ?').run(namespace);
  },

  close(this: ISqliteVectorRepository): void {
    this._db.close();
  },

});
