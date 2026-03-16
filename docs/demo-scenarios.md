# Advanced Demo Scenarios

A guided tour of the DAG engine's full behaviour surface — failures, retries,
handoffs, escalations, barriers, and human-review gates — all runnable **without
any API keys** using the built-in `MockProvider`.

---

## Quick start

```bash
# Build once (compiles TypeScript packages)
pnpm build

# Interactive scenario picker
pnpm demo:menu

# Run a specific scenario directly
pnpm demo:01     # App Boilerplate          — RETRY × 2, hard-barrier
pnpm demo:02     # Enterprise Skeleton      — HANDOFF, needs-human-review
pnpm demo:03     # Website Build            — ESCALATE terminal
pnpm demo:04     # Feature in Context       — soft-align, read-contract
pnpm demo:05     # MVP Sprint               — flaky lane, mixed results
pnpm demo:06     # Resilience Showcase      — every error type at once
pnpm demo:07     # PR Review                — multi-lane code review pipeline
pnpm demo:08     # Zero to Deployed         — idea through CI/CD to cloud
pnpm demo:09     # Security Audit           — 5-agent OWASP sweep
pnpm demo:10     # Incident Autopilot       — detect → root-cause → patch → post-mortem
pnpm demo:11     # App Bootstrapper         — full-stack scaffold with human gate
pnpm demo:12     # Feature in Production    — branch → implement → deploy with guard
pnpm demo:13     # Dev Onboarding           — self-guided onboarding pipeline
pnpm demo:14     # Tech Migration Advisor   — assessment + roadmap generator
pnpm demo:15     # Data Migration (Critical)— schema diff, validate, migrate
pnpm demo:16     # CI/CD Pipeline Builder   — generate pipeline from stack profile
pnpm demo:17     # Living Documentation     — auto-docs sync with codebase drift
pnpm demo:18     # Multitenant Hardening    — isolation + compliance audit
pnpm demo:19     # Eval Pipeline            — LLM-as-judge + CI gate
pnpm demo:20     # Pause / Resume           — serialised checkpoint workflow
pnpm demo:21     # Budget Sprint            — cost-gated content pipeline

# Run all scenarios back-to-back
pnpm demo:all
```

---

## The 5-Phase Plan Demo

Before the DAG engine runs, every real project goes through a **5-phase
structured planning process**.  The `pnpm demo:plan` suite seeds pre-answered
discovery data so you can watch Phases 1–4 without typing answers interactively.

```bash
# Interactive seed picker → then plan from Phase 1
pnpm demo:plan

# Jump straight to a seed
pnpm demo:plan:01   # App Boilerplate discovery seed
pnpm demo:plan:02   # Enterprise Skeleton seed
pnpm demo:plan:03   # Website Build seed
pnpm demo:plan:04   # Feature-in-Context seed (billing added to existing platform)
pnpm demo:plan:05   # MVP Sprint seed (2-week solo sprint)

# Install seed only, do not run
node scripts/plan-demo.js 1 --dry-run

# Run with real LLM (requires configured provider)
node scripts/plan-demo.js 1 --live
```

### The 5 phases explained

| # | Name | What happens | Key output |
|---|------|-------------|-----------|
| 0 | **DISCOVER** | BA interviews the Product Owner via structured Q&A blocks | `discovery.json` |
| 1 | **SYNTHESIZE** | BA produces plan skeleton (Steps + rough Tasks), PO approves | `plan.json` |
| 2 | **DECOMPOSE** | Each agent expands their Steps into detailed Tasks in parallel | fully populated `plan.json` |
| 3 | **WIRE** | Dependency graph computed; alignment gates injected at conflict points | wired `plan.json` |
| 4 | **EXECUTE** | `PlanOrchestrator` feeds wired plan into `DagOrchestrator` lane by lane | execution artifacts |

> **Phase 0 is skipped by seeding.**  The plan seeds in
> `agents/demos/plan-seeds/` are pre-filled `discovery.json` files that carry
> complete, realistic answers — so the runner jumps straight to Phase 1.

---

## Scenario index

### 01 — App Boilerplate

**Project type:** From-scratch full-stack app  
**Run:** `pnpm demo:01`  
**DAG:** `agents/demos/01-app-boilerplate/boilerplate.dag.json`

| Lane | Behaviour | What to watch |
|------|-----------|---------------|
| `requirements` | APPROVE immediately | Baseline APPROVE path |
| `scaffold` | `retryBudget: 2` — checks Dockerfile (missing) → `noErrorFindings` FAILS | RETRY loop: *"Retry 1/2 … Retry 2/2 … budget exhausted → ESCALATE"* |
| `backend` | APPROVE; publishes api-spec contract; joins hard-barrier | Hard-barrier participant |
| `frontend` | APPROVE; publishes component-tree contract; joins hard-barrier | Hard-barrier participant |
| `integrate` | Reads both contracts after barrier releases | Contract field validation via `contractFields` |

**Key concepts demonstrated:**
- `retryBudget` exhaust → automatic ESCALATE
- Parallel lanes (`backend` + `frontend`) running simultaneously
- `hard-barrier` blocking `integrate` until *both* participants commit
- `read-contract` / `contractFields` expect rule

**Log events to spot:**
```
[scaffold] RETRY 1/2 — Dockerfile not found
[scaffold] RETRY 2/2 — Dockerfile not found
[scaffold] Budget exhausted → ESCALATE
[barrier] backend committed barrier-checkpoint
[barrier] frontend committed barrier-checkpoint
[barrier] hard-barrier "backend-frontend-ready" released — 2/2 participants
[integrate] Reading contracts from barrier snapshot
```

---

### 02 — Enterprise Skeleton

**Project type:** Enterprise app with auth, multi-tenancy, and features  
**Run:** `pnpm demo:02` (add `--interactive` flag for human-review gate)  
**DAG:** `agents/demos/02-enterprise-skeleton/enterprise.dag.json`

