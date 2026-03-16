import * as http from 'http';
import { IGitHubWebhookTrigger } from '../webhook-trigger.js';

export function start(this: IGitHubWebhookTrigger): Promise<void> {
  return new Promise((resolve, reject) => {
    this._server = http.createServer((req, res) => {
      this.handleRequest(req, res).catch((err) => {
        this._options.onError(err instanceof Error ? err : new Error(String(err)));
        if (!res.headersSent) {
          res.writeHead(500);
          res.end('Internal Server Error');
        }
      });
    });

    this._server.once('error', reject);
    this._server.listen(this._options.port, this._options.host, () => {
      console.log(`[webhook] Listening on http://${this._options.host}:${this._options.port}/webhook`);
      resolve();
    });
  });
}
