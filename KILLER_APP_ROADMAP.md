# Killer App Roadmap — Next Wave

> **Baseline**: G-01 through G-20 from `IMPROVEMENT_ROADMAP.md` are all implemented.
> This file describes the **next level** of improvements, verified against the current codebase
> and benchmarked against LangGraph, CrewAI, AutoGen, Claude Code, and GitHub Copilot Agent.
>
> Date: 2026-03-05

---

## Context: Where We Stand After G-01–G-20

The system now has:
- ✅ JSON-declarative parallel DAG execution
- ✅ Multi-provider model routing (Anthropic / OpenAI / VS Code Sampling / Mock)
- ✅ Per-run USD cost report with budget cap
- ✅ Hash-chained tamper-evident audit log
- ✅ File-based RBAC with per-lane restrictions
- ✅ Circuit breaker + exponential back-off per provider
- ✅ OpenTelemetry opt-in tracing
- ✅ Run registry with per-run isolation (`.agents/runs/<runId>/`)
- ✅ Typed event bus (`DagEventBus`)
- ✅ In-process vector memory (`VectorMemory`)
- ✅ GitHub webhook trigger
- ✅ MCP dashboard resource (`dashboard://status`)
- ✅ Secrets abstraction (env / dotenv / composite)
- ✅ Plugin API for custom check types

**What no competitor has yet**: zero-key VS Code MCP mode, declarative cost-optimal model routing,
hash-chained auditing, and barrier synchronisation.

**What still blocks mass adoption and enterprise deals**: usable UI, persistent memory, cloud
deployment, richer model ecosystem, and developer-experience polish.

---

## Gap Map — G-21 through G-50

### P0 — Blocks viral adoption (fix in next 2 weeks)

| # | Gap | Impact | Evidence |
|---|-----|--------|---------|
| G-21 | **No `pnpm demo` with live terminal animation** | First-time users never achieve a "wow" moment | `package.json` scripts: no `demo`; README shows no quick-start result |
| G-22 | **No TypeScript DAG builder API** | Engineers won't hand-write JSON for complex topologies | Only raw JSON schema; no fluent builder or type-safe DSL |
| G-23 | **No JSON Schema for `dag.json` / `agent.json`** | No IntelliSense, no validation in VS Code | No `$schema` field in any agent JSON; no `.json` schema files in repo |
| G-24 | **VectorMemory is ephemeral (in-process only)** | Memory dies with the process; no cross-run learning | `vector-memory.ts`: stores entries in a `Map<string, VectorEntry[]>`; no persistence |
| G-25 | **No sqlite-vec / file-backed memory** | Users can't recall past run insights without an external DB | No sqlite dependency; `VectorMemory.serialise()` exists but is never called automatically |

---

### P1 — Blocks enterprise contracts (fix in 4 weeks)

| # | Gap | Impact | Evidence |
|---|-----|--------|---------|
| G-26 | **No real-time web dashboard** | Operations teams need live lane status, cost burn, checkpoint verdicts | MCP `dashboard://status` is a static Markdown snapshot; no push updates |
| G-27 | **No multi-tenant isolation** | Two teams sharing a server clobber each other's runs and audit logs | `RbacPolicy` scopes to `projectRoot`; no `tenantId` field; audit paths are `<runId>.ndjson` globally |
| G-28 | **No SSE / WebSocket live events API** | External consumers (CI dashboards, Slack bots, web UIs) can't subscribe to live events | `DagEventBus` is in-process only; no HTTP push surface |
| G-29 | **No rate limiting per principal** | A single runaway CI bot can exhaust the entire org's LLM budget | RBAC enforces `run` permission but no concurrent-run or token-per-hour cap |
| G-30 | **No PII scrubbing pipeline** | Source code or user prompts may contain credentials before they reach the LLM API | No pre-send sanitiser; `LLMPrompt.messages` flow directly to provider adapters |
| G-31 | **No prompt injection detection** | File content injected into prompts could manipulate agent behaviour | No input classification step before `check-runner.ts` builds messages |

---

### P2 — Competitive moat-builders (fix in 6–8 weeks)