| Lane | Behaviour | What to watch |
|------|-----------|---------------|
| `requirements` | APPROVE | Fast baseline with `requiredKeys` check |
| `security-baseline` | `retryBudget: 2` — checks `.env.example` (missing) | RETRY × 2 visual |
| `architecture` | APPROVE; reads security + requirements contracts | `read-contract` from two waitFor lanes |
| `auth-module` | APPROVE; publishes `user-roles` contract | Upstream for HANDOFF |
| `db-schema` | `onFail: "HANDOFF"` — checks `prisma/schema.prisma` (missing) → hands off to `auth-module` | HANDOFF verdict + `handoffContext` payload |
| `human-review` | `mode: "needs-human-review"` | PAUSES if `--interactive`; auto-proceeds otherwise |
| `deployment-config` | APPROVE | Post-review deployment configuration |

**Key concepts demonstrated:**
- HANDOFF with `handoffContext` (carries problem description + partial result)
- `needs-human-review` gate — the engine pauses and prints a prompt when `--interactive`
- Parallel first group (`requirements` + `security-baseline`)
- Multi-dependency `architecture` lane (`dependsOn: ["requirements","security-baseline"]`)

**Run with human-review gate active:**
```bash
node scripts/run-scenarios.js 2 --interactive
# or
node packages/cli/dist/bin/ai-kit.js agent:dag \
  agents/demos/02-enterprise-skeleton/enterprise.dag.json \
  --provider mock --verbose --interactive
```

**Log events to spot:**
```
[db-schema] prisma/schema.prisma not found → HANDOFF to auth-module
[db-schema] Handoff context: { reason: "Schema dependency...", ... }
[human-review] ⏸  Needs human review — waiting for operator input
[human-review] Operator approved — proceeding
```

---

### 03 — Website Build

**Project type:** Marketing/portfolio website  
**Run:** `pnpm demo:03`  
**DAG:** `agents/demos/03-website-build/website.dag.json`

| Lane | Behaviour | What to watch |
|------|-----------|---------------|
| `content` | APPROVE immediately | Baseline |
| `design` | `retryBudget: 2` — checks `src/styles/tokens.css` (missing) | RETRY × 2 |
| `seo` | `retryBudget: 1` — checks `sitemap.xml` + `robots.txt` (both missing) → step-0 RETRY × 1 → step-1 **ESCALATE** 🚨 | Terminal escalation |
| `publish-readiness` | Still runs despite SEO escalation | Partial DAG behaviour |

**Key concepts demonstrated:**
- ESCALATE as a **terminal** lane state — the engine records it and continues other lanes
- Partial DAG result: `publish-readiness` has no `dependsOn: ["seo"]`, so it runs regardless
- Multiple `file-exists` checks in one step; both failing amplifies the signal

**What "terminal escalation" means:**
The `seo` lane's `EscalationError` is caught by `LaneExecutor`; `laneStatus` is set
to `'escalated'` and the lane result is included in the final `DagResult` with
`status: 'escalated'`.  Downstream lanes that do **not** depend on `seo` continue
normally — only lanes with `dependsOn: ["seo"]` would be blocked.

**Log events to spot:**
```
[design]  RETRY 1/2 — tokens.css not found
[design]  RETRY 2/2 — tokens.css not found
[seo]     RETRY 1/1 — sitemap.xml not found
[seo]     🚨 ESCALATE — sitemap.xml and robots.txt both missing; human intervention required
[publish-readiness]  Running (seo lane escalated but dependency not declared)
```

---

### 04 — Feature in Context

**Project type:** Adding a feature to an existing codebase  
**Run:** `pnpm demo:04`  
**DAG:** `agents/demos/04-feature-in-context/feature.dag.json`

| Lane | Behaviour | What to watch |
|------|-----------|---------------|
| `context-scan` | APPROVE; publishes codebase-context contract | Single upstream producer |
| `api-design` | step-0: `read-contract` from `context-scan`; step-1: `soft-align` with `data-model` (8 s timeout) | Contract consumption + cross-lane sync |
| `data-model` | step-0: `read-contract` from `context-scan`; step-1: `soft-align` with `api-design` (8 s timeout) | Cross-lane sync, may fallback |
| `implementation` | APPROVE; depends on both api-design + data-model | Fan-in after alignment |
| `tests` | APPROVE; depends on implementation | Final step |

**Key concepts demonstrated:**
- `read-contract` — a lane waits for another lane's contract before proceeding (soft read, no blocking)
- `soft-align` — two lanes synchronise at a rendezvous point with a configurable `timeoutMs`
- `fallback: "proceed-with-snapshot"` — if the partner hasn't arrived in time, the lane uses the last known snapshot and continues; no escalation
- Fan-in dependency pattern: `implementation` depends on both `api-design` and `data-model`

**Log events to spot:**
```
[context-scan]    APPROVE — codebase context contract published
[api-design]      Checkpoint read-contract: waiting for context-scan snapshot
[data-model]      Checkpoint read-contract: waiting for context-scan snapshot
[api-design]      Checkpoint soft-align: synchronising with data-model (timeout 8000ms)
[data-model]      Checkpoint soft-align: synchronising with api-design (timeout 8000ms)
[api-design]      soft-align resolved — partner arrived within timeout
```

---

### 05 — MVP Sprint

**Project type:** Minimum Viable Product, 2-week timeline  
**Run:** `pnpm demo:05`  
**DAG:** `agents/demos/05-mvp-sprint/mvp.dag.json`

| Lane | Behaviour | What to watch |
|------|-----------|---------------|
| `idea-validation` | `retryBudget: 0` — immediate APPROVE | Fast-path baseline |
| `market-scan` | `retryBudget: 1` — checks `docs/market-research.md` (missing) → RETRY × 1 | Single retry |
| `mvp-spec` | APPROVE; reads both upstream contracts | Synthesises both inputs |
| `rapid-backend` | APPROVE — API skeleton, no blocking files | Clean path |
| `rapid-frontend` | `retryBudget: 2` — checks `src/styles/tokens.css` (missing) → **FLAKY** RETRY × 2 | Flaky lane behaviour |
| `ship-checklist` | APPROVE; launch readiness + tech-debt register | Final summary |

