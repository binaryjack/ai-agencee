import type { DagEventBus } from '../../dag-events/index.js';
import type { IIssueSync } from '../issue-sync.js';

export function detach(this: IIssueSync, bus: DagEventBus): void {
  bus.removeListener('dag:end', this._onDagEnd);
}
