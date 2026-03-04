# Improvement Roadmap — Enterprise Killer App

> Verified against actual source as of 2026-03-04.
> No speculation. Every gap listed maps to a specific file or missing file.

---

## 0. Corrections to Previous Analysis

The earlier analysis contained inaccuracies. Record corrected.

| Claim | Verdict | Evidence |
|-------|---------|----------|
| "Agents don't call LLMs" | **WRONG** | `check-runner.ts` l.241-330: `llm-generate` and `llm-review` are fully wired via `modelRouter.route()` |
| "Prompts not connected to executor" | **WRONG** | `prompt-registry.ts` loads `*.prompt.md` with YAML frontmatter; `PromptRegistry.resolve(agent, family)` exists |
| "No streaming" | CONFIRMED | All `LLMProvider.complete()` calls return a resolved `Promise<LLMResponse>` — no `ReadableStream` |
| "No tool use" | CONFIRMED | No `tools` field in any `LLMPrompt`; providers use plain messages only |
| System is simple DAG only | **WRONG** | `plan-orchestrator.ts` orchestrates **5 fully implemented phases**: Discover → Synthesize → Decompose → Wire → Execute |
| "Human review is basic" | **WRONG** | `HumanReviewGate` is an injectable interface with `InteractiveHumanReviewGate` and `AutoApproveHumanReviewGate` |
| "StateStore not persistent" | **WRONG** | `state-store.ts` is a generic file-backed store used by BacklogBoard, DiscoverySession, PlanSynthesizer, Arbiter |

---

## 1. What the System Actually Does (Verified)

```
CLI / MCP
    │
    ▼
PlanOrchestrator (plan-orchestrator.ts)
    │
    ├─ Phase 0: DiscoverySession     — BA interviews user (5 question blocks)
    ├─ Phase 1: PlanSynthesizer      — BA builds step skeleton; user approves
    ├─ Phase 2: PlanSynthesizer      — all agents fill in task backlog
    ├─ Phase 3: Arbiter              — 3-level conflict resolution (BA → Arch → User)
    └─ Phase 4: DagOrchestrator      — topological DAG execution per step
                    │
                    ├─ LaneExecutor (per lane, parallel via Promise.allSettled)
                    │       ├─ SupervisedAgent (async generator, step-by-step)
                    │       │       └─ runCheckStep() per check:
                    │       │               file-exists | dir-exists | count-dirs | count-files
                    │       │               json-field | json-has-key | grep | run-command
                    │       │               llm-generate | llm-review   ← real LLM calls
                    │       ├─ IntraSupervisor → APPROVE / RETRY / HANDOFF / ESCALATE
                    │       ├─ BarrierCoordinator → self / read-contract / soft-align / hard-barrier
                    │       └─ CostTracker → per-call USD accounting + budget cap
                    │
                    ├─ ContractRegistry — versioned cross-lane snapshot store
                    ├─ ModelRouter      — task-type → Haiku/Sonnet/Opus → provider
                    └─ PromptRegistry   — loads agents/prompts/*.prompt.md via YAML frontmatter
```

---

## 2. True Gaps (Verified — No Hallucinations)

### P0 — Blocks production adoption

| # | Gap | Where it hurts | Verified by |
|---|-----|----------------|-------------|
| G-01 | **No streaming output** | Long Opus calls block CLI/MCP for 30–90 s with zero feedback | `llm-provider.ts`: `complete()` returns `Promise<LLMResponse>` only |
| G-02 | **No Anthropic/OpenAI tool-use** | Agents can't read files, run shell, call APIs *inside* an LLM turn | `LLMPrompt` has no `tools` field; providers don't implement tool-use loop |
| G-03 | **Sample agent JSONs use static checks only** | A new user running the flagship `dag.json` never sees a real LLM call | `01-business-analyst.agent.json` through `06-e2e.agent.json`: all `file-exists`, `json-field` etc. |
| G-04 | **No onboarding demo** | Time-to-first-result is undefined; users won't retry | No `pnpm demo` or `scripts/demo.ts`; README shows only old `init/sync/check` CLI |
| G-05 | **README hides the system** | Discovery, Plan, Arbiter, PromptRegistry are invisible at repo root | `README.md` l.1-30: describes only `ai-kit init/sync/check` |

### P1 — Blocks enterprise contracts

