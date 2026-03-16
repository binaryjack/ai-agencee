import type { DagEventBus } from '../../dag-events/dag-events.js';
import type { INotificationSink } from '../notification-sink.js';

export function attach(this: INotificationSink, bus: DagEventBus): void {
  bus.on('dag:end',         this._onDagEnd);
  bus.on('budget:exceeded', this._onBudgetExceeded);
  if (this._opts.notifyLaneEnd) {
    bus.on('lane:end', this._onLaneEnd);
  }
}
