import type Database from 'better-sqlite3';

export interface VectorItem {
  id:        string;
  store:     string;
  content:   string | null;
  embedding: Buffer;
  metadata:  string;        // JSON-encoded
  createdAt: string;        // ISO-8601
}

export interface ISqliteVectorRepository {
  _db: Database.Database;
  createSchema(): void;
  insert(item: VectorItem): void;
  fetchAll(namespace: string): VectorItem[];
  count(namespace: string): number;
  trimOldest(namespace: string, excess: number): void;
  delete(id: string, namespace: string): void;
  clear(namespace: string): void;
  close(): void;
}
