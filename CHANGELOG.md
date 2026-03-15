# Changelog

All notable changes to the ai-agencee / ai-kit monorepo are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.2.0] — 2026-03-16

### Added — IP Implementation Series (11 plans)

#### IP-01 · State Persistence + Pause/Resume
- `run_checkpoints` PostgreSQL table — full supervisor state (messages, tool_calls, cost) serialized per phase
- `PATCH /runs/:id/pause` and `PATCH /runs/:id/resume` REST endpoints
- `CheckpointTimeline` component in `RunDetailPage` — per-lane checkpoint progress
- Optimistic Redux state with rollback on API error
- Resume logic skips already-completed lanes automatically

#### IP-02 · SSO / SAML 2.0 / OIDC
- SAML 2.0 IdP-initiated and SP-initiated flows via `passport-saml`
- OIDC Authorization Code Flow with PKCE
- Connectors for Okta, Azure AD, Google Workspace
- `/settings/sso` provisioning page with attribute-mapping UI
- Just-in-time user provisioning on first SSO login
- Issues the same short-lived access + refresh JWT pair as password auth

#### IP-03 · Eval Pipeline & Quality Flywheel
- `lane_evals` table — LLM-as-judge scores (clarity, completeness, accuracy) per lane run
- `eval-harness.ts` — concurrent case execution, 0–1 scoring, `EvalReport` JSON output
- Golden output store — hand-curate examples, version-controlled
- CI eval gate — rejects merges when average lane score drops below threshold
- Fine-tuning export (JSONL) + distillation pipeline for teacher → student
- Lane scorecard panel in `RunDetailPage`

#### IP-04 · GitHub Webhook Triggers + Cron
- `webhook_triggers` and `cron_triggers` tables
- HMAC-SHA256 signature verification on all incoming GitHub webhooks
- Event → DAG route table: `push`, `pull_request`, `issues`, `workflow_run`
- Cron expression parser + job scheduler
- Trigger management UI in settings

#### IP-05 · AI Run Diagnostics
- `DiagnosticCard` component in `RunDetailPage` — one-click root-cause analysis
- Structured output: `root_cause`, `affected_lanes[]`, `fix_suggestions[]`
- Reads audit log + lane evals + checkpoint state for context
- Run comparison mode — diff two runs on the same DAG
- DAG linter integration: surfaces `LINT001`–`LINT005` violations in UI
- Streaming SSE diagnosis delivery

#### IP-06 · Python SDK (Async + LangChain)
- `AiAgenceeClient` — async/await `run_dag()`, `pause()`, `resume()`, `get_run()`
- `LangChainDagTool` — wraps any DAG as a `langchain.tools.BaseTool`
- `LangGraphDagNode` — embed DAG runs as LangGraph graph nodes
- Type-safe Python DAG builder (dataclasses mirroring TypeScript schema)
- pytest fixtures for hermetic integration tests

#### IP-07 · Framework Connectors (`packages/connectors`)
- LangGraph compiled graph → DAG JSON import
- DAG lane → LangGraph node export
- CrewAI Crew → DAG import; DAG lane → CrewAI Task export
- AutoGen `GroupChat` → multi-lane DAG mapping
- Semantic Kernel planner ↔ DAG round-trip adapter
- Preserves supervisor checkpoints and barrier semantics across formats

#### IP-08 · Budget Forecasting + Cost Allocation
- `cost_center`, `team_name`, `project_tag` attribution on every run
- `budget_alerts` table with configurable warn (80%) and hard (100%) thresholds
- `ForecastCard` — linear regression spend projection for current month
- `SpendBarChart` — daily spend bars with 30-day moving average
- `CostBreakdownTable` — per-team/cost-center attribution with % share
- Budget gate: warn at threshold, suspend at cap

#### IP-09 · Domain Agents — 6 Production-Ready
- `security-review` — OWASP Top-10 guided analysis with CVSS scoring
- `dependency-audit` — outdated, vulnerable, and unlicensed package triage
- `pr-description` — structured PR summaries with impact classification
- `documentation` — JSDoc, README, and changelog generation from source
- `accessibility` — WCAG 2.2 AA compliance check
- `database` — schema migration adviser and query optimizer

#### IP-10 · DAG Editor — Visual + AI-Assisted
- AI Compose mode — describe a workflow in natural language, get valid DAG JSON
- Template gallery — 12 curated starting-point DAGs
- Version history — snapshot on every save, diff any two versions side-by-side
- Simulation mode — replay run events inside the editor with mock data
- Live execution overlay — SSE-powered real-time lane status on the canvas
- `dag_versions` PostgreSQL table for version persistence

#### IP-11 · Observability Surface
- `spans` PostgreSQL table — full attribute JSONB per LLM/tool/barrier span
- `SpanFlamechart` — per-run timeline of every lane + LLM call
- Token efficiency heatmap — output/input ratio by model × week
- `CostDrilldownTable` — click-through from KPI card to per-run detail
- OTLP trace export to Datadog, Grafana Tempo, New Relic, Honeycomb
- Spans page with date-range, DAG, and severity filters

### Added — Demos
- Demo 19 `agents/demos/19-eval-pipeline/` — Eval Pipeline quality flywheel (4 lanes: generate → judge + golden-compare → CI gate)
- Demo 20 `agents/demos/20-pause-resume-workflow/` — Long-running checkpoint workflow demonstrating pause/resume (4 sequential lanes)
- Demo 21 `agents/demos/21-budget-controlled-run/` — Budget-controlled content sprint (3 parallel research lanes → strategy → budget gate)