| # | Gap | Impact | Evidence |
|---|-----|--------|---------|
| G-32 | **No Ollama / local-model provider** | Enterprise air-gap deployments, zero-cost dev usage | `providers/` only has `anthropic.ts`, `openai.ts`, `mock.ts`, `vscode-sampling.ts` |
| G-33 | **No Google Gemini provider** | Gemini 2.0 Flash is the cheapest high-quality model; missing a major provider | No `gemini.ts` in `providers/` |
| G-34 | **No AWS Bedrock provider** | AWS-locked enterprises (default cloud is not Azure/Anthropic direct) | No `bedrock.ts` in `providers/` |
| G-35 | **No model benchmarking mode** | No data to justify model-routing recommendations to stakeholders | No way to run same DAG with 3 providers and compare cost+quality |
| G-36 | **No cross-run learning / auto-tune** | Model routing is static config; costs don't improve over time | `model-router.json` is write-once; no feedback loop from `cost-summary.json` |
| G-37 | **No agent distillation** | Successful agent outputs are not persisted as few-shot examples for future runs | `DagResultBuilder` saves results to disk but nothing reads them back as prompt context |
| G-38 | **No code execution sandbox** | Agents can't run generated code to validate it works | No subprocess sandbox with resource limits and timeout; `run-command` check is unconstrained |
| G-39 | **No multimodal input** | Architecture diagrams, UI screenshots can't be passed to Opus for review | `LLMMessage.content` is `string` only; no `image_url` / `base64` variant |

---

### P3 — Distribution and ecosystem (fix in 8–12 weeks)

| # | Gap | Impact | Evidence |
|---|-----|--------|---------|
| G-40 | **No GitHub Marketplace Action** | CI/CD integration requires manual setup; no one-click adoption | No `action.yml` at repo root; no published GitHub Action |
| G-41 | **No Docker image** | MCP server requires local Node.js install; blocks server-side hosting | No `Dockerfile` in `packages/mcp/`; no `docker-compose.yml` |
| G-42 | **No Jira / Linear sync** | Sprint planning output lives in `.agents/`; PM tools see nothing | No HTTP client for Jira API or Linear GraphQL |
| G-43 | **No Slack / Teams notification** | DAG run success/failure is invisible to the broader team | No webhook-out integration; operators must poll CLI |
| G-44 | **No GitHub PR auto-comment bot** | Code review results can't surface automatically on GitHub PRs | Webhook trigger receives PR events but only starts a DAG; no GitHub API write-back |
| G-45 | **No npm auto-publish CI** | Manual releases mean users run stale cached versions | No `.github/workflows/release.yml`; packages published manually |
| G-46 | **No Python SDK / subprocess bridge** | ML engineers (majority of LLM users) have no native path in | No Python package; no subprocess protocol |

---

### P4 — Stretch / market-defining (3+ months)

| # | Gap | Impact | Evidence |
|---|-----|--------|---------|
| G-47 | **No hosted cloud offering** | LangGraph Cloud captures enterprise deals; self-hosting is a blocker for many | No managed service, no SaaS tier |
| G-48 | **No visual DAG editor** | Non-engineers can't participate in DAG design | dag.json must be hand-authored; no drag-and-drop topology builder |
| G-49 | **No agent marketplace** | Community can't share agent packs; network effects don't compound | No registry for `*.agent.json` or DAG templates beyond the 6 shipped |
| G-50 | **No evaluation / LLM-as-judge harness** | No quantitative quality measurement; model routing decisions are faith-based | No eval framework; no golden-set comparison tooling |

---

## Implementation Specs

### G-21 — `pnpm demo` terminal animation

**Goal**: a new user runs one command and sees streaming output, lane statuses, and a cost summary
in under 30 seconds, with **zero API keys**.

```sh
# In root package.json
"scripts": {
  "demo": "node --import=tsx packages/agent-executor/scripts/demo.ts"
}
```

```typescript
// packages/agent-executor/scripts/demo.ts
// 1. Print ASCII art banner
// 2. Run agents/demo.dag.json with mock provider
// 3. Render live lane grid (update in place via ANSI escape codes)
// 4. Print cost summary at end
// No API key. Total runtime < 3 s.
```

Lanes for demo DAG: `code-review`, `security-scan`, `dependency-audit` — three parallel lanes,
mock provider, each streaming 10 fake tokens per check.

---

### G-22 — TypeScript DAG builder API

```typescript
// packages/agent-executor/src/lib/dag-builder.ts  (new file)
import { DagBuilder } from '@ai-agencee/ai-kit-agent-executor';

const dag = new DagBuilder('my-project-review')
  .lane('backend', { provider: 'anthropic' })
    .check({ type: 'llm-review', taskType: 'code-review', path: 'src/backend' })
    .check({ type: 'llm-generate', taskType: 'code-generation', prompt: 'Write unit tests for the above' })
  .lane('security', { dependsOn: ['backend'] })
    .check({ type: 'llm-review', taskType: 'security-review', path: 'src' })
  .barrier('post-analysis', 'hard')
  .build();

// dag is a valid DagDefinition — pass directly to DagOrchestrator
const orchestrator = new DagOrchestrator(projectRoot);
await orchestrator.execute(dag, options);
```

