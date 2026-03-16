import {
  GitHubWebhookPayload,
  IGitHubWebhookTrigger,
  WebhookRoute,
} from '../webhook-trigger.js';

export function matchRoutes(
  this: IGitHubWebhookTrigger,
  event: string,
  payload: GitHubWebhookPayload,
): WebhookRoute[] {
  return this._options.routes.filter((route) => {
    if (route.event !== '*' && route.event !== event) return false;
    if (route.ref && route.ref !== '*' && payload.ref !== route.ref) return false;
    if (route.action && route.action !== '*' && payload.action !== route.action) return false;
    return true;
  });
}
