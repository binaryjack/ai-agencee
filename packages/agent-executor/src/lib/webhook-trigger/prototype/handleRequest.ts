import * as crypto from 'crypto';
import * as http from 'http';
import {
  GitHubWebhookPayload,
  IGitHubWebhookTrigger,
  TriggerContext,
  readBody,
  verifySignature,
} from '../webhook-trigger.js';

export async function handleRequest(
  this: IGitHubWebhookTrigger,
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const body = await readBody(req);

  if (this._options.secret) {
    const sig = req.headers['x-hub-signature-256'] as string | undefined;
    if (!sig || !verifySignature(body, this._options.secret, sig)) {
      res.writeHead(401);
      res.end('Signature mismatch');
      return;
    }
  }

  const event      = (req.headers['x-github-event'] as string | undefined) ?? '';
  const deliveryId = (req.headers['x-github-delivery'] as string | undefined) ?? crypto.randomUUID();

  let payload: GitHubWebhookPayload;
  try {
    payload = JSON.parse(body.toString('utf-8')) as GitHubWebhookPayload;
  } catch {
    res.writeHead(400);
    res.end('Invalid JSON');
    return;
  }

  const matched = this.matchRoutes(event, payload);
  if (matched.length === 0) {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ignored', event }));
    return;
  }

  res.writeHead(202);
  res.end(JSON.stringify({ status: 'accepted', routes: matched.length, event, deliveryId }));

  for (const route of matched) {
    const ctx: TriggerContext = { event, dagFile: route.dagFile, payload, deliveryId };
    this._options.onTrigger(ctx).catch((err) => {
      this._options.onError(err instanceof Error ? err : new Error(String(err)), ctx);
    });
  }
}
