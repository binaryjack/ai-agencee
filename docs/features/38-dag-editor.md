# Feature 38: Visual DAG Editor (IP-10)

> **Status**: ✅ Production-ready  
> **Category**: Developer Experience — IP Series  
> **ID**: IP-10  
> **Package**: `_private/dag-editor`

---

## Overview

A browser-based drag-and-drop DAG editor with AI-assisted composition, a curated template gallery, version history with side-by-side diffing, simulation mode for replaying run events, and a live execution overlay that shows real-time lane status on the graph canvas.

---

## Features

### AI Compose

Describe a workflow in natural language and receive a valid DAG JSON:

```
"Run a security audit and dependency check in parallel, then produce a combined risk report"
```

→ Generates three-lane DAG with `security-review` + `dependency-audit` → `risk-report`, correct `dependsOn`, supervisor files pre-selected.

### Template Gallery

12 curated starting-point DAGs available from the New DAG dialog:

| Template | Lanes |
|----------|-------|
| PR Review | security-scan, test-coverage, architecture-review → summary |
| Security Audit | cve-scan, secrets-scan, owasp-checklist → risk-report |
| Dependency Audit | audit → triage → report |
| Documentation | generate-docs → review → publish |
| Accessibility Scan | wcag-check → summary |
| Database Migration | schema-review → dry-run → migration-plan |
| Eval Pipeline | generate → judge + golden-compare → ci-gate |
| Incident Autopilot | detect → diagnose → remediate → notify |
| Release Notes | diff → categorise → format |
| Onboarding Checklist | scan-codebase → generate-guide |
| Tech Migration | assess → plan → validate |
| CICD Pipeline Builder | plan → scaffold → validate |

### Version History

Every save creates a snapshot in the `dag_versions` table:

```
v1 → v2 → v3 (current)
         ↘ v2 (diff)
```

Select any two versions and click **Diff** for a side-by-side JSON diff with highlighted additions, removals, and changes.

### Simulation Mode

Step through a DAG run with mock data without executing against a real LLM provider:

1. Click **Simulate** — editor enters simulation mode
2. Click **Step** to advance one lane at a time
3. Each step shows the mock supervisor verdict and mock output
4. Cost accumulator shows projected spend per step

### Live Execution Overlay

During a real run, click **Live** in the editor toolbar:

- Lane nodes show real-time status badges (running/approved/retrying/escalated/paused)
- SSE connection subscribes to `lane:start`, `lane:end`, `checkpoint:complete` events
- Cost accumulator updates in real time
- Click a lane node during execution to open its checkpoint detail panel

---

## Key Components

| Component | Location |
|-----------|----------|
| Canvas (React Flow) | `_private/dag-editor/src/components/DagCanvas.tsx` |
| AI Compose panel | `_private/dag-editor/src/components/AiComposePanel.tsx` |
| Template gallery | `_private/dag-editor/src/components/TemplateGallery.tsx` |
| Version history panel | `_private/dag-editor/src/components/VersionHistoryPanel.tsx` |
| Simulation controller | `_private/dag-editor/src/lib/simulation.ts` |
| Live overlay hook | `_private/dag-editor/src/hooks/useLiveOverlay.ts` |
| `dag_versions` table | `010_dag_versions.sql` |
