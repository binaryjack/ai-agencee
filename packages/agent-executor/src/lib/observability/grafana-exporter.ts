/**
 * grafana-exporter.ts — Exports spans to Grafana Tempo via OTLP/HTTP JSON.
 *
 * Format: https://opentelemetry.io/docs/specs/otlp/#otlphttp
 *
 * Usage:
 *   import { createGrafanaTempoExporter } from './observability/grafana-exporter.js';
 *   const exporter = createGrafanaTempoExporter({
 *     endpoint: 'https://<stack-id>.grafana.net/otlp',
 *     headers:  { Authorization: 'Basic <base64>' },
 *   });
 *   const tracer = createDagTracer({ spanExporter: exporter });
 */

import type { SpanExporter, SpanInput } from '../otel.js';

export interface GrafanaTempoExporterOptions {
  /**
   * Root OTLP/HTTP endpoint (without /v1/traces).
   * e.g. https://<stack-id>.grafana.net/otlp
   */
  endpoint: string;
  /** Additional headers (e.g. Authorization: Basic ...). */
  headers?: Record<string, string>;
}

// Minimal OTLP/JSON types we need to serialise
interface OtlpAttribute { key: string; value: { stringValue?: string; intValue?: string; doubleValue?: number } }
interface OtlpSpan {
  traceId:           string; // 32-char hex
  spanId:            string; // 16-char hex
  parentSpanId?:     string;
  name:              string;
  kind:              number; // SpanKind.INTERNAL = 1
  startTimeUnixNano: string; // string because JSON can't hold uint64
  endTimeUnixNano:   string;
  attributes:        OtlpAttribute[];
  status:            { code: number; message?: string }; // 0=Unset, 1=Ok, 2=Error
}

function toOtlpAttr(key: string, val: string | number): OtlpAttribute {
  return typeof val === 'string'
    ? { key, value: { stringValue: val } }
    : { key, value: { doubleValue: val } };
}

function padTrace(id: string): string {
  // OTLP traceId must be 32 hex chars; spanId 16 hex chars
  return id.padStart(32, '0');
}

export function createGrafanaTempoExporter(opts: GrafanaTempoExporterOptions): SpanExporter {
  const url = `${opts.endpoint.replace(/\/$/, '')}/v1/traces`;

  return {
    async export(spans: SpanInput[]): Promise<void> {
      if (spans.length === 0) return;

      const otlpSpans: OtlpSpan[] = spans.map((s): OtlpSpan => {
        const attrs: OtlpAttribute[] = [];
        if (s.laneId)           attrs.push(toOtlpAttr('ai.lane.id',           s.laneId));
        if (s.model)            attrs.push(toOtlpAttr('ai.llm.model',          s.model));
        if (s.promptTokens)     attrs.push(toOtlpAttr('ai.tokens.prompt',      s.promptTokens));
        if (s.completionTokens) attrs.push(toOtlpAttr('ai.tokens.completion',  s.completionTokens));
        if (s.costUsd)          attrs.push(toOtlpAttr('ai.cost.usd',           s.costUsd));

        return {
          traceId:           padTrace(s.traceId),
          spanId:            s.spanId.padStart(16, '0'),
          parentSpanId:      s.parentSpanId ? s.parentSpanId.padStart(16, '0') : undefined,
          name:              s.operation,
          kind:              1, // INTERNAL
          startTimeUnixNano: String(s.startMs * 1_000_000),
          endTimeUnixNano:   String(s.endMs   * 1_000_000),
          attributes:        attrs,
          status:            s.errorMsg
            ? { code: 2, message: s.errorMsg }
            : { code: 1 },
        };
      });

      const body = {
        resourceSpans: [{
          resource:   { attributes: [] },
          scopeSpans: [{
            scope: { name: 'ai-agencee-engine', version: '1.0.0' },
            spans: otlpSpans,
          }],
        }],
      };

      await fetch(url, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...opts.headers,
        },
        body: JSON.stringify(body),
      });
    },
  };
}