**Key concepts demonstrated:**
- Mixed-result sprint: some lanes succeed, some exhaust retry budgets
- `retryBudget: 0` for lanes that must pass first time (no retry allowed in MVP pressure)
- A "flaky" lane (rapidly-frontend) that consistently fails in mock mode demonstrates what happens when a lane can't recover — exhausts budget, escalates, and the surrounding lanes continue

**Log events to spot:**
```
[idea-validation] APPROVE (retryBudget: 0 — no retry allowed)
[market-scan]     RETRY 1/1 — docs/market-research.md not found
[rapid-frontend]  🔁 RETRY 1/2 — [FLAKY] tokens.css not found
[rapid-frontend]  🔁 RETRY 2/2 — [FLAKY] tokens.css still not found
[rapid-frontend]  Budget exhausted → ESCALATE
[ship-checklist]  Running despite rapid-frontend escalation (no hard dependency)
```

---

### 06 — Resilience Showcase

**Project type:** Engine test harness — all error types in a single run  
**Run:** `pnpm demo:06` (add `--interactive` to trigger human-review gate)  
**DAG:** `agents/demos/06-resilience-showcase/resilience.dag.json`

All 8 lanes are **independent** (no `dependsOn`) — they all run in parallel,
giving you side-by-side log output of every engine behaviour simultaneously.

| Lane | Behaviour |
|------|-----------|
| `lane-success` | ✅ Checks `package.json` (exists) → APPROVE immediately |
| `lane-retry-ok` | 🔁 Checks `Dockerfile` (missing) → RETRY × 2 → budget exhausted → ESCALATE |
| `lane-handoff` | 🤝 Checks `prisma/schema.prisma` (missing) → HANDOFF to `specialist-lane` |
| `specialist-lane` | ✅ Receives handoff context → provides DB expertise → APPROVE |
| `lane-escalate` | 🚨 Checks `sitemap.xml` + `robots.txt` (both missing) → RETRY × 1 → **ESCALATE** terminal |
| `lane-human-gate` | ⏸  `needs-human-review` — pauses when `--interactive`, auto-proceeds otherwise |
| `lane-barrier-a` | 🔒 Joins hard-barrier `barrier-demo-sync`; waits for `lane-barrier-b` |
| `lane-barrier-b` | 🔒 Joins hard-barrier `barrier-demo-sync`; has extra step (slower partner) |

**This is the ideal scenario to run first** when evaluating the engine — every
log line maps directly to a documented engine behaviour.

**Run with all features active:**
```bash
node scripts/run-scenarios.js 6 --interactive
```

---

### 07 — PR Auto-Review

**Project type:** Automated pull-request review pipeline  
**Run:** `pnpm demo:07`  
**DAG:** `agents/demos/07-pr-review/pr-review.dag.json`

| Lane | Depends on | Behaviour | What to watch |
|------|-----------|-----------|---------------|
| `security-scan` | — | `retryBudget: 1` — scans diff for secrets + CVEs → RETRY × 1-2, then ESCALATE | Secret detected in diff, PII scrub |
| `architecture-review` | — | `retryBudget: 0` — breaking-change detection → immediate ESCALATE if API contract broken | Zero-retry path |
| `test-coverage` | — | `retryBudget: 1` — coverage gap analysis → ESCALATE if no test files added | Missing-test escalation |
| `review-summary` | `security-scan` + `architecture-review` | `read-contract` — synthesises findings into structured review comment | Fan-in pattern |

**Key concepts demonstrated:**
- Three parallel audit lanes running simultaneously (security, architecture, tests)
- `retryBudget: 0` on `architecture-review` — breaking changes are not retried, only escalated
- `read-contract` fan-in on `review-summary` — waits for two upstream contracts before synthesising
- PII scrubbing: secret token found in diff is redacted before passing to downstream lanes

**Log events to spot:**
```
[security-scan]       RETRY 1/1 — scanning diff for hardcoded secrets
[security-scan]       ⚠ SECRET DETECTED — token redacted from contract
[architecture-review] ESCALATE (retryBudget: 0) — breaking API change detected
[test-coverage]       RETRY 1/1 — no test files found in diff
[review-summary]      Checkpoint read-contract: waiting for security-scan snapshot
[review-summary]      APPROVE — structured review comment published
```

---

### 08 — Zero-to-Deployed Feature

**Project type:** Full SDLC — feature brief through release notes  
**Run:** `pnpm demo:08`  
**DAG:** `agents/demos/08-zero-to-deployed/zero-to-deployed.dag.json`

| Lane | Depends on | Behaviour | What to watch |
|------|-----------|-----------|---------------|
| `brief-analysis` | — | APPROVE — requirements extraction and feature spec | Pipeline start |
| `architecture` | `brief-analysis` | APPROVE — component design, reads upstream spec | read-contract |
| `backend-impl` | `architecture` | APPROVE — API skeleton; joins `impl-ready` barrier | Hard-barrier participant |
| `frontend-impl` | `architecture` | APPROVE — UI components; joins `impl-ready` barrier | Hard-barrier participant |
| `test-suite` | `backend-impl` + `frontend-impl` | APPROVE — integration tests generated after barrier sync | Fan-in after barrier |
| `release-notes` | `test-suite` | APPROVE — changelog and release notes | Pipeline end |

**Key concepts demonstrated:**
- Full 6-step SDLC pipeline: brief → architecture → parallel implementation → tests → release
- `impl-ready` hard barrier (`timeoutMs: 20000`) synchronises `backend-impl` and `frontend-impl` before tests begin
- Fan-in on `test-suite` — blocked until both implementation lanes commit to the barrier
- Cost tracking visible across all 6 agents in a single run

