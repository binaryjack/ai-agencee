# @tadeo/ai-starter-kit

> **Enterprise-grade multi-agent orchestration engine** — DAG-supervised parallel agents with streaming LLM output, intelligent model routing, resilience patterns, cost tracking, RBAC, audit logging, and a zero-API-key demo mode.

**Status**: ✅ Production-Ready | **Tests**: 324 passing | **Enterprise Features**: E1-E7 complete

---

## What this is

`ai-starter-kit` is a TypeScript monorepo that turns JSON-defined agent graphs into production-ready AI workflows with enterprise-grade security, compliance, and observability.

It ships two separate execution paths that compose seamlessly:

| Path | Entry | When to use |
|---|---|---|
| **DAG Engine** | `agent:dag <dag.json>` | Parallel multi-lane analysis / review / generation with supervised checkpoints |
| **Plan System** | `plan` interactive CLI | Discovery → Sprint planning → Architecture decisions → DAG hand-off |

**Full Documentation**: Start with [📚 Features Index](docs/features/INDEX.md) for all capabilities.

---

## Core Capabilities

### 🎯 Orchestration & Execution
- **[DAG Orchestration](docs/features/01-dag-orchestration.md)** — Declarative JSON-based DAG with parallel lanes, barriers, and supervisor checkpoints
- **[Streaming Output](docs/features/05-streaming-output.md)** — Real-time token-by-token feedback from LLM providers
- **[Resilience Patterns](docs/features/07-resilience-patterns.md)** — Exponential backoff retry, circuit breakers, graceful fallbacks
- **[Model Routing & Cost](docs/features/03-model-routing-cost.md)** — Intelligent provider selection, budget enforcement, cost tracking
- **[Tool-Use Integration](docs/features/06-tool-use.md)** — Agents calling functions within LLM turns with supervisor approval

### 🔐 Enterprise & Security
- **[Authentication & RBAC](docs/features/09-rbac-auth.md)** — Role-based access control with OIDC JWT support
- **[Audit Logging](docs/features/10-audit-logging.md)** — Immutable hash-chained audit trails for compliance
- **[Multi-Tenant Isolation](docs/features/11-multi-tenant.md)** — Per-tenant data isolation and run sandboxing
- **PII Scrubbing** — Automatic detection and redaction of sensitive data
- **Rate Limiting** — Token budget and concurrent run limits per principal

### 📊 Observability
- **[Event Bus](docs/features/08-event-bus.md)** — Typed real-time event subscriptions for lane status, tokens, costs
- **DAG Visualizer** — Mermaid and DOT output for architecture visualization
- **Cost Analytics** — Per-run and per-principal cost breakdowns

### 👨‍💻 Developer Experience
- **[TypeScript Builder API](docs/features/13-dag-builder-api.md)** — Fluent, type-safe DSL for DAG construction
- **[CLI Commands](docs/features/15-cli-commands.md)** — Full command reference with examples
- **[MCP Integration](docs/features/16-mcp-integration.md)** — VS Code and Claude Desktop support

---

## Packages

| Package | Description | Docs |
|---|---|---|
| `packages/agent-executor` | Core engine: DAG orchestrator, supervised agents, model router, resilience, RBAC, audit logging | [Agent Executor Docs](docs/features/01-dag-orchestration.md) |
| `packages/cli` | `ai-kit` CLI — `init`, `sync`, `check`, `agent:dag`, `plan`, `visualize`, `data` | [CLI Reference](docs/features/15-cli-commands.md) |
| `packages/core` | Shared filesystem utilities, template scaffolding, event types | [Features Index](docs/features/INDEX.md) |
| `packages/mcp` | VS Code MCP bridge, OIDC auth middleware, SSE server, GitHub Copilot routing | [MCP Integration](docs/features/16-mcp-integration.md) |

---

## Quick Start

### 1. Install & Build

```sh
pnpm install
pnpm build
```

### 2. Run the Zero-Key Demo

```sh
# Run the 3-lane demo — NO API keys required
pnpm demo
```

The demo spins up three parallel lanes (code-review, security-scan, summary) using the mock provider with real-time streaming output.

