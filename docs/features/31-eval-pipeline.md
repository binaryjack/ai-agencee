# Feature 31: Eval Pipeline & Quality Flywheel (IP-03)

> **Status**: ✅ Production-ready  
> **Category**: Enterprise — IP Series  
> **ID**: IP-03  
> **Package**: `_private/cloud-api` + `_private/ai-agencee-cloud` + `packages/agent-executor`

---

## Overview

The eval pipeline continuously measures the quality of every DAG lane's output. LLM-as-judge scoring assigns dimension scores per lane run. A golden output store lets you hand-curate examples for regression testing. A CI eval gate blocks merges when any lane's average score drops below a configurable threshold. Accepted completions can be exported as a JSONL fine-tuning dataset.

---

## Architecture

```
Lane run completes
      │
      ▼
LLM-as-judge scores output
  clarity (1–5) · completeness (1–5) · accuracy (1–5)
      │
      ├── writes to lane_evals table
      │
      ├── compares against golden output store
      │       │
      │       └── semantic similarity check
      │
      └── CI gate evaluates average score
              ├── PASS  if score ≥ threshold
              ├── WARN  if score ≥ warn_threshold
              └── FAIL  → blocks merge / alerts
```

---

## Key Components

| Component | Location | Role |
|-----------|----------|------|
| `lane_evals` table | `006_evals.sql` | Stores scores per lane run (clarity, completeness, accuracy, overall) |
| `eval-harness.ts` | `packages/agent-executor/src/lib/eval-harness.ts` | `runEval()` — concurrent case execution, 0–1 scoring, `EvalReport` JSON |
| Lane scorecard | `ai-agencee-cloud/src/entities/run/ui/LaneScorecardPanel.tsx` | Score breakdown in `RunDetailPage` |
| Golden output store | `cloud-api/src/lib/golden-store.ts` | Version-controlled curated examples per lane + task type |
| CI eval gate | `cloud-api/src/lib/ci-gate.ts` | Accept/reject based on score threshold per pipeline run |
| Fine-tuning export | `cloud-api/src/routes/eval-export.ts` | `GET /eval/export?format=jsonl` — prompt + completion pairs |

---

## Scoring Dimensions

| Dimension | Description | Scale |
|-----------|-------------|-------|
| `clarity` | Is the output clear and jargon-free for the intended audience? | 1–5 |
| `completeness` | Does the output cover all required points or fields? | 1–5 |
| `accuracy` | Are the claims and data technically correct? | 1–5 |
| `overall` | Mean of the three dimensions, rounded to 1 decimal | 1.0–5.0 |

---

## CI Eval Gate

Configure thresholds in your DAG or tenant settings:

```json
{
  "evalGate": {
    "passThreshold": 3.5,
    "warnThreshold": 3.0,
    "blockOnFail": true
  }
}
```

---

## Fine-Tuning Export

```bash
GET /eval/export?format=jsonl&lane=content-generate&from=2026-01-01
```

Returns JSONL where each line is:
```json
{ "prompt": "...", "completion": "...", "score": 4.3, "lane": "content-generate" }
```

---

## Demo

```bash
node scripts/demo.js agents/demos/19-eval-pipeline/eval-pipeline.dag.json
```

Four lanes: content generation → parallel eval judge + golden compare → CI gate. See [demo-scenarios.md](../demo-scenarios.md#19--eval-pipeline--quality-flywheel).
