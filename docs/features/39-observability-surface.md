# Feature 39: Observability Surface (IP-11)

> **Status**: ✅ Production-ready  
> **Category**: Monitoring — IP Series  
> **ID**: IP-11  
> **Package**: `_private/ai-agencee-cloud`

---

## Overview

A full observability stack built into the Cloud UI: a per-run span flamechart, token-efficiency heatmap, cost drill-down table, and one-click OTLP export to Datadog, Grafana Tempo, New Relic, and Honeycomb. All spans are stored in a `spans` PostgreSQL table with a full JSONB attributes column.

---

## Architecture

```
Run executes
    ↓
cloud-api emits spans via opentelemetry-sdk-trace-node
    ↓
spans table (PostgreSQL — 011_spans.sql)
    ↓
/api/v1/spans endpoint (GET, filtered)
    ↓
ObservabilityPage
    ├── SpanFlamechart       ← per-run timeline
    ├── TokenHeatmap         ← output/input ratio by model × week
    ├── CostDrilldownTable   ← linked from KPI cards
    └── OtlpExportPanel      ← export to external providers
```

---

## Components

### SpanFlamechart

Visualises every lane + LLM call for a selected run as horizontal bands on a shared timeline:

- X-axis: milliseconds since run start
- Rows: one per span name (lane supervisor, model call, checkpoint write)
- Colour: green = ok, amber = retrying, red = error, blue = paused
- Click a bar: opens a detail drawer with `attributes` JSON, token counts, cost, and error message if any

### Token Efficiency Heatmap

Grid of model × calendar-week cells coloured by **output tokens ÷ input tokens** ratio:

- High ratio (green) = model is producing substantial output per token spent
- Low ratio (red) = potential prompt verbosity or model inefficiency
- Click a cell: drills into spans for that model in that week

### CostDrilldownTable

Accessible from any KPI cost card (total spend, per-model, per-dag):

| Column | Description |
|--------|-------------|
| Run ID | Links to run detail page |
| DAG | DAG name |
| Model | Provider + model |
| Input tokens | Total for run |
| Output tokens | Total for run |
| Cost (USD) | Calculated at export time |
| Duration | Wall-clock ms |

Sortable and filterable. Export to CSV.

### OTLP Export Panel

Connect to any OpenTelemetry-compatible backend:

| Provider | Transport | Auth |
|----------|-----------|------|
| Datadog | OTLP/HTTP | `DD-API-KEY` header |
| Grafana Tempo | OTLP/gRPC | Basic auth |
| New Relic | OTLP/HTTP | `api-key` header |
| Honeycomb | OTLP/HTTP | `x-honeycomb-team` header |

Configuration is saved per-workspace in the `integrations` table (encrypted at rest).

---

## Database Schema

`spans` table (`011_spans.sql`):

```sql
CREATE TABLE spans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  span_id     TEXT NOT NULL,
  parent_id   TEXT,
  name        TEXT NOT NULL,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('ok','error','unset')),
  attributes  JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX spans_run_id_idx        ON spans (run_id);
CREATE INDEX spans_start_time_idx    ON spans (start_time DESC);
CREATE INDEX spans_attributes_gin_idx ON spans USING gin (attributes);
```

---

## API

### `GET /api/v1/spans`

| Query param | Type | Description |
|-------------|------|-------------|
| `run_id` | UUID | Filter to single run |
| `dag_name` | string | Filter by DAG |
| `from` | ISO date | Start of date range |
| `to` | ISO date | End of date range |
| `severity` | `ok\|error` | Filter by status |

---

## Spans Page Filters

The Observability page filter bar supports:

- **Date range** picker (defaults to last 7 days)
- **DAG name** multi-select
- **Severity** toggle (All / Errors only)
- **Model** multi-select (populated from distinct `attributes->>'model'` values)

---

## Demo

→ See [Demo 21 — Observability Surface](../demo-scenarios.md#demo-21--observability-surface-ip-11)