### Fixed — Audit Pass (architecture/convention/compilation)
- Converted 5 `class … extends Error` to PROTO pattern: `EscalationError`, `RbacDeniedError`, `RateLimitExceededError`, `PromptInjectionError`, `CircuitBreakerOpenError`
- Converted `class DagEventBus extends EventEmitter` to `createDagEventBus()` factory with fully typed `on`/`once`/`removeListener` overloads
- Fixed `issue-sync.test.ts` and `notification-sink.test.ts`: `new DagEventBus()` → `createDagEventBus()`
- Fixed `dag-linter.test.ts`: added missing `timeoutMs: 30_000` to all 5 `GlobalBarrier` fixtures
- Fixed `RunStatusBadge.tsx`: added `paused` status to `STATUS_MAP` and `LABELS`
- Fixed `SettingsPage.tsx`: inline `style={{ color: 'var(--accent)' }}` → `className="text-(--accent)"`
- Fixed `SpanFlamechart.tsx`: inline `style={{ minWidth: 160 }}` → `className="min-w-40"`
- Fixed `ErrorBoundary.tsx`: class renamed `ErrorBoundaryImpl` (internal), added functional `export function ErrorBoundary` wrapper
- Fixed KPI test fixtures: added missing `outcomeRate: []` to all `fetchKpiSucceeded` payloads
- All 4 packages compile cleanly after fixes: `agent-executor`, `ai-agencee-cloud`, `dag-editor`, `cloud-api`

---

## [1.1.0] — 2026-02-14

### Added
- MCP Server (`@ai-agencee/mcp@1.2.0`) — 5 tools: `@init`, `@check`, `@rules`, `@patterns`, `@bootstrap`
- MCP SSE live API — OIDC-protected `/events` endpoint for real-time event streaming
- Codernic (E14) — codebase-aware coding agent: 449 files/1.03s, FTS5 symbol search, incremental indexing, 581 tests
- Run advisor (E13) — 6 recommendation types, `ai-kit advise` CLI command
- Jira/Linear sync (E11) — subscribes to `DagEventBus`, creates issues on `dag:end` failure
- Slack/Teams notifications (E12) — incoming webhook, `failuresOnly`/`notifyLaneEnd`/`notifyBudget` options
- Python MCP bridge (E9) — JSON-RPC 2.0 over stdio, `PythonMcpProvider` LLM adapter
- Vector memory (M-01/M-02) — in-memory cosine similarity store + SQLite persistence
- Context manager — sliding-window token budget for long lane conversations
- Prompt distillation (DX-07) — few-shot example injection via `PromptRegistry`
- Code execution sandbox (DX-08) — JS/TS/Python/Bash; temp-file isolation; configurable kill signal
- LLM-as-judge eval harness (DX-09) — `runEval()`, concurrent cases, 0–1 scoring
- AWS Bedrock provider (P-05) — SigV4 auth, Converse API, auto-registered on AWS creds
- VS Code LM provider (P-06) — `lm.selectChatModels` sampling
- GitHub webhook trigger (I-01) — HMAC-SHA256 verification, event → DAG route table

### Changed
- `@ai-agencee/cli` bumped to `1.4.1`
- `@ai-agencee/mcp` bumped to `1.3.5`
- `packages/connectors` introduced at `0.1.0`

---

## [1.0.0] — 2025-12-01

### Added — Core Engine
- DAG Orchestrator — parallel lane execution, dependency resolution, barrier sync, retry budget, cost tracking
- Lane Executor — per-lane LLM loop, check runner, checkpoint → supervisor → verdict cycle
- Intra-Lane Supervisor — APPROVE / RETRY / HANDOFF / ESCALATE verdicts
- DAG Event Bus — typed `EventEmitter` with `dag:start`, `dag:end`, `lane:*`, `checkpoint:complete`, `llm:call`, `token:stream`, `budget:exceeded`
- Model Router — JSON-driven tier routing (haiku/sonnet/opus), per-lane overrides
- Cost Tracker — per-run USD accumulation, per-lane breakdown
- Barrier Coordinator — hard barriers (block) and soft barriers (align) with per-barrier timeout
- Tool Executor — `read-file`, `write-file`, `run-command`, `search-files`
- Mock Provider — zero-API-key scripted responses with word-streaming simulation
- 11 check handlers: `file-exists`, `dir-exists`, `count-files`, `count-dirs`, `grep`, `json-has-key`, `json-field`, `run-command`, `llm-review`, `llm-generate`, `llm-tool`
- Providers: Anthropic, OpenAI, Ollama, Gemini
- RBAC — file-based `.agents/rbac.json`, role → permissions, `assertCan()`
- Audit log — append-only NDJSON, SHA-256 hash-chain, `AuditLog.verify()`
- PII scrubbing — 10 built-in patterns, `warn`/`block` mode, transparent wrapping
- Multi-tenant isolation — per-tenant path-isolated run roots, GDPR export/delete CLI
- OIDC JWT auth — RS256/ES256 Bearer validation on MCP SSE `/events`
- Rate limiting — per-principal `tokenBudgetPerDay`, `maxConcurrentRuns`, `maxRunsPerHour`
- DAG visualizer — Mermaid + Graphviz DOT output from DAG JSON
- Prompt injection detection — 10 signature families, confidence scoring, `warn`/`block` mode
- 5-Phase Plan System — BA discovery → synthesis → decomposition → wiring → DAG handoff
- TypeScript DAG Builder API — fluent `DagBuilder` + `LaneBuilder`
- Plugin system — `CheckHandlerRegistry.discover()`, `ai-kit-plugin-*` packages
- JSON Schema / IDE support — IntelliSense for `*.dag.json` and `*.agent.json`
- CLI commands: `plan`, `agent:dag`, `visualize`, `data:export/delete/list-tenants`, `advise`, `benchmark`, `mcp`, `init`, `sync`, `check`
- 18 demo DAG scenarios (01–18) with mock provider