**Log events to spot:**
```
[brief-analysis]  APPROVE — feature spec published
[backend-impl]    Joining barrier impl-ready (waiting for frontend-impl)
[frontend-impl]   Joining barrier impl-ready (waiting for backend-impl)
[backend-impl]    Barrier released — both lanes committed
[test-suite]      Reading contracts from backend-impl and frontend-impl
[release-notes]   APPROVE — CHANGELOG.md entry generated
```

---

### 09 — Live Security Audit

**Project type:** OWASP/CVE repository sweep  
**Run:** `pnpm demo:09`  
**DAG:** `agents/demos/09-security-audit/security-audit.dag.json`

| Lane | Depends on | Behaviour | What to watch |
|------|-----------|-----------|---------------|
| `cve-scan` | — | APPROVE — dependency vulnerability scan, CVSS scores | CVE list output |
| `secrets-scan` | — | APPROVE — 3 secrets detected and redacted | PII scrub × 3 |
| `owasp-checklist` | — | APPROVE — Top-10 injection/auth/config checks | OWASP findings |
| `risk-report` | all 3 above | APPROVE — aggregates CVSS-scored findings | Fan-in synthesis |
| `notify` | `risk-report` | APPROVE — Slack alert dispatched | Notification sink |

**Key concepts demonstrated:**
- Three fully parallel audit lanes (CVE, secrets, OWASP) — all start simultaneously
- PII scrubbing: 3 secrets found in `secrets-scan` are redacted before flowing downstream
- CVSS scoring: `risk-report` normalises findings from 3 different scanners into a unified score
- Notification sink pattern: `notify` is a terminal lane that dispatches an alert

**Log events to spot:**
```
[cve-scan]       APPROVE — 2 HIGH CVEs found in dependencies
[secrets-scan]   ⚠ SECRET #1 scrubbed (API_KEY in .env.example)
[secrets-scan]   ⚠ SECRET #2 scrubbed (DB_PASSWORD in docker-compose)
[secrets-scan]   ⚠ SECRET #3 scrubbed (JWT_SECRET in config.js)
[owasp-checklist] APPROVE — injection risk: MEDIUM, auth: LOW
[risk-report]    Aggregating findings from 3 scan lanes
[notify]         APPROVE — Slack alert dispatched (CVSS: 7.4 HIGH)
```

---

### 10 — Incident Autopilot

**Project type:** P1 incident response — detect, diagnose, patch, review, post-mortem  
**Run:** `pnpm demo:10` (add `--interactive` to trigger human-review gate)  
**DAG:** `agents/demos/10-incident-autopilot/incident.dag.json`

| Lane | Depends on | Behaviour | What to watch |
|------|-----------|-----------|---------------|
| `log-analyser` | — | APPROVE — log parsing, error pattern detection | Pipeline start |
| `root-cause` | `log-analyser` | APPROVE — hypothesis generation from log patterns | Sequential diagnosis |
| `fix-generator` | `root-cause` | APPROVE / HANDOFF — generates patch; complex DB issues HANDOFF to `db-specialist` | HANDOFF trigger |
| `db-specialist` | — | APPROVE — receives handoff context, provides DB-level fix | Specialist receiver |
| `human-review-gate` | `fix-generator` | `needs-human-review` — pauses for operator sign-off | Pause point |
| `post-mortem` | `human-review-gate` | APPROVE — runbook update + incident summary | Pipeline close |

**Key concepts demonstrated:**
- Sequential diagnosis pipeline: log analysis flows into root-cause, then fix generation
- HANDOFF from `fix-generator` to `db-specialist` when fix complexity exceeds lane scope
- `needs-human-review` gate after fix is generated — operator must approve patch before post-mortem
- Event-trigger pattern: simulates PagerDuty P1 alert as pipeline entry point

**Log events to spot:**
```
[log-analyser]       APPROVE — 3 error patterns detected
[root-cause]         APPROVE — root cause: connection pool exhaustion
[fix-generator]      HANDOFF → db-specialist (DB query optimisation required)
[db-specialist]      Received handoff context — proposing query index fix
[human-review-gate]  ⏸ Paused — awaiting operator sign-off
[post-mortem]        APPROVE — runbook updated, incident closed
```

---

### 11 — App Bootstrapper

**Project type:** Full-stack app scaffold with human framework selection  
**Run:** `pnpm demo:11` (add `--interactive` to activate human-review gates)  
**DAG:** `agents/demos/11-app-bootstrapper/app-bootstrapper.dag.json`

| Lane | Depends on | Behaviour | What to watch |
|------|-----------|-----------|---------------|
| `product-brief` | — | APPROVE — PM brief extraction | Pipeline start |
| `tech-selector` | `product-brief` | `needs-human-review` — framework recommendation, pauses for operator choice | Human gate |
| `ux-wireframe` | `product-brief` | APPROVE — parallel with tech-selector (no dependency on it) | Parallel fast path |
| `scaffold-gen` | `tech-selector` | APPROVE / ESCALATE — generates scaffold; ESCALATE if infrastructure credentials missing | Credential check |
| `ai-integrator` | `scaffold-gen` | APPROVE — wires LLM provider into scaffolded app | Integration step |
| `launch-gate` | `ai-integrator` + `ux-wireframe` | `needs-human-review` + `read-contract` — final readiness check | Second human gate |

**Key concepts demonstrated:**
- Human-in-the-loop for framework selection: `tech-selector` pauses mid-pipeline for operator input
- `ux-wireframe` runs in parallel with `tech-selector` — it depends only on `product-brief`
- ESCALATE on `scaffold-gen` if infrastructure credentials are missing (graceful failure, not crash)
- Double human gate pattern: one for framework choice, one for final launch readiness

