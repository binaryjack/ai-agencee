import * as fs from 'fs';
import * as path from 'path';
import type { PlanDefinition } from '../../plan-types.js';
import type { IPlanSynthesizer } from '../plan-synthesizer.js';

export function _save(this: IPlanSynthesizer, plan: PlanDefinition): void {
  fs.mkdirSync(this._stateDir, { recursive: true });
  fs.writeFileSync(path.join(this._stateDir, 'plan.json'), JSON.stringify(plan, null, 2));
}
