/**
 * http-span-exporter.ts — Buffers spans and POSTs them to the cloud-api
 * `/api/runs/:runId/spans` endpoint.
 *
 * Flushes automatically when:
 *   • The buffer reaches BATCH_SIZE spans, OR
 *   • FLUSH_INTERVAL_MS has elapsed since the last flush
 *
 * Usage:
 *   const exporter = createHttpSpanExporter(apiBase, token, runId);
 *   const tracer   = createDagTracer({ spanExporter: exporter });
 *   // ...run dag...
 *   await exporter.flush();   // optional: drain remaining spans on exit
 */

import type { SpanExporter, SpanInput } from './otel.js';

const BATCH_SIZE       = 20;
const FLUSH_INTERVAL   = 1_000; // ms

export interface HttpSpanExporter extends SpanExporter {
  /** Flush any buffered spans immediately. Returns once the request resolves. */
  flush(): Promise<void>;
  /** Tear down the flush timer (call when the run is fully complete). */
  dispose(): void;
}

export function createHttpSpanExporter(
  apiBase: string,
  token:   string,
  runId:   string,
): HttpSpanExporter {
  const buffer: SpanInput[] = [];
  let flushTimer: ReturnType<typeof setInterval> | null = null;
  let disposed = false;

  async function doFlush(): Promise<void> {
    if (buffer.length === 0) return;
    const batch = buffer.splice(0, buffer.length);
    const url   = `${apiBase}/api/runs/${encodeURIComponent(runId)}/spans`;
    try {
      const res = await fetch(url, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ spans: batch }),
      });
      if (!res.ok) {
        // Push spans back so they are retried on the next flush
        buffer.unshift(...batch);
      }
    } catch {
      // Network error — return spans to the buffer for retry
      buffer.unshift(...batch);
    }
  }

  // Start periodic flush timer
  flushTimer = setInterval((): void => {
    if (!disposed) void doFlush();
  }, FLUSH_INTERVAL);

  const exporter: HttpSpanExporter = {
    async export(spans: SpanInput[]): Promise<void> {
      buffer.push(...spans);
      if (buffer.length >= BATCH_SIZE) {
        await doFlush();
      }
    },

    async flush(): Promise<void> {
      await doFlush();
    },

    dispose(): void {
      disposed = true;
      if (flushTimer !== null) {
        clearInterval(flushTimer);
        flushTimer = null;
      }
    },
  };

  return exporter;
}
