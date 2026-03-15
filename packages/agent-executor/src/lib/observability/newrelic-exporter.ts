/**
 * newrelic-exporter.ts — Exports spans to New Relic via the Zipkin v2 trace API.
 *
 * Docs: https://docs.newrelic.com/docs/distributed-tracing/trace-api/introduction-trace-api/
 *
 * Usage:
 *   import { createNewRelicExporter } from './observability/newrelic-exporter.js';
 *   const exporter = createNewRelicExporter({ licenseKey: 'NR-INGEST-KEY' });
 *   const tracer = createDagTracer({ spanExporter: exporter });
 */

import type { SpanExporter, SpanInput } from '../otel.js';

export interface NewRelicExporterOptions {
  /** New Relic ingest license key (INGEST - LICENSE type). */
  licenseKey: string;
  /**
   * Override the ingest endpoint.
   * US default: https://trace-api.newrelic.com/trace/v1
   * EU:         https://trace-api.eu.newrelic.com/trace/v1
   */
  endpoint?: string;
  /** Service name added as a tag on every span (defaults to 'ai-agencee'). */
  serviceName?: string;
}

interface ZipkinSpan {
  traceId:        string;
  id:             string;
  parentId?:      string;
  name:           string;
  /** Microseconds since epoch. */
  timestamp:      number;
  /** Duration in microseconds. */
  duration:       number;
  tags:           Record<string, string>;
}

export function createNewRelicExporter(opts: NewRelicExporterOptions): SpanExporter {
  const url         = (opts.endpoint ?? 'https://trace-api.newrelic.com/trace/v1').replace(/\/$/, '');
  const serviceName = opts.serviceName ?? 'ai-agencee';

  return {
    async export(spans: SpanInput[]): Promise<void> {
      if (spans.length === 0) return;

      const zipkinSpans: ZipkinSpan[] = spans.map((s): ZipkinSpan => {
        const tags: Record<string, string> = {
          'service.name': serviceName,
          'ai.operation': s.operation,
        };
        if (s.laneId)            tags['ai.lane.id']           = s.laneId;
        if (s.model)             tags['ai.llm.model']          = s.model;
        if (s.promptTokens)      tags['ai.tokens.prompt']      = String(s.promptTokens);
        if (s.completionTokens)  tags['ai.tokens.completion']  = String(s.completionTokens);
        if (s.costUsd)           tags['ai.cost.usd']           = String(s.costUsd);
        if (s.errorMsg)          tags['error']                 = s.errorMsg;

        return {
          traceId:   s.traceId.padStart(32, '0'),
          id:        s.spanId.padStart(16, '0'),
          parentId:  s.parentSpanId ? s.parentSpanId.padStart(16, '0') : undefined,
          name:      s.operation,
          timestamp: s.startMs * 1_000, // µs
          duration:  Math.max(1, s.endMs - s.startMs) * 1_000, // µs
          tags,
        };
      });

      await fetch(url, {
        method:  'POST',
        headers: {
          'Content-Type':          'application/json',
          'Api-Key':               opts.licenseKey,
          'Data-Format':           'zipkin',
          'Data-Format-Version':   '2',
        },
        body: JSON.stringify(zipkinSpans),
      });
    },
  };
}