Key exports to add to `index.ts`: `DagBuilder`, `LaneBuilder`.

---

### G-23 — JSON Schema for agent and DAG files

```jsonc
// schemas/dag.schema.json  (new file)
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://ai-agencee.github.io/ai-starter-kit/schemas/dag.schema.json",
  "title": "DAG Definition",
  "type": "object",
  "required": ["name", "lanes"],
  "properties": {
    "name": { "type": "string" },
    "budgetUSD": { "type": "number", "minimum": 0 },
    "lanes": {
      "type": "array",
      "items": { "$ref": "#/definitions/LaneDefinition" }
    }
    // ... full schema
  }
}
```

Add to every `*.dag.json`:
```json
{ "$schema": "../../schemas/dag.schema.json", "name": "..." }
```

Add VS Code settings recommendation in `.vscode/settings.json`:
```json
{
  "json.schemas": [
    { "fileMatch": ["*.dag.json"], "url": "./schemas/dag.schema.json" },
    { "fileMatch": ["*.agent.json"], "url": "./schemas/agent.schema.json" }
  ]
}
```

---

### G-24 + G-25 — Persistent vector memory (sqlite-vec)

```typescript
// packages/agent-executor/src/lib/sqlite-vector-memory.ts  (new file)
import Database from 'better-sqlite3';

export class SqliteVectorMemory implements VectorMemoryBackend {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vectors (
        id TEXT PRIMARY KEY,
        store TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding BLOB NOT NULL,    -- Float32Array as raw bytes
        metadata TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_store ON vectors(store);
    `);
  }

  store(storeName: string, entry: VectorEntry): void { ... }
  search(storeName: string, query: Float32Array, k: number): VectorEntry[] { ... }
  persist(): void { /* no-op — sqlite writes on every store() */ }
}
```

Wire into `DagOrchestrator`: auto-create `SqliteVectorMemory` at
`.agents/memory.db` when `options.persistMemory = true`.

Dependencies to add: `better-sqlite3` (already used in many Node.js projects; no native build issues
with pre-built binaries).

---

### G-26 — Real-time web dashboard

```
packages/dashboard/          (new package)
  package.json               "@ai-agencee/ai-kit-dashboard"
  src/
    server.ts                Express SSE + static file server
    public/
      index.html
      app.tsx                React 18 + Vite
      components/
        DagGrid.tsx          Lane card grid (running/success/failed/escalated)
        CostGauge.tsx        Budget burn bar
        TokenStream.tsx      Live LLM output per lane
        CheckpointFeed.tsx   Checkpoint verdict timeline
```

**How it connects**: `DashboardServer` subscribes to `DagEventBus`; pushes events as SSE to
browser. Browser auto-reconnects on disconnect.

```typescript
// packages/dashboard/src/server.ts
import { getGlobalEventBus } from '@ai-agencee/ai-kit-agent-executor';

app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  const bus = getGlobalEventBus();
  const handlers = {
    'lane:start':  (p) => res.write(`data: ${JSON.stringify({ type: 'lane:start',  ...p })}\n\n`),
    'lane:end':    (p) => res.write(`data: ${JSON.stringify({ type: 'lane:end',    ...p })}\n\n`),
    'llm:call':    (p) => res.write(`data: ${JSON.stringify({ type: 'llm:call',    ...p })}\n\n`),
    'dag:end':     (p) => res.write(`data: ${JSON.stringify({ type: 'dag:end',     ...p })}\n\n`),
  };
  for (const [ev, fn] of Object.entries(handlers)) bus.on(ev as never, fn);
  req.on('close', () => {
    for (const [ev, fn] of Object.entries(handlers)) bus.off(ev as never, fn);
  });
});
```

---

### G-27 — Multi-tenant isolation

```typescript
// lib/rbac.ts — add tenantId field
export interface RbacPrincipal {
  role: string;
  tenantId?: string;           // NEW — scopes all run access
  laneRestrictions?: Record<string, LaneRestriction>;
}
```

```typescript
// run-registry.ts — tenant-scoped manifest path
const manifestPath = tenantId
  ? path.join(projectRoot, '.agents', 'tenants', tenantId, 'runs', 'manifest.json')
  : path.join(projectRoot, '.agents', 'runs', 'manifest.json');
