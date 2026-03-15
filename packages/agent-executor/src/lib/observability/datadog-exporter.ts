/**
 * datadog-exporter.ts — Exports spans to Datadog via the v0.4 trace ingestion API.
 *
 * Format: https://docs.datadoghq.com/api/latest/tracing/#send-traces
 *
 * Usage:
 *   import { createDatadogExporter } from './observability/datadog-exporter.js';
 *   const exporter = createDatadogExporter({ apiKey: 'DD-API-KEY', service: 'ai-agencee' });
 *   const tracer = createDagTracer({ spanExporter: exporter });
 */

import type { SpanExporter, SpanInput } from '../otel.js';

export interface DatadogExporterOptions {
  /** Datadog API key (DD-API-KEY header). */
  apiKey: string;
  /** Service name tagged on every span. */
  service: string;
  /**
   * Override the agent endpoint.
   * Defaults to the public trace intake: https://trace.agent.datadoghq.com
   */
  endpoint?: string;
  /** Optional resource prefix prepended to the operation name. */
  resource?: string;
}

interface DdSpan {
  trace_id:  number;
  span_id:   number;
  parent_id: number;
  name:      string;
  resource:  string;
  service:   string;
  type:      string;
  start:     number; // nanoseconds
  duration:  number; // nanoseconds
  error:     number; // 0 | 1
  meta:      Record<string, string>;
  metrics:   Record<string, number>;
}

/** Converts a 16-char hex string to a 64-bit integer approximation (JS number). */
function hexToNum(hex: string): number {
  // Take the lower 13 hex digits to stay within safe integer range
  return Number.parseInt(hex.slice(-13), 16);
}

export function createDatadogExporter(opts: DatadogExporterOptions): SpanExporter {
  const endpoint = (opts.endpoint ?? 'https://trace.agent.datadoghq.com').replace(/\/$/, '');
  const url       = `${endpoint}/api/v0.4/traces`;

  return {
    async export(spans: SpanInput[]): Promise<void> {
      if (spans.length === 0) return;

      // Group spans into traces by traceId
      const traceMap = new Map<string, SpanInput[]>();
      for (const s of spans) {
        const bucket = traceMap.get(s.traceId) ?? [];
        bucket.push(s);
        traceMap.set(s.traceId, bucket);
      }

      const traces: DdSpan[][] = [];
      for (const [, traceSpans] of traceMap) {
        traces.push(traceSpans.map((s): DdSpan => ({
          trace_id:  hexToNum(s.traceId),
          span_id:   hexToNum(s.spanId),
          parent_id: s.parentSpanId ? hexToNum(s.parentSpanId) : 0,
          name:      s.operation,
          resource:  opts.resource ? `${opts.resource}.${s.operation}` : s.operation,
          service:   opts.service,
          type:      s.operation.startsWith('llm') ? 'llm' : 'custom',
          start:     s.startMs * 1_000_000,
          duration:  Math.max(0, s.endMs - s.startMs) * 1_000_000,
          error:     s.errorMsg ? 1 : 0,
          meta: {
            ...(s.laneId  ? { 'ai.lane.id':   s.laneId }  : {}),
            ...(s.model   ? { 'ai.llm.model': s.model  }  : {}),
            ...(s.errorMsg ? { 'error.message': s.errorMsg } : {}),
          },
          metrics: {
            ...(s.promptTokens     ? { 'ai.tokens.prompt':      s.promptTokens }     : {}),
            ...(s.completionTokens ? { 'ai.tokens.completion':  s.completionTokens } : {}),
            ...(s.costUsd          ? { 'ai.cost.usd':           s.costUsd }          : {}),
          },
        })));
      }

      await fetch(url, {
        method:  'PUT',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY':   opts.apiKey,
        },
        body: JSON.stringify(traces),
      });
    },
  };
}
