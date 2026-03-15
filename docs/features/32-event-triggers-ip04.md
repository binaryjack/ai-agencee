# Feature 32: GitHub Webhook Triggers + Cron (IP-04)

> **Status**: ✅ Production-ready  
> **Category**: Enterprise — IP Series  
> **ID**: IP-04  
> **Package**: `_private/cloud-api` + `_private/ai-agencee-cloud`

---

## Overview

DAG runs can be triggered automatically by GitHub webhook events or on a cron schedule. Every incoming webhook is HMAC-SHA256 verified. An event → DAG route table maps GitHub event types to specific DAG files and input variables. Cron triggers use standard cron expressions and run in the tenant's time zone.

---

## Webhook Triggers

### Supported GitHub Events

| Event | Typical Use |
|-------|-------------|
| `push` | Run CI checks or documentation generation on every push |
| `pull_request` (opened / synchronize / reopened) | Automated PR description, security review, test coverage check |
| `issues` (opened / labeled) | Triage workflow, dependency audit |
| `workflow_run` (completed) | Chain DAGs — run post-deploy analysis after CI passes |

### Security

All webhook requests must carry a valid `X-Hub-Signature-256` header. The cloud-api validates the HMAC before queuing any DAG run. Invalid signatures return `401` and are logged to the audit trail.

### Route Configuration

```json
{
  "event": "pull_request",
  "action": "opened",
  "dagFile": "agents/pr-description.agent.json",
  "inputs": {
    "pr_number": "{{ payload.pull_request.number }}",
    "repo": "{{ payload.repository.full_name }}"
  }
}
```

---

## Cron Triggers

```json
{
  "schedule": "0 8 * * MON",
  "timezone": "America/New_York",
  "dagFile": "agents/dependency-audit.agent.json",
  "label": "Weekly dependency audit"
}
```

---

## Key Components

| Component | Location | Role |
|-----------|----------|------|
| `webhook_triggers` table | `007_triggers.sql` | Stores event → DAG mappings per tenant |
| `cron_triggers` table | `007_triggers.sql` | Stores cron expressions + next-run timestamp |
| Webhook route | `cloud-api/src/routes/webhooks.ts` | `POST /webhooks/github/:tenantId` — validates + queues run |
| Cron scheduler | `cloud-api/src/lib/cron-scheduler.ts` | pg-cron or Node setInterval; respects next_run_at |
| Trigger settings | `ai-agencee-cloud/src/pages/settings/TriggersPage.tsx` | Create / edit / delete triggers in UI |

---

## API

```
POST   /triggers/webhook         Create a webhook trigger
PUT    /triggers/webhook/:id     Update route or event filter
DELETE /triggers/webhook/:id     Remove trigger

POST   /triggers/cron            Create a cron trigger
PUT    /triggers/cron/:id        Update schedule or DAG
DELETE /triggers/cron/:id        Remove trigger

POST   /webhooks/github/:tenantId   Receive GitHub events (public endpoint)
```
