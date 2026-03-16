import { IGitHubWebhookTrigger } from '../webhook-trigger.js';

export function isRunning(this: IGitHubWebhookTrigger): boolean {
  return this._server?.listening ?? false;
}
