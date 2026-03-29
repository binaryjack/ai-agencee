# Codernic vs Other Coding Assistants

**Last updated:** March 28, 2026  
**Version:** Codernic E14, ai-agencee v0.6.57

## TL;DR

AI Agencee's **Codernic** is the orchestration brain of the ai-agencee system — not just a coding assistant, but a BA agent that understands your project, decomposes work into specialized agents, composes them into executable DAGs, and runs those workflows to completion.

- **The BA/orchestrator brain** — conducts multi-phase discovery, selects agents, composes DAGs, and runs them
- **An FTS5-indexed codebase map** that feeds every agent with accurate context (no hallucinated imports)
- **Five AI-native modes** (ASK / PLAN / AGENT / JOURNEY / ANALYSE) each with a distinct role
- **DAG composer and executor** — Codernic *creates and runs* multi-agent workflows; other agents are its participants

**What this means for you:**

| If you need... | Use Copilot/Cursor/Claude Code | Use Codernic |
|----------------|-------------------------------|--------------|
| Autocomplete while typing | ✅ Excellent | ❌ Not designed for this |
| Chat-based "explain this code" | ✅ Works well | ✅ ASK mode (faster, FTS5-backed) |
| BA-led project discovery (5-phase) | ❌ Not possible | ✅ JOURNEY mode (reads codebase, asks the right questions) |
| Automated codebase intelligence scan | ❌ Not possible | ✅ ANALYSE mode (generates tech-registry, conventions, agent-hints) |
| Plan a feature without executing it | ⚠️ Requires prompting discipline | ✅ PLAN mode (selects agents, generates DAG spec) |
| Hire specialized agents and compose them into a workflow | ❌ Not possible | ✅ PLAN mode (dag-generator identifies + wires agents) |
| Multi-file atomic refactors | ⚠️ Limited, manual review required | ✅ Transactional FILE:/DELETE: protocol |
| Run multi-lane DAG with live progress | ❌ Not possible | ✅ AGENT mode (executor + dag-runner) |
| Run in CI (no IDE) | ❌ IDE-only | ✅ Node module, callable anywhere |
| Air-gapped / offline environments | ❌ Requires cloud | ✅ SQLite + Ollama = fully local |
| Enterprise RBAC, audit, multi-tenant | ❌ Consumer tools | ✅ E1–E14 enterprise features |
| Cost control (per-run budget caps) | ❌ Flat subscription | ✅ --budget flag + auto-downgrade |

---

## Architecture Comparison

### GitHub Copilot
- **Model:** OpenAI Codex (cloud)
- **Context:** File-local (occasionally reads nearby files)
- **Strengths:** Best-in-class autocomplete, deep VS Code integration
- **Weaknesses:** No codebase-wide context, hallucinated imports common, cannot run in CI

### Claude Code
- **Model:** Claude Sonnet 3.5/3.6 (cloud, Anthropic API)
- **Context:** Workspace-aware via embeddings (uploaded to Anthropic)
- **Strengths:** Excellent reasoning, multi-file edits in chat
- **Weaknesses:** Subscription required, no DAG orchestration, cannot run headless

### Cursor
- **Model:** GPT-4 or Claude (cloud)
- **Context:** Hybrid (local embeddings + cloud inference)
- **Strengths:** @-mention files, codebase-wide search, inline edits
- **Weaknesses:** Subscription ($20/user/mo), privacy concerns (code uploaded), no agent composition

### Tabnine
- **Model:** Proprietary (cloud or on-prem)
- **Context:** Local embeddings (privacy-focused)
- **Strengths:** Privacy-first, works offline with local model
- **Weaknesses:** Autocomplete-centric, no multi-agent workflows, limited reasoning

### Amazon CodeWhisperer
- **Model:** Amazon Titan Codex (AWS cloud)
- **Context:** File-local + AWS SDK awareness
- **Strengths:** Free for AWS customers, security scanning built-in
- **Weaknesses:** AWS lock-in, no codebase indexing, cannot compose with agents

