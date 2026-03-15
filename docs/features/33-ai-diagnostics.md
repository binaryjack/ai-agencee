# Feature 33: AI Run Diagnostics (IP-05)

> **Status**: ✅ Production-ready  
> **Category**: Enterprise — IP Series  
> **ID**: IP-05  
> **Package**: `_private/ai-agencee-cloud` + `_private/cloud-api`

---

## Overview

When a run fails or produces unexpected results, the AI Run Diagnostics feature provides a one-click "Why did this run fail?" analysis. The engine reads the full audit log, lane eval scores, supervisor checkpoint state, and DAG lint violations, then streams a structured diagnosis back to the UI.

---

## DiagnosticCard

`DiagnosticCard` renders inside `RunDetailPage` when a run is in `failed` or `partial` state. It streams the diagnosis via SSE and renders:

```
Root Cause
  ↳ "The 'analyze' lane timed out after exhausting retryBudget=2.
     The root cause is an upstream Dockerfile not found at workspace root."

Affected Lanes
  ↳ analyze, synthesize (blocked by dependency)

Fix Suggestions
  1. Add a Dockerfile at the project root
  2. Increase retryBudget to 3 for the analyze lane
  3. Add a file-exists check before the llm-generate step
```

---

## Structured Output

```ts
type DiagnosisResult = {
  root_cause:        string
  confidence:        'high' | 'medium' | 'low'
  affected_lanes:    string[]
  fix_suggestions:   string[]
  lint_violations:   LintViolation[]
  run_cost_usd:      number
  recommended_model: string | null
}
```

---

## Run Comparison

Two runs on the same DAG can be diffed side-by-side:

- Lane status changes (APPROVE / RETRY / ESCALATE)
- Token counts and cost delta
- Checkpoint state differences
- Eval score changes per lane

Access via `RunDetailPage` → **Compare** → select the reference run.

---

## DAG Lint Panel

The linter runs `lintDag()` from `packages/agent-executor/src/lib/dag-linter.ts` and displays violations inline:

| Rule | Code | Description |
|------|------|-------------|
| Missing barrier timeout | LINT001 | `GlobalBarrier` without `timeoutMs` |
| Circular dependency | LINT002 | Lane A → B → A |
| Unreachable lane | LINT003 | Lane with no dependents and no downstream contract |
| Missing publishContract | LINT004 | Lane that has dependents but no `publishContract` |
| Duplicate lane ID | LINT005 | Two lanes with the same `id` |

---

## Key Components

| Component | Location |
|-----------|----------|
| `DiagnosticCard` | `ai-agencee-cloud/src/entities/run/ui/DiagnosticCard.tsx` |
| `RunCompareView` | `ai-agencee-cloud/src/entities/run/ui/RunCompareView.tsx` |
| `DagLintPanel` | `ai-agencee-cloud/src/entities/run/ui/DagLintPanel.tsx` |
| Diagnosis API | `cloud-api/src/routes/diagnostics.ts` — `POST /runs/:id/diagnose` (SSE) |
| `dag-linter.ts` | `packages/agent-executor/src/lib/dag-linter.ts` |