**Log events to spot:**
```
[product-brief]  APPROVE — PM brief parsed
[tech-selector]  ⏸ Paused — awaiting human framework selection
[ux-wireframe]   APPROVE (runs in parallel — no block on tech-selector)
[scaffold-gen]   ESCALATE — infrastructure credentials not found
[ai-integrator]  APPROVE — LLM provider wired
[launch-gate]    ⏸ Paused — final readiness sign-off
```

---

### 12 — Feature in Production Context

**Project type:** Feature implementation inside an existing live codebase  
**Run:** `pnpm demo:12`  
**DAG:** `agents/demos/12-feature-in-context/feature-in-context.dag.json`

| Lane | Depends on | Behaviour | What to watch |
|------|-----------|-----------|---------------|
| `context-scanner` | — | APPROVE — full codebase index with PII scrub on author metadata | PII scrub |
| `impact-analyser` | `context-scanner` | APPROVE / ESCALATE — blast-radius analysis; ESCALATE on breaking change | Breaking-change guard |
| `implementation` | `impact-analyser` | APPROVE — code generation scoped to impact report | read-contract |
| `conflict-resolver` | `implementation` | APPROVE / HANDOFF — merge conflict resolution; HANDOFF on complex conflicts | HANDOFF path |
| `regression-tests` | `implementation` | APPROVE / RETRY — test generation; RETRY × 2 if coverage threshold not met | RETRY path |
| `pr-draft` | `conflict-resolver` + `regression-tests` | `needs-human-review` — PR description generated, human gate before submit | Fan-in + human gate |

**Key concepts demonstrated:**
- PII scrubbing on author metadata (git blame emails) before passing codebase context downstream
- ESCALATE on `impact-analyser` when blast-radius analysis detects a breaking change
- Parallel `conflict-resolver` and `regression-tests` after `implementation` (both depend only on `implementation`)
- Fan-in on `pr-draft` — waits for both conflict resolution and regression test results

**Log events to spot:**
```
[context-scanner]  ⚠ PII scrubbed — 2 author emails redacted
[impact-analyser]  ESCALATE — breaking change detected in public API
[implementation]   APPROVE — 3 files modified
[conflict-resolver] HANDOFF — complex 3-way merge forwarded to specialist
[regression-tests] RETRY 1/2 — coverage 68% < threshold 80%
[pr-draft]         ⏸ Paused — awaiting human sign-off before PR submit
```

---

### 13 — Dev Onboarding

**Project type:** Automated new-hire codebase onboarding  
**Run:** `pnpm demo:13`  
**DAG:** `agents/demos/13-dev-onboarding/dev-onboarding.dag.json`

| Lane | Depends on | Behaviour | What to watch |
|------|-----------|-----------|---------------|
| `codebase-indexer` | — | APPROVE — full index with PII scrub on JSDoc author emails | PII scrub on metadata |
| `arch-summariser` | `codebase-indexer` | APPROVE / RETRY — RETRY when repo too large for single context window → chunked analysis | Chunked RETRY |
| `conventions-extractor` | `codebase-indexer` | APPROVE — team conventions and coding standards extracted | Parallel with arch |
| `first-task-planner` | `arch-summariser` + `conventions-extractor` | APPROVE / HANDOFF — task selection; HANDOFF to tech lead for final task assignment | HANDOFF to human |
| `onboarding-doc` | `first-task-planner` | `needs-human-review` — final onboarding doc generated and paused for delivery sign-off | Human gate at end |

**Key concepts demonstrated:**
- `arch-summariser` and `conventions-extractor` run in parallel after indexing — both depend only on `codebase-indexer`
- RETRY with chunked analysis on `arch-summariser` when repo size exceeds single context window
- HANDOFF from `first-task-planner` to tech lead — lane cannot self-select the right first task
- Terminal human-review gate before onboarding doc is delivered to the new hire

**Log events to spot:**
```
[codebase-indexer]      ⚠ PII scrubbed — 8 author emails redacted from JSDoc
[arch-summariser]       RETRY 1/1 — context window exceeded, switching to chunked mode
[conventions-extractor] APPROVE (parallel — no dependency on arch-summariser)
[first-task-planner]    HANDOFF → tech-lead (task selection requires human context)
[onboarding-doc]        ⏸ Paused — awaiting delivery sign-off
```

---

### 14 — Tech Migration Advisor

**Project type:** Migration feasibility analysis — assessment through go/no-go  
**Run:** `pnpm demo:14`  
**DAG:** `agents/demos/14-tech-migration-advisor/tech-migration-advisor.dag.json`

| Lane | Depends on | Behaviour | What to watch |
|------|-----------|-----------|---------------|
| `stack-auditor` | — | APPROVE — current stack inventory and health check | Baseline |
| `dependency-mapper` | `stack-auditor` | APPROVE / ESCALATE — dependency graph; ESCALATE immediately on deprecated critical dependency | Hard ESCALATE |
| `risk-assessor` | `dependency-mapper` | `needs-human-review` — risk matrix; human gate before roadmap is built | Risk gate |
| `migration-roadmap` | `risk-assessor` | APPROVE — phased migration plan derived from risk assessment | Phased output |
| `poc-spec` | `migration-roadmap` | APPROVE — PoC technical spec for highest-risk migration phase | Proof-of-concept |
| `go-no-go-gate` | `poc-spec` + `risk-assessor` | `needs-human-review` — final go/no-go decision with evidence | Fan-in decision gate |

**Key concepts demonstrated:**
- Immediate ESCALATE on `dependency-mapper` when a deprecated critical library is detected — no retry
- Human gate on `risk-assessor` before roadmap work begins — risk must be acknowledged first
- Fan-in on `go-no-go-gate` from both `poc-spec` and `risk-assessor` — decision needs both inputs
- Produces `NOT_NOW` recommendation with a concrete phased plan (actionable rejection)

