# Feature 29: Pause / Resume & Checkpoint Timeline (IP-01)

> **Status**: ✅ Production-ready  
> **Category**: Enterprise — IP Series  
> **ID**: IP-01  
> **Package**: `_private/cloud-api` + `_private/ai-agencee-cloud`

---

## Overview

Every DAG run can be **paused mid-execution** and **resumed from the exact point it stopped**. When a run is paused, the full supervisor state for every in-progress lane — message history, tool call outputs, accumulated cost, and checkpoint metadata — is serialized to a PostgreSQL table. On resume, completed lanes are skipped and in-progress lanes restore their last saved state.

---

## Key Components

| Component | Location | Role |
|-----------|----------|------|
| `run_checkpoints` table | `004_run_checkpoints.sql` | Stores serialized state per lane per phase |
| `PATCH /runs/:id/pause` | `cloud-api/src/routes/runs.ts` | Validates run is `running`, transitions to `paused`, flushes lane state |
| `PATCH /runs/:id/resume` | `cloud-api/src/routes/runs.ts` | Restores state, re-dispatches incomplete lanes |
| `CheckpointTimeline` | `ai-agencee-cloud/src/entities/run/ui/CheckpointTimeline.tsx` | Visual per-lane checkpoint progress in `RunDetailPage` |
| `RunStatusBadge` | `ai-agencee-cloud/src/entities/run/ui/RunStatusBadge.tsx` | Shows `paused` status with correct label and style |

---

## Checkpoint Table Schema

```sql
CREATE TABLE run_checkpoints (
  id            BIGSERIAL PRIMARY KEY,
  run_id        UUID        NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  lane_id       TEXT        NOT NULL,
  seq           INT         NOT NULL,  -- monotonic per run
  state_json    JSONB       NOT NULL,  -- messages[], tool_calls[], cost_usd
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, lane_id, seq)
);
```

---

## API

```
PATCH /runs/:id/pause
  → 200 { runId, pausedAt, checkpointCount }
  → 409 if run is not in state "running"

PATCH /runs/:id/resume
  → 200 { runId, resumedAt, resumedLanes[] }
  → 409 if run is not in state "paused"
```

---

## Redux State

The `run` slice manages optimistic state:

```ts
// Optimistic pause
dispatch(patchRunStatus({ id, status: 'paused' }))
// On API error → dispatch(patchRunStatus({ id, status: 'running' }))
```

---

## Demo

```bash
node scripts/demo.js agents/demos/20-pause-resume-workflow/pause-resume.dag.json
```

Four sequential lanes each confirm their state with a `checkpoint_note` field, demonstrating the checkpoint serialization contract. See [demo-scenarios.md](../demo-scenarios.md#20--long-running-checkpoint-workflow-pauseresume).
