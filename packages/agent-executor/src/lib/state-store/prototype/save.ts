import * as fsp from 'fs/promises';
import * as path from 'path';
import type { IStateStore } from '../state-store.js';

type AnyStore = IStateStore<unknown>;

export async function save(this: AnyStore, data: unknown): Promise<void> {
  await fsp.mkdir(path.dirname(this._filePath), { recursive: true });
  await fsp.writeFile(this._filePath, JSON.stringify(data, null, 2), 'utf-8');
}
