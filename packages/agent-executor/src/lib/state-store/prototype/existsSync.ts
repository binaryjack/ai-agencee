import * as fs from 'fs';
import type { IStateStore } from '../state-store.js';

type AnyStore = IStateStore<unknown>;

export function existsSync(this: AnyStore): boolean {
  return fs.existsSync(this._filePath);
}