```

Audit log paths similarly namespaced: `.agents/tenants/<tenantId>/audit/<runId>.ndjson`.

---

### G-28 — SSE / WebSocket live events API

```typescript
// packages/mcp/src/sse-server.ts  (new file)
import { createServer } from 'http';
import { getGlobalEventBus } from '@ai-agencee/ai-kit-agent-executor';

export function startSseServer(port = 3747): void {
  const server = createServer((req, res) => {
    if (req.url !== '/events') { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    const bus = getGlobalEventBus();
    const relay = (type: string) => (payload: unknown) =>
      res.write(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);
    for (const ev of ['dag:start','dag:end','lane:start','lane:end','llm:call',
                      'budget:exceeded','rbac:denied','checkpoint:complete']) {
      bus.on(ev as never, relay(ev));
    }
    req.on('close', () => {
      for (const ev of ['dag:start','dag:end','lane:start','lane:end','llm:call',
                        'budget:exceeded','rbac:denied','checkpoint:complete']) {
        bus.off(ev as never, relay(ev));
      }
    });
  });
  server.listen(port, () => console.log(`[ai-kit] SSE events: http://localhost:${port}/events`));
}
```

Add to `packages/mcp/src/index.ts`: call `startSseServer()` when `AIKIT_SSE_PORT` env is set.

---

### G-32 — Ollama provider

```typescript
// packages/agent-executor/src/lib/providers/ollama.provider.ts  (new file)
export class OllamaProvider implements LLMProvider {
  constructor(private baseUrl = 'http://localhost:11434') {}

  async complete(prompt: LLMPrompt, modelId: string): Promise<LLMResponse> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: prompt.messages,
        stream: false,
      }),
    });
    const data = await res.json() as { message: { content: string }; eval_count: number; prompt_eval_count: number };
    return {
      content: data.message.content,
      inputTokens: data.prompt_eval_count,
      outputTokens: data.eval_count,
      modelId,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
      return true;
    } catch { return false; }
  }
}
```

Add to `model-router.json` docs: show Ollama config example (cost = 0).
Auto-detect Ollama when `OLLAMA_HOST` env is set in `model-router-factory.ts`.

---

### G-33 — Google Gemini provider

```typescript
// packages/agent-executor/src/lib/providers/gemini.provider.ts  (new file)
// Uses @google/generative-ai SDK
// Maps haiku → gemini-2.0-flash, sonnet → gemini-2.0-pro, opus → gemini-2.0-ultra
// Add GEMINI_API_KEY to secrets abstraction
```

Cost map for `model-router.json`:
| Family | Model | Input /M | Output /M |
|--------|-------|---------|----------|
| haiku  | gemini-2.0-flash-lite | $0.075 | $0.30 |
| sonnet | gemini-2.0-flash | $0.10 | $0.40 |
| opus   | gemini-2.0-pro   | $1.25 | $5.00 |

---

### G-35 — Model benchmarking mode

```sh
ai-kit agent:benchmark --dag agents/dag.json --providers anthropic,openai,ollama
```

Runs the same DAG three times (mock input, deterministic checks), produces:
```
┌──────────────┬────────────┬───────────┬─────────────┬──────────────┐
│ Provider     │ Total cost │ Latency   │ Tokens out  │ Quality score│
├──────────────┼────────────┼───────────┼─────────────┼──────────────┤
│ anthropic    │ $0.0023    │ 12.4 s    │ 1,240       │ 94/100       │
│ openai       │ $0.0031    │ 9.8 s     │ 1,180       │ 91/100       │
│ ollama       │ $0.0000    │ 34.2 s    │ 890         │ 78/100       │
└──────────────┴────────────┴───────────┴─────────────┴──────────────┘
```

Quality score = IntraSupervisor aggregate across all lanes (uses existing verdict system).

---

### G-36 — Cross-run auto-tuning

```typescript
// lib/model-router-tuner.ts  (new file)
// 1. Reads all .agents/runs/*/results/cost-summary.json
// 2. Groups by task type × model family
// 3. Finds families that consistently exceed budget on a lane
// 4. Suggests (or auto-applies with --auto-tune flag) cheaper model family for that task type
// 5. Writes suggestion to agents/model-router.tuned.json
```

```sh
ai-kit agent:tune --apply    # auto-update model-router.json
ai-kit agent:tune --report   # print recommendations only
```

---

### G-37 — Agent distillation (few-shot memory)

When a DAG run completes with all APPROVE verdicts:
1. Extract the best `llm-generate` / `llm-review` output per lane
2. Store in `.agents/examples/<taskType>/<runId>.example.json`
3. On next run, `PromptRegistry.resolve()` appends up to 3 best examples as `<examples>` block

```typescript
// prompt-registry.ts: add distillation injection
const examples = await loadExamples(taskType, projectRoot, { limit: 3 });
if (examples.length > 0) {
  systemContent += '\n\n<examples>\n' + examples.map(e => e.content).join('\n---\n') + '\n</examples>';
}
```

This is a concrete implementation of what OpenAI calls "automatic prompt engineering" — but
file-based, zero infra, no fine-tuning cost.

---

### G-38 — Code execution sandbox

```typescript
// lib/code-sandbox.ts  (new file)
export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export async function runInSandbox(
  code: string,
  language: 'typescript' | 'javascript' | 'python' | 'bash',
  options: { timeoutMs?: number; memoryMb?: number } = {}
): Promise<SandboxResult> {
  // Write code to temp file
  // Spawn child_process with resource limits (ulimit on Linux, Job Object on Windows)
  // Kill after timeoutMs (default 30_000)
  // Return sanitised stdout/stderr
}
```

Expose as new check type `code-run` in `CheckHandlerRegistry`:
```json
{
  "type": "code-run",
  "language": "typescript",
  "source": "{generated_code}",  // interpolates from previous llm-generate outputKey
  "pass": "Exit code 0"
}
```

This closes the loop: `llm-generate` writes code → `code-run` validates it → `llm-review` fixes failures.

---

### G-39 — Multimodal input

```typescript
// llm-provider.ts: extend LLMMessage
export type LLMMessageContent =
  | string
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; mediaType: string; data: string } }  // Anthropic
  | { type: 'image_url'; image_url: { url: string } };                               // OpenAI

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: LLMMessageContent | LLMMessageContent[];
}
```

New check type `llm-review-image`:
```json
{
  "type": "llm-review-image",
  "imagePath": "docs/architecture.png",
  "prompt": "Review this architecture diagram for single points of failure.",
  "taskType": "architecture-decision"
}
```

---

### G-40 — GitHub Marketplace Action

```yaml
# action.yml  (new file at repo root)
name: 'AI Kit Agent Review'
description: 'Run AI-powered multi-agent code review on your pull request'
branding:
  icon: 'cpu'
  color: 'purple'
