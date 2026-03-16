import { postWebhook } from '../notification-sink-helpers.js';
import type { INotificationSink } from '../notification-sink.js';

export async function _post(
  this:         INotificationSink,
  slackPayload: object | null,
  teamsPayload: object | null,
): Promise<void> {
  const ops: Promise<void>[] = [];
  if (slackPayload && this._opts.slack?.webhookUrl) {
    ops.push(postWebhook(this._opts.slack.webhookUrl, slackPayload));
  }
  if (teamsPayload && this._opts.teams?.webhookUrl) {
    ops.push(postWebhook(this._opts.teams.webhookUrl, teamsPayload));
  }

  const results  = await Promise.allSettled(ops);
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failures.length > 0) {
    throw new Error(failures.map((f) => (f.reason as Error).message).join('; '));
  }
}
