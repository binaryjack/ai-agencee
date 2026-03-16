import type { DagEndEvent } from '../../dag-events/dag-events.js';
import {
  buildSlackDagEnd,
  buildTeamsDagEnd,
} from '../notification-sink-helpers.js';
import type { INotificationSink } from '../notification-sink.js';

export async function sendDagEnd(
  this: INotificationSink,
  event: DagEndEvent,
): Promise<void> {
  const { failuresOnly = false } = this._opts;
  if (failuresOnly && event.status === 'success') return;
  await this._post(
    this._opts.slack ? buildSlackDagEnd(event, this._opts) : null,
    this._opts.teams ? buildTeamsDagEnd(event, this._opts) : null,
  );
}