inputs:
  dag:
    description: 'Path to the DAG JSON file'
    default: 'agents/ci.dag.json'
  provider:
    description: 'LLM provider: anthropic | openai | mock'
    default: 'anthropic'
  anthropic_api_key:
    description: 'Anthropic API key (if provider=anthropic)'
    required: false
runs:
  using: 'node20'
  main: 'dist/action/index.js'
```

```typescript
// packages/action/src/index.ts  (new package — wraps DagOrchestrator)
import * as core from '@actions/core';
const dag    = core.getInput('dag');
const result = await orchestrator.execute(loadedDag, { provider });
core.setOutput('cost_usd', result.totalCostUSD);
core.setOutput('lanes_passed', result.lanes.filter(l => l.passed).length);
if (!result.allPassed) core.setFailed('One or more lanes failed supervisor review');
```

---

### G-41 — Docker image

```dockerfile
# packages/mcp/Dockerfile  (new file)
FROM node:22-alpine AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ ./packages/
RUN corepack enable pnpm && pnpm install --frozen-lockfile
RUN pnpm build

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/packages/mcp/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
ENV NODE_ENV=production
EXPOSE 3747
CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml  (new file at repo root)
services:
  ai-kit-mcp:
    build: packages/mcp
    ports:
      - "3747:3747"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - AIKIT_SSE_PORT=3747
    volumes:
      - ./.agents:/workspace/.agents
```

---

### G-44 — GitHub PR auto-comment bot

```typescript
// packages/mcp/src/github-reporter.ts  (new file)
// After a DAG triggered by pull_request webhook completes:
// 1. Build a Markdown summary from DagResultBuilder output
// 2. POST to https://api.github.com/repos/{owner}/{repo}/issues/{pr}/comments
// 3. If a previous ai-kit comment exists (identified by sentinel footer), edit it (PATCH)

export async function postPrComment(
  owner: string, repo: string, prNumber: number,
  dagResult: DagRunResult, token: string
): Promise<void> { ... }
```

```markdown
<!-- Example PR comment -->
## 🤖 AI Kit Review — `main-review` run abc-12345