| # | Gap | Where it hurts | Verified by |
|---|-----|----------------|-------------|
| G-06 | **No authentication / RBAC** | Multi-user or CI usage has no identity layer | No auth module anywhere in `packages/` |
| G-07 | **No audit trail** | Enterprise requires immutable record of every agent call, cost, and decision | `CostTracker` saves costs; `ArbiterDecision` saves decisions — but no unified tamper-evident log |
| G-08 | **No OpenTelemetry hooks** | No span/trace data; can't plug into Datadog, Grafana, Azure Monitor | No `@opentelemetry/*` in any `package.json` |
| G-09 | **Secrets are raw `process.env`** | No vault integration, no rotation, no scoped secrets per workspace | `llm-provider.ts` l.67: `process.env['ANTHROPIC_API_KEY']` |
| G-10 | **StateStore uses synchronous fs** | Blocks the event loop during plan persist/load in an async runtime | `state-store.ts`: `fs.writeFileSync`, `fs.readFileSync`, `fs.existsSync` |
| G-11 | **No retry back-off** | Rate-limit bursts (429) cause hard failures; `retryBudget: 2` is a count, not a policy | `lane-executor.ts`: retry counter incremented flatly, no delay |
| G-12 | **No circuit breaker on providers** | A dead provider cascades failures across all lanes | No circuit-breaker logic in `ModelRouter` or `LLMProvider` |

### P2 — Competitive differentiation missing

| # | Gap | Where it hurts | Verified by |
|---|-----|----------------|-------------|
| G-13 | **No semantic memory / vector store** | Context cannot `remember` previous runs; each plan starts cold | No embeddings, no vector DB client anywhere |
| G-14 | **No streaming event bus** | Web UI, VS Code Webview, or external consumers can't subscribe to live events | `ChatRenderer` writes directly to `process.stdout`; no event emitter |
| G-15 | **No per-lane provider override** | All lanes share the same default provider from `model-router.json` | `ModelRouter`: single `defaultProvider`; no per-lane field in `LaneDefinition` |
| G-16 | **No event-driven triggers** | Plans only start via manual CLI/MCP; no GitHub PR hook, no file-watch | No webhook server, no `chokidar`, no GitHub Actions integration |
| G-17 | **No visual DAG / plan dashboard** | Operators can't see lane status, cost burn, or checkpoint verdicts live | MCP resources expose results as JSON only; no Webview or web UI |
| G-18 | **No plugin system for check types** | Teams can't register custom check handlers without forking the repo | `check-handler-registry.ts` exists but is internal; no public extension point |
| G-19 | **PromptRegistry not used in PlanSynthesizer** | Phase 1 uses hardcoded inline prompts; `agents/prompts/` files are bypassed | `plan-synthesizer.ts` l.1-60: no `PromptRegistry` import |
| G-20 | **No multi-workspace isolation** | Two concurrent runs write to the same `.agents/` dir and clobber each other | `StateStore` paths are fixed relative to `projectRoot`; no run isolation |

---

## 3. Improvement Plan — Enterprise Killer App

### Sprint 1 — Show it works (P0, 1 week)

**G-03: Wire llm-generate/llm-review into sample agents**

Add a new `agents/demo.dag.json` + `agents/demo-*.agent.json` set that showcases actual LLM calls:

```json
// agents/demo-code-review.agent.json
{
  "name": "Code Reviewer",
  "icon": "🔍",
  "checks": [
    {
      "type": "llm-review",
      "path": "src",
      "taskType": "validation",
      "prompt": "Review the TypeScript source in {path} for code quality, type safety, and architectural issues.",
      "outputKey": "code_review",
      "pass": "✅ Code review complete"
    },
    {
      "type": "llm-generate",
      "taskType": "architecture-decision",
      "prompt": "Based on the findings, suggest the top 3 refactoring priorities.",
      "outputKey": "refactor_plan",
      "pass": "✅ Refactoring plan generated"
    }
  ]
}
```

- Add `pnpm demo` script in root `package.json` that runs this DAG against mock provider
- First run with real API key uses Haiku only (< $0.01)

**G-05: Fix README**

Replace current README with a document that surfaces:
- What the full system is (Plan System, DAG, Agents)
- Three paths: `pnpm demo` / `agent:workflow` / MCP in VS Code
- Cost table from `model-router.json`

**G-04: `pnpm demo` + `pnpm run:plan`**

