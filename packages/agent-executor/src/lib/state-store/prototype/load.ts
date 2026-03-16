import * as fsp from 'fs/promises';
import type { IStateStore } from '../state-store.js';

type AnyStore = IStateStore<unknown>;

export async function load(this: AnyStore): Promise<unknown | null> {
  try {
    const raw = await fsp.readFile(this._filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
