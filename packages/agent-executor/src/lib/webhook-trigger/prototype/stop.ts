import { IGitHubWebhookTrigger } from '../webhook-trigger.js';

export function stop(this: IGitHubWebhookTrigger): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!this._server) return resolve();
    this._server.close((err) => (err ? reject(err) : resolve()));
  });
}
