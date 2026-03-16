import type { DagEventBus } from '../../dag-events/index.js';
import type { IIssueSync } from '../issue-sync.js';

export function attach(this: IIssueSync, bus: DagEventBus): void {
  bus.on('dag:end', this._onDagEnd);
}
