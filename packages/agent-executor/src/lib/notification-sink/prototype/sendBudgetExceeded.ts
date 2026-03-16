import type { BudgetExceededEvent } from '../../dag-events/dag-events.js';
import {
  buildSlackBudget,
  buildTeamsBudget,
} from '../notification-sink-helpers.js';
import type { INotificationSink } from '../notification-sink.js';

export async function sendBudgetExceeded(
  this:  INotificationSink,
  event: BudgetExceededEvent,
): Promise<void> {
  await this._post(
    this._opts.slack ? buildSlackBudget(event, this._opts) : null,
    this._opts.teams ? buildTeamsBudget(event, this._opts) : null,
  );
}
