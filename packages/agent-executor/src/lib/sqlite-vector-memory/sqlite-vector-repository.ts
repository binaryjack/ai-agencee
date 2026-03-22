import type { ISqliteVectorRepository, VectorItem } from './sqlite-vector-repository.types.js';

export const SqliteVectorRepository = function(
  this: ISqliteVectorRepository,
  db: any,
) {
  this._db = db;
} as unknown as new (db: any) => ISqliteVectorRepository;

Object.assign((SqliteVectorRepository as Function).prototype, {

  createSchema(this: ISqliteVectorRepository): void {
    this._db.exec('PRAGMA journal_mode = WAL');
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
    this._db.exec({
      sql: `INSERT OR REPLACE INTO vectors (store, id, content, embedding, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      bind: [item.store, item.id, item.content, item.embedding, item.metadata, item.createdAt],
    });
  },

  fetchAll(this: ISqliteVectorRepository, namespace: string): VectorItem[] {
    const rows = this._db.selectObjects(
      'SELECT store, id, content, embedding, metadata, created_at FROM vectors WHERE store = ?',
      [namespace]
    ) as Array<{ store: string; id: string; content: string | null; embedding: Uint8Array; metadata: string; created_at: string }>;
    return rows.map((r) => ({
      id:        r.id,
      store:     r.store,
      content:   r.content,
      embedding: Buffer.from(r.embedding),
      metadata:  r.metadata,
      createdAt: r.created_at,
    }));
  },

  count(this: ISqliteVectorRepository, namespace: string): number {
    const row = this._db.selectObject(
      'SELECT COUNT(*) as n FROM vectors WHERE store = ?',
      [namespace]
    ) as { n: number };
    return row.n;
  },

  trimOldest(this: ISqliteVectorRepository, namespace: string, excess: number): void {
    this._db.exec({
      sql: `DELETE FROM vectors WHERE store = ? AND id IN (
              SELECT id FROM vectors WHERE store = ? ORDER BY created_at ASC LIMIT ?
            )`,
      bind: [namespace, namespace, excess],
    });
  },

  delete(this: ISqliteVectorRepository, id: string, namespace: string): void {
    this._db.exec({ sql: 'DELETE FROM vectors WHERE store = ? AND id = ?', bind: [namespace, id] });
  },

  clear(this: ISqliteVectorRepository, namespace: string): void {
    this._db.exec({ sql: 'DELETE FROM vectors WHERE store = ?', bind: [namespace] });
  },

  close(this: ISqliteVectorRepository): void {
    this._db.close();
  },

});
