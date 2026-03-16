import * as fs from 'fs';
import * as path from 'path';
import type { IStateStore } from '../state-store.js';

type AnyStore = IStateStore<unknown>;

export function saveSync(this: AnyStore, data: unknown): void {
  fs.mkdirSync(path.dirname(this._filePath), { recursive: true });
  fs.writeFileSync(this._filePath, JSON.stringify(data, null, 2), 'utf-8');
}
