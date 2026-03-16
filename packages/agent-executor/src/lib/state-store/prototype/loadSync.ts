import * as fs from 'fs';
import type { IStateStore } from '../state-store.js';

type AnyStore = IStateStore<unknown>;

export function loadSync(this: AnyStore): unknown | null {
  if (!fs.existsSync(this._filePath)) return null;
  return JSON.parse(fs.readFileSync(this._filePath, 'utf-8'));
}