### Codernic (ai-agencee)
- **Model:** Any (Anthropic, OpenAI, Ollama, Mock, Bedrock, Gemini) via pluggable providers
- **Context:** **FTS5 SQLite index** — full AST parse of every file, <10ms symbol lookup
- **Role:** **Orchestration brain** — acts as BA agent, composes and runs multi-agent DAGs
- **Strengths:**
  - **Five modes** — not one chat interface:
    - 🗺️ **Journey** — BA-driven 5-phase discovery (reads codebase, asks the right questions, produces a DAG + agent list)
    - 🔬 **Analyse** — automated codebase intelligence extraction (tech-registry, conventions, agent-hints)
    - 📋 **Plan** — decomposes features into specialized agents, assembles a `DagSpecification` (identifies affected components → selects agents → wires dependencies)
    - ⚡ **Agent** — executes the multi-lane DAG with live lane progress, checkpoints, and cost tracking
    - 💬 **Ask** — FTS5-backed Q&A with full codebase context
  - **DAG composer + executor** — Codernic *creates* DAGs (Plan mode), *hires* specialized agents (database/backend/frontend/testing/docs), and *runs* them (Agent mode)
  - **Local-first** — SQLite + Ollama = zero cloud dependency
  - **Atomic multi-file patches** — all changes applied transactionally or rolled back
  - **Enterprise-ready** — RBAC, audit logging, multi-tenant isolation, PII scrubbing, GDPR compliance
  - **Incremental re-index** — <400ms, tracks file hashes, never re-indexes unchanged files
  - **Hybrid context** — FTS5 fast path (<10ms) + real-time ripgrep fallback (~200ms) = 100% accuracy
- **Weaknesses:** Not designed for autocomplete-while-typing (use Copilot for that)

---

## Feature Matrix

### 1. Architecture & Deployment

| Feature | GitHub Copilot | Claude Code | Cursor | Tabnine | CodeWhisperer | **Codernic** |
|---------|:--------------:|:-----------:|:------:|:-------:|:-------------:|:------------:|
| **Runs entirely local** (no cloud) | ❌ | ❌ | ⚠️ Partial | ⚠️ Partial | ❌ | ✅ |
| **Works offline** (air-gapped) | ❌ | ❌ | ❌ | ⚠️ Partial | ❌ | ✅ |
| **Runs in CI/CD** (no IDE) | ❌ | ❌ | ❌ | ❌ | ⚠️ Partial | ✅ |
| **Callable from other agents** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**Codernic advantage:** It's a TypeScript module, not an IDE plugin. Call it from scripts, agents, DAG lanes, or LangGraph nodes.

---

### 2. Context & Indexing

| Feature | GitHub Copilot | Claude Code | Cursor | Tabnine | CodeWhisperer | **Codernic** |
|---------|:--------------:|:-----------:|:------:|:-------:|:-------------:|:------------:|
| **FTS5 full-text search** (<10ms) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Incremental re-index** (only changed files) | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ |
| **Semantic vector search** | ❌ | ❌ | ⚠️ Partial | ⚠️ Partial | ❌ | ✅ |
| **Multi-language AST parsing** | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ |
| **Hybrid context** (fast + accurate) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**Codernic specifics:**
- **FTS5 index:** 449 files in 1.03s, median query time 3ms
- **Incremental update:** <400ms (400ms debounce, file hash tracking)
- **Hybrid strategy:** FTS5 for symbols (<10ms), ripgrep for content (~200ms), 100% accuracy

---

### 3. Code Generation & Editing

