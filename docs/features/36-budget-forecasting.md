# Feature 36: Budget Forecasting + Cost Allocation (IP-08)

> **Status**: ✅ Production-ready  
> **Category**: Enterprise — IP Series  
> **ID**: IP-08  
> **Package**: `_private/cloud-api` + `_private/ai-agencee-cloud`

---

## Overview

Every run is tagged with `cost_center`, `team_name`, and `project_tag` for chargeback attribution. Monthly budgets can be configured per tenant, cost center, or team. The forecasting engine uses a linear regression over the last 30 days to project end-of-month spend. Budget alerts fire at configurable warn and suspend thresholds.

---

## Cost Attribution

Tag every run at creation time:

```json
{
  "dagFile": "agents/security-review.agent.json",
  "metadata": {
    "costCenter": "engineering",
    "teamName": "platform",
    "projectTag": "q1-hardening"
  }
}
```

Or set defaults per API token so all runs from a given integration inherit the tags automatically.

---

## Budget Configuration

```json
{
  "budget": {
    "monthlyCapUsd": 500,
    "warnThresholdPct": 80,
    "suspendThresholdPct": 100,
    "scope": "team",
    "teamName": "growth"
  }
}
```

| Threshold | Action |
|-----------|--------|
| `warnThresholdPct` (default 80%) | Sends `budget:warn` event, shows warning badge in UI |
| `suspendThresholdPct` (default 100%) | Rejects new run requests with `429 Budget Exceeded` |

---

## Forecast

The `ForecastCard` in the KPI dashboard shows:
- Month-to-date actual spend
- Projected end-of-month spend (linear regression on daily totals)
- Days remaining and daily burn rate
- Percentage of cap consumed

---

## Key UI Components

| Component | Description |
|-----------|-------------|
| `ForecastCard` | Monthly spend projection at top of billing page |
| `SpendBarChart` | Daily spend bars + 30-day moving average line |
| `CostBreakdownTable` | Per-team / per-cost-center rows with % share |
| `BudgetAlertBanner` | Inline warning when team is past warn threshold |

---

## Key Backend Components

| Component | Location | Role |
|-----------|----------|------|
| `cost_allocation` table | `009_cost_allocation.sql` | Stores cost_center/team_name/project_tag per run |
| `budget_alerts` table | `009_cost_allocation.sql` | Budget rules per tenant/team/cost_center |
| Billing routes | `cloud-api/src/routes/billing.ts` | `GET /billing/forecast`, `GET /billing/breakdown`, `POST /billing/budget` |
| Budget gate | `cloud-api/src/lib/budget-gate.ts` | Enforces limits at run creation time |

---

## Demo

```bash
node scripts/demo.js agents/demos/21-budget-controlled-run/budget-sprint.dag.json
```

Five lanes culminating in a budget gate that evaluates projected spend ($320 MTD + sprint cost) against a $500 monthly cap. See [demo-scenarios.md](../demo-scenarios.md#21--budget-controlled-content-sprint).
