import { getGlobalEventBus } from '@ai-agencee/engine'
import * as http from 'http'
import { createOidcMiddleware, type MinimalResponse } from '../oidc/index.js'
import { handleTenantApi } from '../tenant/index.js'
import { DAG_EVENT_TYPES } from './dag-event-types.js'
import { sendSseEvent } from './send-sse-event.js'
import { _serverInstance, setServerInstance } from './server-state.js'
import { type SseClient } from './sse-client.types.js'

export function startSseServer(port = 3747): http.Server {
  if (_serverInstance) return _serverInstance;

  const clients: Set<SseClient> = new Set();
  const bus = getGlobalEventBus();

  for (const eventType of DAG_EVENT_TYPES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bus.on(eventType as any, (payload: unknown) => {
      const data = JSON.stringify(payload);
      const payloadRunId = (payload as Record<string, unknown>)['runId'] as string | undefined;

      for (const client of clients) {
        if (client.runId && payloadRunId && client.runId !== payloadRunId) continue;
        sendSseEvent(client.res, eventType, data);
      }
    });
  }

  const oidcMiddleware = createOidcMiddleware();

  function toMinimalRes(res: http.ServerResponse): MinimalResponse {
    let _statusCode = 200;
    return {
      status(code: number) { _statusCode = code; return this; },
      json(body: unknown) {
        if (!res.headersSent) {
          res.writeHead(_statusCode, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify(body));
      },
    } as MinimalResponse;
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);

    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, clients: clients.size }));
      return;
    }

    let authPassed = false;
    await oidcMiddleware(req, toMinimalRes(res), () => { authPassed = true; });
    if (!authPassed) return;

    const tenantApiHandled = await handleTenantApi(req, res);
    if (tenantApiHandled) return;

    if (url.pathname === '/events') {
      const runId = url.searchParams.get('runId') ?? undefined;

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no',
      });

      sendSseEvent(res, 'connected', JSON.stringify({ runId: runId ?? null }));

      const client: SseClient = { res, runId };
      clients.add(client);

      const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
      }, 30_000);

      req.on('close', () => {
        clients.delete(client);
        clearInterval(heartbeat);
      });

      return;
    }

    res.writeHead(404).end();
  });

  server.listen(port, '0.0.0.0', () => {
    process.stderr.write(`[ai-kit] SSE event stream listening on http://0.0.0.0:${port}/events\n`);
  });

  setServerInstance(server);
  return server;
}
