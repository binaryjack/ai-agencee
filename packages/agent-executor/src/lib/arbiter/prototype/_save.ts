import * as fs from 'fs';
import * as path from 'path';
import type { IArbiter } from '../arbiter.js';

export function _save(this: IArbiter): void {
  fs.mkdirSync(this._stateDir, { recursive: true });
  fs.writeFileSync(
    path.join(this._stateDir, 'decisions.json'),
    JSON.stringify(this._decisions, null, 2),
  );
}