```jsonc
// root package.json scripts
{
  "demo": "node --import=tsx packages/agent-executor/scripts/demo.ts",
  "run:plan": "ai-kit agent:plan --interactive"
}
```

---

### Sprint 2 — Streaming (G-01, 1 week)

**Add `stream()` alongside `complete()` in all providers**

```typescript
// llm-provider.ts
export interface LLMProvider {
  complete(prompt: LLMPrompt, modelId: string): Promise<LLMResponse>;
  stream(prompt: LLMPrompt, modelId: string): AsyncIterable<string>;   // NEW
  isAvailable(): Promise<boolean>;
}
```

Anthropic:
```typescript
// providers/anthropic.provider.ts  (new file)
async *stream(prompt: LLMPrompt, modelId: string): AsyncIterable<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { /* ... */ },
    body: JSON.stringify({ ...body, stream: true }),
  });
  for await (const chunk of res.body!) {
    // parse SSE, yield text_delta content
  }
}
```

Wire into `runCheckStep` for `llm-generate` and `llm-review`:
```typescript
// check-runner.ts: llm-generate with streaming
for await (const token of modelRouter.stream(taskType, { messages })) {
  process.stdout.write(token);  // live output
  value += token;
}
```

VSCode sampling bridge: use `request.stream` parameter (already in MCP spec).

---

### Sprint 3 — Tool use (G-02, 1 week)

**Add `tools` field to `LLMPrompt` and implement tool-use loop**

```typescript
// llm-provider.ts
export interface LLMTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;  // JSON Schema
}

export interface LLMPrompt {
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  tools?: LLMTool[];   // NEW
}
```

Built-in tools to expose per agent (registered in `check-handler-registry.ts`):
| Tool name | What it does |
|-----------|-------------|
| `read_file` | Read any project file up to 8 KB |
| `list_dir` | List directory contents |
| `run_shell` | Execute a shell command (safe, 30 s timeout) |
| `grep_project` | Search codebase for a pattern |
| `write_file` | Write/append to a project file (gated by supervisor APPROVE) |
| `publish_contract` | Push a typed snapshot to ContractRegistry |

Tool-use loop in `SupervisedAgent.run()`:
```typescript
// supervised-agent.ts
while (hasToolUse(response)) {
  const toolResults = await executeTools(response.toolCalls, projectRoot);
  messages.push({ role: 'user', content: toolResults });
  response = await modelRouter.route(taskType, { messages, tools });
}
```

This is the single biggest gap vs Claude Code and Codex.

---

### Sprint 4 — Observability + Audit (G-07, G-08, 1 week)

**Unified audit log**

```typescript
// lib/audit-log.ts  (new file)
export interface AuditEvent {
  runId: string;
  laneId?: string;
  checkpointId?: string;
  eventType: 'run-start' | 'run-end' | 'lane-start' | 'lane-end'
           | 'checkpoint' | 'verdict' | 'llm-call' | 'tool-call'
           | 'human-review' | 'budget-exceeded' | 'decision';
  actor?: string;      // agent name or 'human'
  payload: unknown;
  costUSD?: number;
  durationMs?: number;
  timestamp: string;
}
```

- Append-only NDJSON file: `.agents/audit/<runId>.ndjson`
- Hash-chain each entry (sha256 of previous hash + entry JSON) for tamper-evidence
- Expose via MCP resource `audit://{runId}`

**OpenTelemetry**

```typescript
// lib/otel.ts  (new file — opt-in, tree-shakeable)
import { trace } from '@opentelemetry/api';
const tracer = trace.getTracer('ai-starter-kit', '1.0.0');

// Wrap DagOrchestrator.execute() in a root span
// Wrap LaneExecutor.run() in a child span
// Add LLM call attributes: model, tokens, cost
```

Add to optional deps: `@opentelemetry/api`, `@opentelemetry/sdk-node`.
Configure via env: `OTEL_EXPORTER_OTLP_ENDPOINT`.

---

### Sprint 5 — Resilience (G-10, G-11, G-12, 1 week)

**Async StateStore**

```typescript
// state-store.ts
export class StateStore<T> {
  async save(data: T): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
  async load(): Promise<T | null> {
    try { return JSON.parse(await fs.readFile(this.filePath, 'utf-8')) as T; }
    catch { return null; }
  }
}
```

**Exponential back-off retry**

