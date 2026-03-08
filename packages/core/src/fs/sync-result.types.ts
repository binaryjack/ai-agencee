export interface SyncResult {
  path: string;
  status: 'updated' | 'ok' | 'diverged';
}
