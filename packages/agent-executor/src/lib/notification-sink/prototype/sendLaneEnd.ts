import type { LaneEndEvent } from '../../dag-events/dag-events.js';
import {
  buildSlackLaneEnd,
  buildTeamsLaneEnd,
} from '../notification-sink-helpers.js';
import type { INotificationSink } from '../notification-sink.js';

export async function sendLaneEnd(
  this: INotificationSink,
  event: LaneEndEvent,
): Promise<void> {
  const { failuresOnly = false } = this._opts;
  if (failuresOnly && event.status === 'success') return;
  await this._post(
    this._opts.slack ? buildSlackLaneEnd(event, this._opts) : null,
    this._opts.teams ? buildTeamsLaneEnd(event, this._opts) : null,
  );
}