**Log events to spot:**
```
[stack-auditor]    APPROVE — 12 dependencies audited
[dependency-mapper] ESCALATE — deprecated critical: node-sass@4.14.1 (EOL 2020)
[risk-assessor]    ⏸ Paused — human risk acknowledgement required
[migration-roadmap] APPROVE — 3-phase migration plan (6, 12, 18 months)
[poc-spec]         APPROVE — Phase 1 PoC: replace node-sass with sass
[go-no-go-gate]    ⏸ Paused — go/no-go decision (recommendation: NOT_NOW)
```

---

### 15 — Critical Data Migration

**Project type:** Production database migration with rollback capability  
**Run:** `pnpm demo:15`  
**DAG:** `agents/demos/15-data-migration-critical/data-migration-critical.dag.json`

This is the most dramatic scenario — the pipeline deliberately fails at integrity check and triggers a full rollback.

| Lane | Depends on | Behaviour | What to watch |
|------|-----------|-----------|---------------|
| `schema-analyser` | — | APPROVE — schema diff with PII/GDPR field scrubbing | GDPR scrub |
| `migration-planner` | `schema-analyser` | APPROVE — migration steps, constraint order, rollback plan | Plan generation |
| `backup-validator` | `migration-planner` | APPROVE — backup verification; releases `backup-complete` hard barrier | Hard barrier release |
| `dry-run` | `backup-validator` | APPROVE / RETRY × 2 — constraint violation simulation | RETRY on constraints |
| `live-migration` | `dry-run` | `needs-human-review` — human gate before executing against production | Critical human gate |
| `integrity-check` | `live-migration` | **ESCALATE** — integrity check intentionally fails → triggers rollback | Rollback trigger |
| `rollback-agent` | `integrity-check` | APPROVE — executes rollback, publishes failure report | Safe failure |

**Key concepts demonstrated:**
- `backup-complete` hard barrier: `live-migration` cannot begin until `backup-validator` confirms backup exists
- RETRY × 2 on `dry-run` for constraint violations — simulates real migration failures
- Human gate (`needs-human-review`) on `live-migration` — operator must approve before production execution
- Intentional ESCALATE → rollback pattern: engine fails safely, data not corrupted

**Log events to spot:**
```
[schema-analyser]   ⚠ PII scrubbed — 4 GDPR fields identified (email, dob, ssn, phone)
[backup-validator]  Hard barrier backup-complete released
[dry-run]           RETRY 1/2 — FK constraint violation on users → orders
[live-migration]    ⏸ Paused — human approval required before production execution
[integrity-check]   ESCALATE — row count mismatch: 10,420 vs 10,398 (delta: 22)
[rollback-agent]    APPROVE — rollback complete, original state restored
```

---

### 16 — CI/CD Pipeline Builder

**Project type:** Repository analysis → full CI/CD pipeline configuration  
**Run:** `pnpm demo:16`  
**DAG:** `agents/demos/16-cicd-pipeline-builder/cicd-pipeline-builder.dag.json`

| Lane | Depends on | Behaviour | What to watch |
|------|-----------|-----------|---------------|
| `repo-analyser` | — | APPROVE — stack detection, runner requirements, language versions | Baseline |
| `pipeline-designer` | `repo-analyser` | APPROVE / RETRY — YAML generation; RETRY on runner incompatibility | RETRY on runner |
| `secrets-rotator` | `repo-analyser` | APPROVE — bulk secrets rotation; ×5 PII scrub events | Bulk PII scrub |
| `test-config` | `repo-analyser` | APPROVE / ESCALATE — test runner config; ESCALATE on flaky test detection | Flaky test ESCALATE |
| `deploy-configurator` | all 3 upstream + `pipeline-ready` barrier | `needs-human-review` — deploy target config; human gate before pipeline is applied | Final human gate |

**Key concepts demonstrated:**
- `pipeline-ready` hard barrier: all three parallel lanes (`pipeline-designer`, `secrets-rotator`, `test-config`) must complete before `deploy-configurator` begins
- Bulk PII scrub: `secrets-rotator` triggers 5 separate scrub events (one per rotated secret)
- ESCALATE on `test-config` when flaky tests are detected — flakiness must be addressed manually
- Human gate on `deploy-configurator` — pipeline config must be reviewed before it is applied

**Log events to spot:**
```
[repo-analyser]       APPROVE — Node 20, pnpm, GitHub Actions runner detected
[pipeline-designer]   RETRY 1/1 — ubuntu-latest runner missing required capability
[secrets-rotator]     ⚠ PII scrubbed × 5 (API_KEY, DB_URL, JWT, WEBHOOK_SECRET, S3_KEY)
[test-config]         ESCALATE — 3 flaky tests detected (non-deterministic timing)
[deploy-configurator] Waiting for barrier pipeline-ready
[deploy-configurator] ⏸ Paused — pipeline config ready for human review
```

---

### 17 — Living Documentation

**Project type:** Auto-generated documentation synced to codebase  
**Run:** `pnpm demo:17`  
**DAG:** `agents/demos/17-living-documentation/living-documentation.dag.json`

| Lane | Depends on | Behaviour | What to watch |
|------|-----------|-----------|---------------|
| `code-scanner` | — | APPROVE — source scan with PII scrub on JSDoc author emails | PII scrub |
| `schema-extractor` | `code-scanner` | APPROVE — OpenAPI schema extraction from route handlers | Schema derivation |
| `doc-generator` | `schema-extractor` | APPROVE / RETRY — doc generation; RETRY × 1 when output exceeds size → chunked | Size-triggered RETRY |
| `example-builder` | `doc-generator` | APPROVE / HANDOFF — code examples; HANDOFF to frontend specialist for UI examples | HANDOFF to specialist |
| `publisher` | `example-builder` | `needs-human-review` — publish gate; human sign-off before docs are deployed | Accuracy gate |