**📖 See**: [Demo Mode Guide](docs/features/25-demo-mode.md)

### 3. Run a Real DAG

```sh
# With Anthropic
ANTHROPIC_API_KEY=sk-... pnpm run:dag agents/dag.json

# With OpenAI
OPENAI_API_KEY=sk-... pnpm run:dag agents/dag.json

# Force a specific provider
pnpm run:dag agents/dag.json --provider anthropic

# Mock provider (no key needed, great for CI)
pnpm run:dag agents/dag.json --provider mock
```

**📖 See**: [DAG Orchestration](docs/features/01-dag-orchestration.md), [CLI Reference](docs/features/15-cli-commands.md)

---

## Model Routing & Cost Control

Intelligent routing automatically selects the optimal model tier based on task complexity and budget constraints.

Configuration: [`agents/model-router.json`](agents/model-router.json)

| Task type | Family | Anthropic model | OpenAI model | Cost /1M tokens |
|---|---|---|---|---|
| `file-analysis` | haiku | claude-haiku-4-5 | gpt-4o-mini | $0.80 |
| `code-generation` | sonnet | claude-sonnet-4-5 | gpt-4o | $3.00 |
| `code-review` | sonnet | claude-sonnet-4-5 | gpt-4o | $3.00 |
| `architecture-decision` | opus | claude-opus-4-5 | gpt-4o | $15.00 |
| `security-review` | opus | claude-opus-4-5 | gpt-4o | $15.00 |

**Key Features**:
- ✅ Per-run budget enforcement
- ✅ Fallback to cheaper models when budget-constrained
- ✅ Real-time cost tracking per check and lane
- ✅ Cost attribution per principal (user/service)

**📖 See**: [Model Routing & Cost Tracking](docs/features/03-model-routing-cost.md)

---

## Check Handler Types

Agents compose any mix of these typed checks:

| Type | Description | Use Case |
|---|---|---|
| `file-exists` | Assert a file path is present | Pre-flight validation |
| `dir-exists` | Assert a directory exists | Pre-flight validation |
| `count-files` / `count-dirs` | Count files matching a glob | Coverage analysis |
| `grep` | Regex search inside text files | Pattern matching |
| `json-field` / `json-has-key` | JSON schema / value assertions | Data validation |
| `run-command` | Execute shell command, inspect stdout/exit code | System integration |
| `llm-generate` | LLM generation with streaming output | Content creation |
| `llm-review` | LLM review / critique with streaming output | Analysis & feedback |

**📖 See**: [Check Handlers & Validators](docs/features/04-check-handlers.md), [Tool-Use Integration](docs/features/06-tool-use.md)

---

## Resilience & Reliability

All LLM provider calls are protected by intelligent retry and circuit breaker patterns:

### Retry Policy
- **Exponential backoff** with jitter to prevent thundering herd
- **Configurable retry conditions** — 429/500/503 transient errors by default
- **Preset**: 4 attempts, 1s → 32s max delay
- **Respects Retry-After headers** from providers

### Circuit Breaker
- **CLOSED → OPEN → HALF_OPEN** state machine per provider
- **5-failure threshold** to trigger opening
- **60s cooldown** before attempting recovery
- **Per-provider stats** for observability

**📖 See**: [Resilience Patterns](docs/features/07-resilience-patterns.md)

---

## Real-Time Streaming Output

Every `llm-generate` and `llm-review` check streams tokens directly to `process.stdout` as they arrive.

**Supported Providers**:
- ✅ Anthropic (SSE)
- ✅ OpenAI (SSE + `stream_options`)
- ✅ VS Code Copilot (fallback to complete)
- ✅ Mock (word-level simulation)

**📖 See**: [Streaming Output & Real-Time Feedback](docs/features/05-streaming-output.md)

---

## Enterprise Features (E1–E7)

All implemented and enforced at runtime:

| ID | Feature | Status | Details |
|----|---------|--------|----------|
| **E1** | PII Scrubbing | ✅ Active | Automatic detection and redaction via regex patterns |
| **E2** | Security Audit | ✅ Active | CI/CD scanning via GitHub Actions on every push |
| **E3** | Multi-Tenant | ✅ Active | Path-isolated run roots per tenant ID |
| **E4** | GDPR Data CLI | ✅ Active | `data:export`, `data:delete`, `data:list-tenants` |
| **E5** | OIDC JWT Auth | ✅ Active | RS256/ES256 Bearer token validation on SSE events |
| **E6** | Rate Limiting | ✅ Active | Token budget + concurrent run limits per principal |
| **E7** | DAG Visualizer | ✅ Active | Mermaid + DOT output for architecture visualization |

**📖 See**: [Enterprise Readiness](docs/enterprise-readiness.md), [Authentication & RBAC](docs/features/09-rbac-auth.md), [Audit Logging](docs/features/10-audit-logging.md)

---

## Plan System (5-Phase Interactive Discovery)

```
Phase 0  Discovery       → BA questionnaire, saved to .agents/plan-state/discovery.json
Phase 1  Synthesize       → LLM produces PlanDefinition → plan.json
Phase 2  Decompose/Backlog → Sprint planning board → backlog.json
Phase 3  Wire/Arbiter     → Cross-agent decisions → decisions.json
Phase 4  DAG Hand-off     → Auto-generates dag.json + runs the DAG engine
```

Start the interactive plan session:

```sh
pnpm run:plan
```

---

## Documentation

Comprehensive feature guides are available in [`docs/features/`](docs/features/INDEX.md):

**Core Features**
- [DAG Orchestration & Execution](docs/features/01-dag-orchestration.md)
- [Agent Types & Roles](docs/features/02-agent-types-roles.md)
- [Model Routing & Cost Tracking](docs/features/03-model-routing-cost.md)
- [Check Handlers & Validators](docs/features/04-check-handlers.md)

**Advanced Execution**
- [Streaming Output](docs/features/05-streaming-output.md)
- [Tool-Use Integration](docs/features/06-tool-use.md)
- [Resilience Patterns (Retry & Circuit Breaker)](docs/features/07-resilience-patterns.md)
- [Event Bus & Real-Time Events](docs/features/08-event-bus.md)

**Enterprise & Security**
- [Authentication & RBAC](docs/features/09-rbac-auth.md)
- [Audit Logging & Compliance](docs/features/10-audit-logging.md)
- [Multi-Tenant Isolation](docs/features/11-multi-tenant.md)
- [PII Scrubbing & Injection Defense](docs/features/12-pii-security.md)

**Developer Tools**
- [TypeScript DAG Builder API](docs/features/13-dag-builder-api.md)
- [Plugin System & Custom Checks](docs/features/14-plugin-system.md)
- [CLI Commands Reference](docs/features/15-cli-commands.md)
- [MCP Integration](docs/features/16-mcp-integration.md)

**📚 Full Index**: [All Features](docs/features/INDEX.md)

---

## Development

```sh
pnpm install          # install all workspace deps
pnpm build            # compile all packages (tsc)
pnpm test             # run all Jest suites (324 tests)
pnpm demo             # build + run the mock demo
pnpm run:plan         # start interactive planning session
pnpm run:dag agents/dag.json      # execute a DAG
pnpm visualize agents/dag.json    # output Mermaid/DOT diagram
```

---

## Roadmap

**Completed (E1–E7)**: PII scrubbing, security CI, multi-tenant, GDPR data CLI, OIDC auth, rate limiting, DAG visualizer

**Planned (E8–E14)**: Prompt injection detection, Python MCP bridge, AWS Bedrock, Jira/Linear sync, Slack/Teams notifications, auto-tuning, visual DAG editor

**📖 See**: [Enterprise Readiness](docs/enterprise-readiness.md) for detailed roadmap

---

## License

MIT — see [LICENSE](LICENSE).
---

## Support & Resources

- 📚 **Full Documentation**: [docs/features/INDEX.md](docs/features/INDEX.md)
- 🚀 **Getting Started**: [docs/features/25-demo-mode.md](docs/features/25-demo-mode.md)
- 📋 **Enterprise Readiness**: [docs/enterprise-readiness.md](docs/enterprise-readiness.md)
- 🏗️ **Architecture**: [agents/](agents/)