```typescript
// lib/retry-policy.ts  (new file)
export interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  multiplier: number;   // default 2
  maxDelayMs: number;   // default 30_000
  jitter: boolean;
}
```

Apply in `LaneExecutor` on `IntraSupervisor.RETRY` verdict and in providers on `429` / `503`.

**Circuit breaker per provider**

```typescript
// lib/circuit-breaker.ts  (new file)
// States: CLOSED → OPEN (after N failures) → HALF_OPEN (after cooldown)
// ModelRouter wraps each provider call through its circuit breaker
// Automatically promotes to next available provider on OPEN
```

---

### Sprint 6 — Plugin system (G-18, 1 week)

**Public check-handler extension API**

```typescript
// packages/agent-executor/src/index.ts — add to exports
export type { CheckHandler } from './lib/checks/check-handler.interface.js';
export { CheckHandlerRegistry } from './lib/checks/check-handler-registry.js';
```

**Usage by third-party plugin:**
```typescript
import { CheckHandlerRegistry } from '@ai-agencee/ai-kit-agent-executor';
CheckHandlerRegistry.register({
  type: 'my-custom-check',
  handle: async (check, projectRoot, router) => ({
    findings: ['custom finding'],
    recommendations: [],
  }),
});
```

**Plugin discovery:** scan `node_modules/@ai-kit-plugin-*/index.js` on startup.

---

### Sprint 7 — Streaming event bus + Dashboard (G-14, G-17, 2 weeks)

**Event emitter on DagOrchestrator**

```typescript
// dag-orchestrator.ts
import { EventEmitter } from 'events';

export interface DagEvent {
  type: 'lane:start' | 'lane:checkpoint' | 'lane:end' | 'llm:token' 
      | 'cost:update' | 'barrier:resolved' | 'dag:end';
  payload: unknown;
}

export class DagOrchestrator extends EventEmitter {
  // emit('lane:start', { laneId }) etc.
}
```

**VS Code Webview panel** (MCP package): Terminal-style live view showing:
- Lane grid with status indicators (running / success / escalated)
- Token cost burn gauge (vs `budgetCap`)
- Checkpoint verdict stream
- Real-time LLM output tokens

**SSE endpoint** for external consumers:
```typescript
// packages/mcp/src/sse-server.ts  (new file)
// GET /events  → text/event-stream
// Replays DagOrchestrator EventEmitter over HTTP SSE
```

---

### Sprint 8 — Auth + Secrets (G-06, G-09, 1 week)

**Secrets provider abstraction**

```typescript
// lib/secrets.ts  (new file)
export interface SecretsProvider {
  get(key: string): Promise<string | undefined>;
}

// Implementations:
//   EnvSecretsProvider      — process.env (current behaviour, default)
//   DotenvSecretsProvider   — .env file via dotenv
//   VSCodeSecretsProvider   — vscode.SecretStorage (MCP context)
//   AzureKeyVaultProvider   — @azure/keyvault-secrets
```

Replace all `process.env['*_API_KEY']` reads with `secrets.get(key)`.

**RBAC (lightweight, file-based for v1)**

```jsonc
// .agents/rbac.json
{
  "roles": {
    "operator":    ["dag:run", "plan:run", "audit:read"],
    "reviewer":    ["audit:read", "checkpoint:review"],
    "readonly":    ["audit:read"]
  },
  "users": {
    "ci-bot":      "operator",
    "team-lead":   "reviewer"
  }
}
```

Enforced at `PlanOrchestrator.run()` and `DagOrchestrator.run()` entry points.

---

### Sprint 9 — Multi-workspace isolation (G-20, 1 week)

**Run isolation via namespaced directories**

```typescript
// dag-orchestrator.ts
const runDir = path.join(projectRoot, '.agents', 'runs', runId);
// All StateStore, CostTracker, and AuditLog paths are rooted here
```

**Concurrent run support**: Two DAG runs on the same project no longer collide.

**Run registry**
```typescript
// lib/run-registry.ts  (new file)
// .agents/runs/index.json — list of all runs with status, cost, phase
// ai-kit agent:status lists all runs, not just the last one
```

---

### Sprint 10 — Semantic memory (G-13, 2 weeks)

**Vector memory store**