**Key concepts demonstrated:**
- PII scrubbing on author emails embedded in JSDoc `@author` tags before codebase context flows downstream
- RETRY with chunking on `doc-generator` when generated docs exceed token size limit
- HANDOFF from `example-builder` to a frontend specialist for UI component examples (outside scope of doc lane)
- Human accuracy gate on `publisher` — prevents inaccurate docs from reaching users

**Log events to spot:**
```
[code-scanner]    ⚠ PII scrubbed — 6 @author email addresses redacted
[schema-extractor] APPROVE — 18 endpoints extracted, 5 schemas derived
[doc-generator]   RETRY 1/1 — output size 48KB > 32KB limit, switching to chunked mode
[example-builder] HANDOFF → frontend-specialist (UI component examples out of scope)
[publisher]       ⏸ Paused — awaiting human accuracy sign-off before deploy
```

---

### 18 — Multitenant Hardening

**Project type:** SaaS multi-tenancy security audit and compliance sign-off  
**Run:** `pnpm demo:18`  
**DAG:** `agents/demos/18-multitenant-hardening/multitenant-hardening.dag.json`

| Lane | Depends on | Behaviour | What to watch |
|------|-----------|-----------|---------------|
| `tenant-model-analyser` | — | APPROVE — tenant model topology scan | Baseline |
| `isolation-auditor` | `tenant-model-analyser` | APPROVE / ESCALATE — cross-tenant isolation check; **immediate ESCALATE** if data leak detected | Critical ESCALATE |
| `permission-matrix` | `isolation-auditor` | APPROVE — RBAC matrix per tenant tier | Parallel path |
| `secrets-vaulter` | `isolation-auditor` | APPROVE — per-tenant secrets migration; ×4 PII scrubs | Parallel + PII scrub |
| `audit-trail` | both (`permission-matrix` + `secrets-vaulter`) + `security-complete` barrier | APPROVE — immutable audit log entries generated | Barrier sync |
| `compliance-sign-off` | `audit-trail` | `needs-human-review` — GDPR/SOC 2 review; human sign-off required | Compliance gate |

**Key concepts demonstrated:**
- Immediate ESCALATE on `isolation-auditor` on cross-tenant data leak — no retry, no fallback
- `security-complete` hard barrier: `audit-trail` waits until both `permission-matrix` and `secrets-vaulter` complete
- ×4 PII scrub events in `secrets-vaulter` — one per per-tenant secret migrated to vault
- GDPR/SOC 2 compliance gate at the end — no human, no sign-off

**Log events to spot:**
```
[tenant-model-analyser] APPROVE — 3 tenant tiers mapped (free, pro, enterprise)
[isolation-auditor]     ESCALATE — cross-tenant query detected in reports endpoint
[permission-matrix]     APPROVE — RBAC matrix: 12 roles × 3 tiers
[secrets-vaulter]       ⚠ PII scrubbed × 4 (per-tenant API keys migrated to vault)
[audit-trail]           Waiting for barrier security-complete
[compliance-sign-off]   ⏸ Paused — GDPR/SOC 2 sign-off required
```

---

## Verdict reference

| Verdict | Trigger condition | Engine action |
|---------|------------------|---------------|
| `APPROVE` | All expect rules pass | Lane marked `completed`; contracts published |
| `RETRY` | Expect rule fails; `retryBudget > 0` | Lane re-executes with `retryInstructions` injected |
| `HANDOFF` | `onFail: "HANDOFF"` rule; budget exhausted | Partial result + context forwarded to `targetLaneId` |
| `ESCALATE` | Budget exhausted or explicit rule | `EscalationError` thrown; lane marked `escalated`; DAG continues |

## Checkpoint mode reference

| Mode | Description |
|------|-------------|
| `self` | Standard single-lane checkpoint; no cross-lane coordination |
| `read-contract` | Waits for a named lane's contract snapshot before evaluating |
| `soft-align` | Rendezvous with a partner lane; `timeoutMs` + `fallback` if partner is late |
| `hard-barrier` | Blocking sync — all `waitFor` participants must commit before any can proceed |
| `needs-human-review` | Pauses execution; operator input required when `--interactive` flag is set |

---

## Mock mode vs real LLM mode

| Behaviour | Mock mode | Real LLM mode |
|-----------|-----------|---------------|
| `llm-generate` / `llm-review` | Always returns 1+ finding | Returns model-generated content |
| `file-exists` (missing file) | Finding `❌ …` — consistently fails | Same — file system check is not LLM-dependent |
| RETRY recovery | **Cannot recover** — file system doesn't change | Model receives `retryInstructions`; may produce correct output |
| `minFindings: 1` | Always PASSES | Passes unless model returns empty |
| Cost | **$0.00** | Depends on model + token count |

> In mock mode, every RETRY on a `file-exists` check will exhaust its `retryBudget`
> and ESCALATE.  This is **by design** — it demonstrates the retry + escalation
> mechanism clearly without needing a live codebase.  The supervisor comments in each
> file explain what a real LLM would do differently.

---

## File layout

