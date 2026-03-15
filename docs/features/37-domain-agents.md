# Feature 37: Domain Agents — Production Ready (IP-09)

> **Status**: ✅ Production-ready  
> **Category**: Enterprise — IP Series  
> **ID**: IP-09  
> **Location**: `agents/` (root repo)

---

## Overview

Six production-ready domain agents with real prompts, supervisor configs, check schemas, and JSON schemas. Each agent is a drop-in DAG lane — connect to any DAG, provide the required capability, and get structured, actionable output.

---

## Agent Index

### `security-review`

**File:** `agents/security-review.agent.json`  
**Capability:** `security-analysis`  
**Output:** OWASP Top-10 findings with CVSS scores, severity, and remediation steps

```json
{ "findings": [{ "category": "A1-Injection", "cvss": 8.1, "location": "src/auth.ts:42", "fix": "..." }] }
```

---

### `dependency-audit`

**File:** `agents/dependency-audit.agent.json`  
**Capability:** `dependency-analysis`  
**Output:** Per-package audit: CVE IDs, severity, licence type, recommended update

```json
{ "packages": [{ "name": "lodash", "version": "4.17.15", "cve": "CVE-2021-23337", "severity": "high", "fix_version": "4.17.21" }] }
```

---

### `pr-description`

**File:** `agents/pr-description.agent.json`  
**Capability:** `pr-description`  
**Output:** Structured PR summary with impact classification

```json
{
  "title": "feat(auth): add OIDC PKCE flow",
  "summary": "...",
  "impact": "high",
  "breaking_changes": [],
  "test_plan": "..."
}
```

---

### `documentation`

**File:** `agents/documentation.agent.json`  
**Capability:** `documentation-generation`  
**Output:** JSDoc annotations, README sections, or CHANGELOG entries from source context

---

### `accessibility`

**File:** `agents/accessibility.agent.json`  
**Capability:** `accessibility-analysis`  
**Output:** WCAG 2.2 Level AA findings per component: criterion, severity, suggested fix

```json
{ "violations": [{ "criterion": "1.4.3 Contrast Minimum", "severity": "serious", "element": "button.primary", "fix": "..." }] }
```

---

### `database`

**File:** `agents/database.agent.json`  
**Capability:** `database-analysis`  
**Output:** Schema review findings, slow-query candidates, migration safety warnings

```json
{ "schema_issues": [...], "slow_queries": [...], "migration_risks": [...] }
```

---

## Supervisor Pattern

All six agents share the same supervisor contract pattern:

```json
{
  "retryBudget": 2,
  "checkpoints": [
    {
      "checkpointId": "analysis",
      "mode": "self",
      "expect": { "validJson": true, "minFindings": 1 },
      "onFail": "RETRY",
      "retryInstructions": "Return at least one finding. If the codebase is clean, output { 'findings': [{ 'status': 'clean' }] }."
    }
  ],
  "publishContract": { "key": "findings", "outputKeys": ["findings"] }
}
```

---

## Usage in a DAG

```json
{
  "id": "security",
  "agentFile": "agents/security-review.agent.json",
  "supervisorFile": "agents/security-review.supervisor.json",
  "dependsOn": [],
  "capabilities": ["security-analysis"]
}
```

---

## Demo

See demos `09-security-audit` and `07-pr-review` for full multi-lane examples using these agents.
