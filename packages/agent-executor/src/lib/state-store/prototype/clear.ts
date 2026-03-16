import * as fsp from 'fs/promises';
import type { IStateStore } from '../state-store.js';

type AnyStore = IStateStore<unknown>;

export async function clear(this: AnyStore): Promise<void> {
  try { await fsp.unlink(this._filePath); } catch { /* already gone */ }
}
