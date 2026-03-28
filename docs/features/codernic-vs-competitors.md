# Codernic vs Other Coding Assistants

**Last updated:** March 28, 2026  
**Version:** Codernic E14, ai-agencee v0.6.57

## TL;DR

AI Agencee's **Codernic** is architected differently from GitHub Copilot, Claude Code, Cursor, and other coding assistants. Instead of a cloud-hosted autocomplete or chat interface, Codernic is:

- **A local-first module** you own and can call from any script, agent, or CI pipeline
- **An FTS5-indexed codebase map** that prevents hallucinated imports and functions
- **Three distinct modes** (ASK/PLAN/AGENT) instead of a single chat interface
- **DAG-composable** — wire it into supervised multi-agent workflows with retry, budget caps, and audit logs

**What this means for you:**

| If you need... | Use Copilot/Cursor/Claude Code | Use Codernic |
|----------------|-------------------------------|--------------|
| Autocomplete while typing | ✅ Excellent | ❌ Not designed for this |
| Chat-based "explain this code" | ✅ Works well | ✅ ASK mode (faster, FTS5-backed) |
| Plan a feature without executing it | ⚠️ Requires prompting discipline | ✅ Built-in PLAN mode |
| Multi-file atomic refactors | ⚠️ Limited, manual review required | ✅ Transactional FILE:/DELETE: protocol |
| Orchestrate with other agents (Backend/Frontend/QA) | ❌ Not possible | ✅ Codernic is a DAG lane |
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
- **Strengths:**
  - **Three modes** (ASK/PLAN/AGENT) instead of one chat interface
  - **DAG-composable** — call from any lane with supervisor retry + cost caps
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
| **Three-mode operation** (ASK/PLAN/AGENT) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Atomic multi-file refactor** | ❌ | ⚠️ Partial | ⚠️ Partial | ❌ | ❌ | ✅ |
| **Real imports** (never hallucinates) | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ |
| **Live context** (sees previous agent's work) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Transactional file writes** (all-or-nothing) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**Example: ASK mode**
```bash
You: "find all authentication functions"

Codernic (FTS5 query, <10ms):
- checkAccess (src/auth/check-access.ts:34)
- validateToken (src/auth/jwt.ts:12)
- assertRole (src/auth/roles.ts:18)
```

**Example: PLAN mode**
```bash
You: "plan: add rate limiting to /api/users"

Codernic:
1. Install express-rate-limit
2. Create src/middleware/rate-limit.ts
3. Apply middleware in src/server.ts
4. Add tests in tests/rate-limit.spec.ts
```

**Example: AGENT mode**
```bash
You: "add rate limiting to /api/users"

Codernic (executes the plan via DAG):
✅ Installed express-rate-limit
✅ Created src/middleware/rate-limit.ts
✅ Updated src/server.ts
✅ 3 files modified successfully
DAG execution completed in 12.4s
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

**DAG composition example:**
```json
{
  "lanes": [
    { "id": "codernic-index", "agentFile": "agents/codernic.agent.json" },
    { "id": "backend",        "agentFile": "agents/backend.agent.json", "dependsOn": ["codernic-index"] },
    { "id": "frontend",       "agentFile": "agents/frontend.agent.json", "dependsOn": ["codernic-index"] }
  ]
}
```

Backend and Frontend agents query the Codernic index before generating code — guarantees real imports and symbol references.

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
- ✅ You want to **compose code generation with other agents** (Backend/Frontend/QA in a DAG)
- ✅ You need **three modes** (ASK = query, PLAN = design, AGENT = execute)
- ✅ You need to **run in CI** or call from scripts (no IDE required)
- ✅ You need **enterprise features** (RBAC, audit, multi-tenant, GDPR, budget caps)
- ✅ You want **fully local** operation (SQLite + Ollama, air-gapped compliant)
- ✅ You want **atomic multi-file refactors** with transactional rollback
- ✅ You need **FTS5 speed** (<10ms symbol lookup on 449-file workspace)

---

## Hybrid Strategy: Copilot + Codernic

**Best of both worlds:**

1. **Use Copilot for autocomplete** — it's excellent at inline suggestions while typing
2. **Use Codernic for multi-file planning + execution:**
   - `@codernic find all authentication functions` (ASK mode)
   - `@plan add OAuth flow to the API` (PLAN mode)
   - `@agent add OAuth flow to the API` (AGENT mode — plan + execute atomically)
3. **Use Codernic in CI:**
   ```bash
   # DAG lane that runs after PR merge
   ai-kit run ./agents/post-merge.dag.json
   ```
   - Lane 1: Codernic updates README with new API routes
   - Lane 2: Codernic adds JSDoc to public functions
   - Lane 3: Codernic generates PR description with findings

This gives you **autocomplete UX** from Copilot and **orchestrated multi-agent workflows** from Codernic.

---

## Summary: Key Differentiators

| Dimension | Copilot/Claude/Cursor | Codernic |
|-----------|----------------------|----------|
| **Architecture** | Cloud-hosted IDE plugins | Local-first TypeScript module |
| **Context** | File-local or embeddings (uploaded) | FTS5 SQLite index (local) |
| **Speed** | ~200–500ms (cloud round-trip) | <10ms (FTS5 query) |
| **Modes** | Single chat interface | Three modes (ASK/PLAN/AGENT) |
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
A: Built-in: TypeScript, JavaScript, Python, Go. Extensible via `LanguageParser` plugin (30 lines to add Rust, C#, Java, etc.).

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
