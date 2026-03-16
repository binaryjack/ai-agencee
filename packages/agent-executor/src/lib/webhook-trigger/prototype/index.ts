import { GitHubWebhookTrigger } from '../webhook-trigger.js';
import { handleRequest } from './handleRequest.js';
import { isRunning }     from './isRunning.js';
import { matchRoutes }   from './matchRoutes.js';
import { start }         from './start.js';
import { stop }          from './stop.js';

Object.assign((GitHubWebhookTrigger as Function).prototype, {
  start, stop, isRunning, handleRequest, matchRoutes,
});
