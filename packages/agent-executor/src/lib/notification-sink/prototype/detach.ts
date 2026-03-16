import type { DagEventBus } from '../../dag-events/dag-events.js';
import type { INotificationSink } from '../notification-sink.js';

export function detach(this: INotificationSink, bus: DagEventBus): void {
  bus.removeListener('dag:end',         this._onDagEnd);
  bus.removeListener('budget:exceeded', this._onBudgetExceeded);
  bus.removeListener('lane:end',        this._onLaneEnd);
}