```typescript
// lib/memory-store.ts  (new file)
export interface MemoryEntry {
  runId: string;
  laneId: string;
  content: string;          // text chunk from AgentResult
  embedding: number[];      // float32 vector
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface MemoryStore {
  upsert(entries: MemoryEntry[]): Promise<void>;
  search(query: string, k: number): Promise<MemoryEntry[]>;
}
```

Implementations:
- `LocalMemoryStore` — sqlite-vec (zero infra, works locally)
- `PgVectorMemoryStore` — pgvector (enterprise, existing PostgreSQL)
- `AzureAISearchMemoryStore` — Azure AI Search

**Inject into prompt context:**
```typescript
// check-runner.ts: llm-generate, llm-review
const memories = await memoryStore.search(check.prompt ?? '', 5);
const contextBlock = memories.map(m => `[${m.laneId}/${m.runId}] ${m.content}`).join('\n');
// Prepend as system context before user message
```

---

### Sprint 11 — Event triggers + CI integration (G-16, 1 week)

**GitHub webhook trigger**

```typescript
// packages/mcp/src/webhook-server.ts  (new file)
// POST /webhook/github — validates X-Hub-Signature-256
// On pull_request.opened → run agents/pr-description.agent.json
// On push to main → run agents/audit.dag.json
```

**`agents/ci.dag.json`** — a DAG designed for CI:
- Static checks only (no budget) on PR
- Full LLM review on merge to main

**GitHub Actions workflow template:**
```yaml
# template/.github/workflows/ai-review.yml
on: [pull_request]
jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm ai-kit agent:workflow --dag agents/ci.dag.json
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

---

## 4. Priority Matrix

```
                    IMPACT
           Low ◄──────────────── High
    ┌──────────────────────────────────────┐
 H  │ G-16 triggers   │ G-01 streaming    │
 i  │ G-13 memory     │ G-02 tool-use     │  ← Build these first
 g  │                 │ G-03 sample agents│
 h  ├─────────────────┼───────────────────┤
    │ G-17 dashboard  │ G-07 audit log    │
 E  │ G-15 per-lane   │ G-08 OTEL         │
 f  │   provider      │ G-05 README fix   │
 f  ├─────────────────┼───────────────────┤
 o  │ G-18 plugins    │ G-06 auth/RBAC    │
 r  │ G-20 isolation  │ G-09 secrets      │
 t  │                 │ G-10 async store  │
    │                 │ G-11 back-off     │
 L  │                 │ G-12 circuit brk  │
 o  └──────────────────────────────────────┘
 w              
```

**Recommended sprint order:** G-03 → G-05 → G-01 → G-02 → G-07 → G-08 → G-11 → G-12 → G-10 → G-18 → G-06 → G-09 → G-20 → G-14/G-17 → G-13 → G-16

---

## 5. Enterprise Positioning After Roadmap

| Dimension | Now | After roadmap |
|-----------|-----|--------------|
| LLM output visibility | Silent until complete | Real-time token streaming |
| Agent capability | Static checks + llm-generate | Full tool-use loop (read/write/shell) |
| Cost control | Budget cap + per-lane limit | Budget cap + circuit breaker + back-off |
| Observability | Cost JSON to disk | OTEL spans + audit NDJSON + event bus |
| Security | Raw env vars | Pluggable secrets provider + RBAC |
| Memory | Per-run in-memory only | Persistent vector memory across runs |
| Onboarding | Undiscoverable | `pnpm demo` → first result in < 30 s |
| CI/CD | Manual only | GitHub webhook + Actions workflow |
| Extensibility | Fork required | Public plugin API |
| Competitive moat | JSON DAGs + barrier sync | JSON DAGs + barrier sync + tool-use + streaming + memory + OTEL |

---

## 6. What Stays Unchanged (Genuine Moat — Don't Touch)

These are already better than every competitor. Protect them.

- **Declarative zero-code DAG** — JSON topology, not Python graph code
- **Task-profile model routing** — cost-optimal by design, not by accident
- **Barrier synchronisation** (`hard-barrier` / `soft-align`) — no competitor has this
- **Supervisor verdict protocol** (APPROVE / RETRY / HANDOFF / ESCALATE) — formal, not ad-hoc
- **5-phase Plan System** (Discover → Synthesize → Decompose → Wire → Execute) — unique
- **Arbiter escalation chain** (BA → Architecture → User) — structured conflict resolution
- **VS Code MCP-native** — zero-cost execution via Copilot LM bridge
- **TypeScript throughout** — type-safe config, type-safe runtime
