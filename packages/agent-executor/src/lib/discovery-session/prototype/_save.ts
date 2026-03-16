import * as fs from 'fs';
import * as path from 'path';
import type { DiscoveryResult } from '../../plan-types.js';
import { IDiscoverySession } from '../discovery-session.js';

export function _save(this: IDiscoverySession, result: DiscoveryResult): void {
  fs.mkdirSync(this._stateDir, { recursive: true });
  const file = path.join(this._stateDir, 'discovery.json');
  fs.writeFileSync(file, JSON.stringify(result, null, 2));
}
