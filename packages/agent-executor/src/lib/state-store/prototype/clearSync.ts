import * as fs from 'fs';
import type { IStateStore } from '../state-store.js';

type AnyStore = IStateStore<unknown>;

export function clearSync(this: AnyStore): void {
  if (this.existsSync()) fs.unlinkSync(this._filePath);
}
