import type {
    BudgetExceededEvent,
    DagEndEvent,
    DagEventBus,
    LaneEndEvent,
} from '../dag-events/dag-events.js';
import type { NotificationSinkOptions } from './notification-sink.types.js';

import { _post, attach, detach, sendBudgetExceeded, sendDagEnd, sendLaneEnd } from './prototype/methods.js';

export interface INotificationSink {
  new(opts: NotificationSinkOptions): INotificationSink;
  // static
  fromEnv(extra?: Partial<NotificationSinkOptions>): INotificationSink | undefined;
  // state
  _opts:              NotificationSinkOptions;
  _onDagEnd:          (event: DagEndEvent) => void;
  _onLaneEnd:         (event: LaneEndEvent) => void;
  _onBudgetExceeded:  (event: BudgetExceededEvent) => void;
  // methods
  attach(bus: DagEventBus): void;
  detach(bus: DagEventBus): void;
  sendDagEnd(event: DagEndEvent): Promise<void>;
  sendLaneEnd(event: LaneEndEvent): Promise<void>;
  sendBudgetExceeded(event: BudgetExceededEvent): Promise<void>;
  _post(slackPayload: object | null, teamsPayload: object | null): Promise<void>;
}

export const NotificationSink = function(
  this: INotificationSink,
  opts: NotificationSinkOptions,
) {
  if (!opts.slack && !opts.teams) {
    throw new Error('NotificationSink: at least one of `slack` or `teams` must be configured');
  }
  this._opts = {
    failuresOnly:  opts.failuresOnly  ?? false,
    notifyLaneEnd: opts.notifyLaneEnd ?? false,
    notifyBudget:  opts.notifyBudget  ?? true,
    ...opts,
  };

  // Bound arrow-function handlers so EventEmitter remove works correctly
  this._onDagEnd = (event: DagEndEvent) => {
    this.sendDagEnd(event).catch(() => undefined);
  };
  this._onLaneEnd = (event: LaneEndEvent) => {
    this.sendLaneEnd(event).catch(() => undefined);
  };
  this._onBudgetExceeded = (event: BudgetExceededEvent) => {
    if (this._opts.notifyBudget !== false) {
      this.sendBudgetExceeded(event).catch(() => undefined);
    }
  };
} as unknown as INotificationSink;

// Attach prototype methods after NotificationSink is defined (avoids circular-import race)
Object.assign((NotificationSink as unknown as { prototype: object }).prototype, {
  attach,
  detach,
  sendDagEnd,
  sendLaneEnd,
  sendBudgetExceeded,
  _post,
});

(NotificationSink as unknown as Record<string, unknown>).fromEnv = function(
  extra?: Partial<NotificationSinkOptions>,
): INotificationSink | undefined {
  const slackUrl = process.env['SLACK_WEBHOOK_URL'];
  const teamsUrl = process.env['TEAMS_WEBHOOK_URL'];

  if (!slackUrl && !teamsUrl) return undefined;

  return new NotificationSink({
    ...(slackUrl ? { slack: { webhookUrl: slackUrl } } : {}),
    ...(teamsUrl ? { teams: { webhookUrl: teamsUrl } } : {}),
    ...extra,
  });
};
