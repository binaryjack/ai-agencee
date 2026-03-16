import * as fsp from 'fs/promises';
import type { IStateStore } from '../state-store.js';

type AnyStore = IStateStore<unknown>;

export async function exists(this: AnyStore): Promise<boolean> {
  try {
    await fsp.access(this._filePath);
    return true;
  } catch {
    return false;
  }
}