| Lane | Status | Cost | Verdict |
|------|--------|------|---------|
| backend | ✅ APPROVE | $0.0008 | No critical issues |
| security | ⚠️ RETRY (1) | $0.0014 | SQL injection risk in auth.ts:34 |
| frontend | ✅ APPROVE | $0.0005 | — |

**Total cost**: $0.0027 · **Duration**: 14.2 s
<sup>Powered by ai-starter-kit · [View full audit](https://github.com/...)</sup>
```

---

### G-50 — Evaluation / LLM-as-judge harness

```typescript
// packages/agent-executor/src/lib/eval-harness.ts  (new file)
export interface EvalCase {
  name: string;
  dagPath: string;
  inputFiles: Record<string, string>;  // virtual FS overlay
  expectedVerdicts: Record<string, 'APPROVE' | 'RETRY' | 'ESCALATE'>;
  expectedMinCostUSD?: number;
  expectedMaxCostUSD?: number;
}

export async function runEval(cases: EvalCase[], projectRoot: string): Promise<EvalReport> { ... }
```

```sh
ai-kit agent:eval --suite evals/code-review-suite.json
```

Produces a comparison table: expected vs actual verdicts, cost deviation, latency. Detects
regressions when model routing changes.

---

## Priority Matrix (G-21–G-50)

```
                      IMPACT
          Low ◄────────────────────► High
   ┌───────────────────────────────────────┐
 H │ G-40 GH Action   │ G-21 demo         │
 i │ G-41 Docker      │ G-22 TS builder   │  ◄── Build first
 g │ G-50 eval        │ G-23 JSON schema  │
 h │                  │ G-24/25 sqlite mem│
   ├──────────────────┼───────────────────┤
   │ G-42 Jira sync   │ G-26 web dashboard│
 E │ G-43 Slack       │ G-27 multi-tenant │
 f │ G-46 Python SDK  │ G-28 SSE API      │
 f │                  │ G-32 Ollama       │
 o │                  │ G-33 Gemini       │
 r ├──────────────────┼───────────────────┤
 t │ G-47 cloud SaaS  │ G-35 benchmarking │
   │ G-48 visual edit │ G-36 auto-tune    │
   │ G-49 marketplace │ G-37 distillation │
 L │                  │ G-38 code sandbox │
 o │                  │ G-44 PR bot       │
 w └───────────────────────────────────────┘
```

**Recommended execution order:**
```
G-21 → G-23 → G-22 → G-24/G-25 → G-28 → G-26 → G-32 → G-33 → G-35
→ G-37 → G-36 → G-38 → G-44 → G-40 → G-41 → G-50 → G-27 → G-29/G-30/G-31
→ G-42 → G-43 → G-46 → G-47 → G-48 → G-49
```

---

## Vision: What This Looks Like After G-21–G-50

```
Developer opens VS Code.
Types: @ai-kit review this PR

ai-kit runs:
  Lane 1 (Haiku):  file analysis, dependency graph          $0.0003
  Lane 2 (Sonnet): code-generation for missing tests        $0.0018
  Lane 3 (Opus):   security + architecture review           $0.0024
  Lane 4 (Sonnet): auto-generated PR description            $0.0009

Total: $0.0054 · 18 s · All lanes APPROVE

→ GitHub PR gets auto-comment with findings
→ Slack posts summary to #engineering
→ VS Code shows live dashboard during run
→ Next run is 12% cheaper (auto-tune applied)
→ Run logged in tamper-evident audit trail
→ Vector memory stores findings for next review
```

No other tool in the market — LangGraph, CrewAI, AutoGen, Claude Code, Copilot — delivers
all six of those outcomes from a single command.

---

## What Stays Untouched (Core Moat)

These are already better than every competitor. They must not be simplified or abstracted away:

| Feature | Why it's the moat |
|---------|------------------|
| Declarative JSON DAG | Zero-code topology; ops teams can own it |
| Task-type cost routing | Automatic cost optimisation at the architectural level |
| Hard/soft barrier sync | No competitor has formal cross-lane synchronisation |
| Supervisor verdict protocol | APPROVE / RETRY / HANDOFF / ESCALATE is a formal protocol, not a string |
| Hash-chained audit log | Enterprise compliance without an external SIEM |
| 5-phase Plan System | End-to-end from discovery to execution; unique |
| VS Code MCP zero-key mode | Only orchestrator that works off a Copilot subscription |
| TypeScript throughout | Type-safe config and runtime; Python ecosystem can't replicate |