```
agents/demos/
├── model-router.json                  ← Shared mock-only router (zero cost)
├── plan-seeds/
│   ├── app-boilerplate/discovery.json ← Pre-answered Phase 0 for plan demo 01
│   ├── enterprise-skeleton/           ← Plan demo 02
│   ├── website/                       ← Plan demo 03
│   ├── feature-in-context/            ← Plan demo 04
│   └── mvp-sprint/                    ← Plan demo 05
├── 01-app-boilerplate/                ← 5 lanes
├── 02-enterprise-skeleton/            ← 7 lanes
├── 03-website-build/                  ← 4 lanes
├── 04-feature-in-context/             ← 5 lanes
├── 05-mvp-sprint/                     ← 6 lanes
├── 06-resilience-showcase/            ← 8 lanes (all independent)
├── 07-pr-review/                  ← 4 lanes (parallel audit + fan-in)
├── 08-zero-to-deployed/           ← 6 lanes, hard-barrier
├── 09-security-audit/             ← 5 lanes (OWASP + CVE + secrets)
├── 10-incident-autopilot/         ← 6 lanes, HANDOFF, human gate
├── 11-app-bootstrapper/           ← 6 lanes, double human gate
├── 12-feature-in-context/         ← 6 lanes, PII scrub, ESCALATE
├── 13-dev-onboarding/             ← 5 lanes, chunked RETRY, HANDOFF
├── 14-tech-migration-advisor/     ← 6 lanes, hard ESCALATE, fan-in gate
├── 15-data-migration-critical/    ← 7 lanes, rollback, hard barrier
├── 16-cicd-pipeline-builder/      ← 5 lanes, hard barrier, bulk PII
├── 17-living-documentation/       ← 5 lanes, chunked docs, HANDOFF
├── 18-multitenant-hardening/      ← 6 lanes, hard barrier, compliance gate
├── 19-eval-pipeline/                  ← 4 lanes  IP-03
├── 20-pause-resume-workflow/          ← 4 lanes  IP-01
└── 21-budget-controlled-run/          ← 5 lanes  IP-08

scripts/
├── demo.js                            ← Original 3-lane demo
├── run-scenarios.js                   ← Advanced scenario runner (this guide)
└── plan-demo.js                       ← 5-phase plan demo runner
```

---

## IP Demo Scenarios

### 19 — Eval Pipeline & Quality Flywheel

**IP:** IP-03  
**Run:** `node scripts/demo.js agents/demos/19-eval-pipeline/eval-pipeline.dag.json`  
**DAG:** `agents/demos/19-eval-pipeline/eval-pipeline.dag.json`

| Lane | Depends on | What it does |
|------|-----------|-------------|
| `content-generate` | — | Writes a 400-word blog post section |
| `eval-judge` | `content-generate` | LLM-as-judge scores clarity, completeness, accuracy (1–5 each) |
| `golden-compare` | `content-generate` | Semantic-similarity diff against a golden reference |
| `ci-gate` | `eval-judge` + `golden-compare` | Aggregates scores → `PASS` / `WARN` / `FAIL` decision |

**Key concepts demonstrated:**
- Parallel scoring lanes (`eval-judge` and `golden-compare` run simultaneously)
- Structured JSON output validation in supervisor checkpoints
- CI gate pattern: accept only when overall score ≥ 3.5 and no regression

---

### 20 — Long-Running Checkpoint Workflow (Pause/Resume)

**IP:** IP-01  
**Run:** `node scripts/demo.js agents/demos/20-pause-resume-workflow/pause-resume.dag.json`  
**DAG:** `agents/demos/20-pause-resume-workflow/pause-resume.dag.json`

| Lane | Depends on | What it does |
|------|-----------|-------------|
| `ingest` | — | Validates and ingests a synthetic Q4 2024 sales dataset (10 rows) |
| `analyze` | `ingest` | Pattern detection, top performers, anomaly flagging — checkpoint saved here |
| `synthesize` | `analyze` | Executive narrative + 3 prioritized recommendations |
| `report` | `synthesize` | Renders final board-ready Markdown report |

**Key concepts demonstrated:**
- Sequential pipeline with per-supervisor checkpoints — any lane can be paused
- `checkpoint_note` field lets supervisors confirm their state is serializable
- The `analyze` lane has `retryBudget: 2` and two checkpoint steps, showing multi-step supervisor phases
- A real pause would serialize the `analyze` lane state (messages + cost) to `run_checkpoints` and allow exact-position resume

---

### 21 — Budget-Controlled Content Sprint

**IP:** IP-08  
**Run:** `node scripts/demo.js agents/demos/21-budget-controlled-run/budget-sprint.dag.json`  
**DAG:** `agents/demos/21-budget-controlled-run/budget-sprint.dag.json`

| Lane | Depends on | What it does |
|------|-----------|-------------|
| `market-research` | — | Top 3 market trends, TAM estimate, pain points |
| `competitor-scan` | — | 5-competitor analysis with enterprise scores |
| `audience-profile` | — | 3 ICP personas with buying criteria and deal sizes |
| `strategy` | all 3 above | Synthesizes inputs into Q1 content strategy + cost breakdown |
| `budget-gate` | `strategy` | Adds projected cost to MTD spend — issues `APPROVE` / `WARN` / `SUSPEND` |

**Key concepts demonstrated:**
- 3-way parallel research fan-out — all three research lanes run simultaneously
- `metadata.costCenter`, `teamName`, and `projectTag` on the DAG — shows run attribution
- Budget gate logic: MTD=$320, cap=$500, warn at 80%=$400; strategy cost determines the decision
- Structured `budget_decision` output shows `utilization_pct` and `alert_message`

---

### 22 — Observability Surface Deep-Dive

**IP:** IP-11  
**Run:** `node scripts/demo.js agents/demos/22-observability-surface/observability.dag.json`  
**DAG:** `agents/demos/22-observability-surface/observability.dag.json`

| Lane | Depends on | What it does |
|------|-----------|-------------|
| `generate-load` | — | Simulates 50 DAG runs across 3 DAGs and 4 model tiers (Mock provider) |
| `spans-analysis` | `generate-load` | Queries the `spans` table — identifies slowest lanes and highest-cost models |
| `heatmap-report` | `spans-analysis` | Generates token-efficiency heatmap summary (output/input ratios per model) |
| `export-otlp` | `heatmap-report` | Validates OTLP export payload structure for Datadog + Grafana Tempo |

**Key concepts demonstrated:**
- How spans are stored (`spans` table, `attributes` JSONB) and queried
- Token efficiency metric: `output_tokens ÷ input_tokens` ratio per model tier
- OTLP export payload format — trace ID, span ID, parent span, resource attributes
- CostDrilldownTable drill-down pattern: KPI total → per-run breakdown