| Feature | GitHub Copilot | Claude Code | Cursor | Tabnine | CodeWhisperer | **Codernic** |
|---------|:--------------:|:-----------:|:------:|:-------:|:-------------:|:------------:|
| **Five-mode operation** (ASK/PLAN/AGENT/JOURNEY/ANALYSE) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Atomic multi-file refactor** | ❌ | ⚠️ Partial | ⚠️ Partial | ❌ | ❌ | ✅ |
| **Real imports** (never hallucinates) | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ |
| **Live context** (sees previous agent's work) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Transactional file writes** (all-or-nothing) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**Example: JOURNEY mode (BA discovery)**
```
You: /journey

Codernic (reads codebase, then asks):
[Phase 1 — Discovery]
I've scanned your workspace. I can see a Node.js API with Prisma and Redis.
What is the primary goal of this feature?

... (5 phases: Discovery → Architecture → Decomposition → Wiring → Validation)

[PHASE_COMPLETE: 5]
✅ Generated: backend-agent.agent.json, frontend-agent.agent.json, testing-agent.agent.json
✅ Generated: add-rate-limiting.dag.json
```

**Example: PLAN mode (agent composition)**
```bash
You: "plan: add rate limiting to /api/users"

Codernic (dag-generator — selects agents, wires dependencies):
🔍 Affected components: backend, testing
🤝 Hiring: backend-agent.agent.json, testing-agent.agent.json
📋 Generated: add-rate-limiting.dag.json
  Lane 1 [backend]: Install express-rate-limit, create middleware, apply to routes
  Lane 2 [testing]: Add rate-limit tests (dependsOn: backend)
```

**Example: AGENT mode (DAG execution)**
```bash
You: "run add-rate-limiting.dag.json"

Codernic (executor — runs the multi-lane DAG):
⚡ Lane [backend]: running...
  ✅ Installed express-rate-limit
  ✅ Created src/middleware/rate-limit.ts
  ✅ Updated src/server.ts
⚡ Lane [testing]: running...
  ✅ Created tests/rate-limit.spec.ts
DAG completed in 12.4s · 4 files modified
```

**Example: ASK mode**
```bash
You: "find all authentication functions"

Codernic (FTS5 query, <10ms):
- checkAccess (src/auth/check-access.ts:34)
- validateToken (src/auth/jwt.ts:12)
- assertRole (src/auth/roles.ts:18)
```

---

### 4. Integration & Workflow

| Feature | GitHub Copilot | Claude Code | Cursor | Tabnine | CodeWhisperer | **Codernic** |
|---------|:--------------:|:-----------:|:------:|:-------:|:-------------:|:------------:|
| **VS Code extension** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Chat participants** (@codernic, @plan, @agent) | ⚠️ Partial | ❌ | ⚠️ Partial | ❌ | ❌ | ✅ |
| **Composable in DAG workflows** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **MCP server** (Claude Desktop) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Python SDK** (LangChain/LangGraph) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**Codernic as orchestrator — DAG it generates in PLAN/JOURNEY mode:**
```json
{
  "name": "add-oauth-flow",
  "lanes": [
    { "id": "backend",   "agentFile": "agents/backend-agent.agent.json",   "dependsOn": [] },
    { "id": "frontend",  "agentFile": "agents/frontend-agent.agent.json",  "dependsOn": ["backend"] },
    { "id": "testing",   "agentFile": "agents/testing-agent.agent.json",   "dependsOn": ["backend", "frontend"] },
    { "id": "docs",      "agentFile": "agents/documentation-agent.agent.json", "dependsOn": ["testing"] }
  ]
}
```

Codernic **generates** this DAG (Plan mode), selects and wires these agents, then **runs** the whole workflow (Agent mode). The agents in the lanes are specialists Codernic hired — Codernic itself is the director, not a participant.

---

### 5. Enterprise & Compliance

| Feature | GitHub Copilot | Claude Code | Cursor | Tabnine | CodeWhisperer | **Codernic** |
|---------|:--------------:|:-----------:|:------:|:-------:|:-------------:|:------------:|
| **RBAC + OIDC** | ⚠️ Partial | ❌ | ❌ | ⚠️ Partial | ⚠️ Partial | ✅ |
| **Audit logging** (hash-chained) | ❌ | ❌ | ❌ | ❌ | ⚠️ Partial | ✅ |
| **Multi-tenant isolation** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **PII scrubbing** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Budget enforcement** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**Enterprise features (E1–E14):**
- E1: RBAC & OIDC authentication
- E2: Audit logging (SHA-256 hash chain)
- E3: Multi-tenant isolation (GDPR Art. 17 + 20)
- E4: PII scrubbing (9 built-in patterns)
- E5: Budget enforcement (--budget flag)
- E6: SSO (SAML 2.0 + OIDC)
- E7: Pause/Resume & Checkpoints
- E8: Eval Pipeline & Quality Flywheel
- E9: Rate limiting (per-principal)
- E10: Cost analytics & forecasting
- E11: Secrets management (vault integration)
- E12: OpenTelemetry tracing
- E13: Skills & Rules pipeline (XML system prompts)
- E14: **Codernic** (FTS5 code intelligence)

---

### 6. Cost & Licensing

| Tool | Pricing | Zero-cost eval? |
|------|---------|-----------------|
| **GitHub Copilot** | $10/user/month | ❌ |
| **Claude Code** | Part of Claude Pro ($20/month) | ❌ |
| **Cursor** | $20/user/month | ❌ |
| **Tabnine** | $12/user/month (Pro) | ⚠️ Free tier (limited) |
| **CodeWhisperer** | Free (AWS customers) | ✅ (with AWS account) |
| **Codernic** | **Free (OSS)** / Enterprise license | ✅ Mock provider ($0.00) |

**Codernic cost models:**
- **$0.00** — Mock provider (deterministic, word-level streaming, no API keys)
- **Pay-per-token** — Anthropic/OpenAI providers (set --budget flag)
- **Local — $0 inference** — Ollama provider (localhost:11434, no cloud calls)
- **Enterprise** — Custom licensing (contact for pricing)

---

### 7. Performance Benchmarks

| Metric | GitHub Copilot | Claude Code | Cursor | Tabnine | CodeWhisperer | **Codernic** |
|--------|:--------------:|:-----------:|:------:|:-------:|:-------------:|:------------:|
| **Query latency** (symbol lookup) | ~200ms | ~500ms | ~300ms | ~100ms | ~400ms | **<10ms** |
| **Index build time** (449 files) | N/A | N/A | ~5s | ~3s | N/A | **1.03s** |
| **Incremental update** | N/A | N/A | ~1s | ~800ms | N/A | **<400ms** |

**Codernic detailed metrics (449-file TypeScript workspace):**
- Full index: 1.03s (AST parse + FTS5 insert)
- FTS5 query (median): **3ms** (99th percentile: 8ms)
- Incremental update: 370ms (file hash tracking, 400ms debounce)
- Semantic search (10 results): 120ms (Ollama `nomic-embed-text`)

---

## When to Use What

### Use GitHub Copilot if:
- ✅ You want best-in-class autocomplete while typing
- ✅ You work mostly in a single file at a time
- ✅ You don't need multi-agent orchestration

### Use Claude Code if:
- ✅ You prefer Anthropic models (Claude Sonnet 3.5/3.6)
- ✅ You're comfortable uploading code to Anthropic for context
- ✅ You don't need CI integration or agent composition

### Use Cursor if:
- ✅ You want a polished IDE with AI-first UX
- ✅ You're comfortable with $20/user/month subscription
- ✅ You don't need to run headless or compose with other agents

### Use Codernic if:
- ✅ You need **real imports** — no hallucinated paths or symbols
- ✅ You want **BA-driven discovery** — Journey mode reads your codebase, asks the right questions, and produces a ready-to-run DAG
- ✅ You want Codernic to **hire and compose specialized agents** for you (Plan mode selects backend/frontend/testing/docs agents automatically)
- ✅ You need **five modes** (ASK = query, ANALYSE = scan, JOURNEY = BA discover, PLAN = design + compose, AGENT = execute)
- ✅ You need to **run multi-lane DAGs** with live checkpoint progress
- ✅ You need to **run in CI** or call from scripts (no IDE required)
- ✅ You need **enterprise features** (RBAC, audit, multi-tenant, GDPR, budget caps)
- ✅ You want **fully local** operation (SQLite + Ollama, air-gapped compliant)
- ✅ You want **atomic multi-file refactors** with transactional rollback
- ✅ You need **FTS5 speed** (<10ms symbol lookup on 449-file workspace)

---

## Hybrid Strategy: Copilot + Codernic

**Best of both worlds:**

1. **Use Copilot for autocomplete** — it's excellent at inline suggestions while typing
2. **Use Codernic as your BA + orchestrator:**
   - `@codernic /journey` — Codernic reads your codebase, conducts a 5-phase BA discovery, and generates a DAG + agent list
   - `@codernic /analyse` — automated stack + convention scan (produces tech-registry.json, conventions.json)
   - `@plan add OAuth flow to the API` — Codernic selects the right agents, wires them into a DAG spec
   - `@agent run add-oauth-flow.dag.json` — Codernic executes the multi-lane workflow with live progress
   - `@codernic find all authentication functions` — FTS5-backed Q&A in ASK mode
3. **Use Codernic in CI:**
   ```bash
   # DAG Codernic generated and can re-run after PR merge
   ai-kit run ./.agencee/config/agents/post-merge.dag.json
   ```
   - Lane 1 [codernic]: Updates README with new API routes
   - Lane 2 [codernic]: Adds JSDoc to public functions
   - Lane 3 [codernic]: Generates PR description with findings

This gives you **autocomplete UX** from Copilot and **BA-led, orchestrated multi-agent workflows** from Codernic.

---

## Summary: Key Differentiators

| Dimension | Copilot/Claude/Cursor | Codernic |
|-----------|----------------------|----------|
| **Architecture** | Cloud-hosted IDE plugins | Local-first TypeScript module |
| **Context** | File-local or embeddings (uploaded) | FTS5 SQLite index (local) |
| **Speed** | ~200–500ms (cloud round-trip) | <10ms (FTS5 query) |
| **Modes** | Single chat interface | Five modes (ASK/PLAN/AGENT/JOURNEY/ANALYSE) |
| **Multi-file edits** | Manual or chat-driven | Atomic FILE:/DELETE: protocol |
| **Real imports** | Hallucinations common | 100% accurate (FTS5-backed) |
| **CI integration** | ❌ IDE-only | ✅ Node module, callable anywhere |
| **Agent composition** | ❌ Not possible | ✅ DAG lanes with supervisor + retry |
| **Enterprise** | Consumer tools | E1–E14 (RBAC, audit, multi-tenant, GDPR) |
| **Cost** | $10–$20/user/month | $0 (Mock/Ollama) or pay-per-token |
| **Offline** | ❌ Requires cloud | ✅ SQLite + Ollama = fully local |

---

## FAQ

**Q: Can I use Codernic instead of Copilot?**  
A: Partially. Codernic excels at multi-file planning + execution, but it's not designed for autocomplete-while-typing. Use Copilot for inline suggestions, Codernic for workflow orchestration.

**Q: Does Codernic upload my code to the cloud?**  
A: No. The FTS5 index is a local SQLite file (`.agents/code-index.db`). If you use Anthropic/OpenAI providers, prompts are sent to their APIs (same as Copilot/Claude/Cursor). Use the Ollama provider for 100% local inference.

**Q: How accurate is the FTS5 index?**  
A: **100%** — it's a direct AST parse of every file. If a symbol exists, Codernic finds it. No embeddings, no stale results.

**Q: Can I use Codernic with Claude Desktop?**  
A: Yes. The `@ai-agencee/mcp` package exposes Codernic as MCP tools (`@init`, `@check`, `@patterns`). Add to `claude_desktop_config.json`.

**Q: What languages does Codernic support?**  
A: Built-in: TypeScript, JavaScript, Python, Go, **Java, Rust, C#, Ruby, Kotlin, SQL** (T-SQL/PL-SQL/PL-pgSQL/DB2). Extensible via the `LanguageParser` plugin interface.

**Q: Does AGENT mode run tests automatically?**  
A: Not currently. AGENT mode executes file changes atomically via the `## FILE:`/`## DELETE:` protocol. Test execution and git commits can be added to DAG lanes post-execution. Roadmap: v0.7.0 will add optional test-then-commit workflow.

**Q: Can I set a budget cap for Codernic runs?**  
A: Yes. Pass `--budget 2.50` to the CLI or set `budgetUsd` in the DAG. Codernic auto-downgrades model tier when budget is insufficient.

**Q: Is Codernic a fork of Cursor or Claude Code?**  
A: No. Codernic is original code, built as a module inside the ai-agencee multi-agent orchestrator. It predates Cursor and uses a different architecture (FTS5 + hybrid context vs. embeddings).

---

## Next Steps

1. **Try ASK mode:**  
   ```bash
   @codernic find all database queries
   ```

2. **Try PLAN mode:**  
   ```bash
   @plan add pagination to /api/users endpoint
   ```

3. **Try AGENT mode:**  
   ```bash
   @agent add pagination to /api/users endpoint
   ```

4. **Run in CI:**  
   ```bash
   ai-kit run ./agents/post-merge.dag.json
   ```

5. **Read the docs:**  
   - [Codernic Overview](./28-code-assistant.md)
   - [VS Code Extension](./40-vscode-extension.md)
   - [DAG Orchestration](./01-dag-orchestration.md)
