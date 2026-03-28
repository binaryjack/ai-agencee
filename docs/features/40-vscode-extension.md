# Feature 40: VS Code Extension

> **Status**: ✅ Production-ready  
> **Category**: Developer Experience  
> **Version**: 0.6.57  
> **Test Coverage**: Full integration testing

---

## Overview

The **AI Agencee VS Code Extension** transforms VS Code into a complete multi-agent orchestration environment. It integrates Commander mode for workflow execution, Codernic for codebase-aware assistance, visual editors for agents and DAGs, and a production-grade code indexing engine — all within your IDE.

**What makes it unique:**
- **Commander Mode**: Chat interface for running DAGs, creating agents, and executing workflows without leaving VS Code
- **Codernic**: Three-mode codebase assistant (ASK → PLAN → AGENT) with full project intelligence
- **Visual Editors**: Point-and-click agent and tech catalog management
- **Code Intelligence**: Real-time TypeScript/Python/Go symbol indexing with FTS5 search
- **Chat Participants**: `@ai-kit` and `@codernic` available in GitHub Copilot Chat

---

## Architecture

```
ai-agencee Extension
├── Commander Mode         — DAG execution & workflow management
├── Codernic              — Codebase-aware AI assistant (ASK/PLAN/AGENT)
├── Asset Management      — Agent, Rule, and Tech catalog tree views
├── Code Intelligence     — Real-time indexing + symbol explorer
├── Visual Editors        — Agent & Tech catalog editors
└── Chat Participants     — @ai-kit & @codernic in Copilot Chat
```

---

## Core Features

### 1. Commander Mode

**Purpose**: Execute AI Agencee workflows directly from VS Code without switching to terminal.

**Capabilities**:
- Run DAGs by selecting from available configurations
- Create and manage agents interactively
- Execute `ai-kit` CLI commands with real-time output
- Stream DAG execution progress with live cost tracking
- View execution history and results

**UI Location**: Secondary sidebar → Commander panel

**Key Commands**:
- `AI Agencee: Open Commander` — Launch Commander interface
- Chat-based DAG execution without JSON editing
- One-click agent scaffolding from templates

**Implementation**: WebView-based React interface with SSE event streaming

---

### 2. Codernic — Codebase Intelligence Assistant

**Three-Mode Operation**:

#### ASK Mode — Analyze & Query
**Purpose**: Answer questions about your codebase using AI Agencee intelligence.

**Capabilities**:
- Project structure analysis (tech stack, frameworks, architecture)
- Agent discovery (list available agents and their capabilities)
- DAG discovery (find and explain existing DAGs)
- Codebase health metrics (test coverage, type safety, dependencies)
- Symbol lookup (find classes, functions, types)

**Example Queries**:
```
"What agents are available in this project?"
"Explain the authentication flow in the backend"
"Show me all TypeScript interfaces related to user management"
"What's the test coverage of the API layer?"
```

**System Instructions**: `.agencee/config/codernic/rules/ask.xml`

---

#### PLAN Mode — Design Without Executing
**Purpose**: Generate implementation plans and DAG specifications without making changes.

**Capabilities**:
- Feature design with step-by-step breakdown
- DAG generation from natural language descriptions
- Architecture recommendations based on existing patterns
- Cost estimates for proposed workflows
- Risk analysis for planned changes

**Example Requests**:
```
"Plan authentication with JWT for the API"
"Design a DAG for adding a payment integration"
"How should I structure a multi-tenant feature?"
"Estimate cost of running the test generation DAG"
```

**Output**: Structured plans with:
- Implementation steps
- File changes required
- DAG JSON specification
- Estimated cost and execution time
- Risk factors and dependencies

**System Instructions**: `.agencee/config/codernic/rules/plan.xml`

---

#### AGENT Mode — Execute & Make Changes
**Purpose**: Execute commands, write code, and make actual changes to the codebase.

**Capabilities**:
- Execute DAGs with live progress tracking
- Generate and modify code files
- Create tests, documentation, and configuration files
- Run shell commands and scripts
- Apply multi-file patches atomically

**Example Commands**:
```
"Implement the UserService class with validation"
"Add tests for the authentication flow"
"Create a migration for the users table"
"Run the security audit DAG"
```

**Safety Features**:
- Dry-run mode shows changes before execution
- RBAC enforcement on all file operations
- Audit logging for every change
- Budget caps prevent runaway costs
- Supervisor checkpoints for approval gates

**System Instructions**: `.agencee/config/codernic/rules/agent.xml`

---

### 3. Hybrid Context Strategy

Codernic uses a **dual-mode context gathering** approach:

#### Index-Based (Primary)
- Queries pre-built SQLite FTS5 index (`.agencee/code-index.db`)
- **Fast**: <10ms for symbol lookups
- **Rich metadata**: function signatures, dependencies, line numbers
- **Works in cloud deployments** (no filesystem access needed)

#### Real-Time Fallback (Secondary)
- Direct workspace scanning using VS Code APIs
- **Always current**: reflects unsaved file changes
- **Zero maintenance**: no index required
- **Guaranteed results**: works even when index is stale or missing

**Fallback Logic**:
```typescript
if (indexExists() && isIndexFresh()) {
  return queryMcpIndex(query);  // Fast path
} else {
  return gatherRealTimeContext(query);  // Fallback
}
```

**Auto-refresh**: Index updates every 5 minutes when files change

---

### 4. Asset Management

**Tree Views** (Primary sidebar):

#### Assets Tree
- **Agents**: Browse, create, edit, delete agent configurations
- **Rules**: Manage coding rules and conventions
- **Techs**: Catalog of technologies and frameworks

**Operations**:
- Right-click → Create new agent/tech
- Double-click → Open in visual editor
- Rename, delete, duplicate via context menu
- Drag-and-drop organization (planned)

#### Indexed Files Tree
- Real-time view of all indexed files
- Grouped by directory structure
- Shows indexing status (✅ indexed, ⏳ pending, ❌ error)
- File metadata: symbols count, last indexed time

#### Symbol Explorer Tree
- Hierarchical view of all code symbols
- **Classes** → methods, properties
- **Functions** → parameters, return types
- **Interfaces** → fields, extends relationships
- **Types** → type definitions
- Click to jump to definition

---

### 5. Visual Editors

#### Agent Editor (AIE)
**Purpose**: Visual editor for `.agent.json` files.

**Features**:
- Form-based editing (no JSON required)
- Prompt template selection
- Tech stack picker (auto-discovered from catalog)
- Model tier assignment
- Check handler configuration
- Supervisor verdict rules

**File**: Opens via tree view or command palette

---

#### Tech Catalog Editor (TIE)
**Purpose**: Manage technology and framework definitions.

**Features**:
- Tech identification prompts
- Convention mining rules
- Code generation templates
- Agent association

**Use Case**: Define project-specific technologies for better context gathering

---

### 6. Code Intelligence Engine

**Real-Time Indexing**:
- **Languages**: TypeScript, JavaScript, Python, Go
- **Speed**: 435 files/second
- **Accuracy**: 100% symbol extraction (vs 70% with ctags)
- **Database**: SQLite with FTS5 full-text search

**Features**:
- Incremental re-indexing (<100ms single file)
- Symbol cross-referencing (find all usages)
- Dependency graph tracking
- Call hierarchy analysis
- Hover tooltips with signature info
- CodeLens annotations

**Commands**:
- `AI Agencee: Index Codebase` — Full reindex
- `AI Agencee: Search Symbols` — FTS5 query
- `AI Agencee: Show Dependency Graph` — Visual graph
- `AI Agencee: Validate Index` — Check integrity

**Performance** (vs competitors):
| Tool | Indexing | Accuracy | Features |
|------|----------|----------|----------|
| **AI Agencee** | 1.03s (449 files) | 100% | Symbols + deps + FTS5 |
| Sourcegraph | ~2-3s | 95% | Symbols only |
| OpenGrok | ~5-10s | 90% | Text search focus |
| ctags | ~0.5s | 70% | Basic tags only |

---

### 7. Chat Participants

#### @ai-kit Participant
**Purpose**: AI Agencee workflow orchestration in GitHub Copilot Chat.

**Slash Commands**:
- `/create-agent` — Scaffold new agent JSON
- `/create-dag` — Generate DAG specification
- `/create-rule` — Add coding rule to `.ai/rules.md`
- `/index` — Trigger codebase indexing
- `/run` — Execute ai-kit CLI command
- `/dag` — Run DAG orchestrator

**Example**:
```
@ai-kit /create-agent security-audit
@ai-kit /run plan --interactive
@ai-kit /dag execution-dag.json
```

---

#### @codernic Participant
**Purpose**: Codebase-aware assistant in Copilot Chat.

**Slash Commands**:
- `/ask` — Q&A mode about codebase
- `/plan` — Design features without execution
- `/agent` — Execute commands and changes

**Example**:
```
@codernic /ask What's the authentication flow?
@codernic /plan Add rate limiting to the API
@codernic /agent Implement UserService with tests
```

**Context Injection**: Automatically includes indexed symbol context in every query

---

## Workspace Setup

### Automatic Scaffolding

On first activation, the extension creates:

```
.agencee/
├── config/
│   ├── agents/          — Agent definitions
│   ├── codernic/
│   │   ├── prompts/     — Tech identification, convention mining, agent generation
│   │   └── rules/       — ask.xml, plan.xml, agent.xml
│   └── techs/           — Technology catalog
├── code-index.db        — SQLite FTS5 index (auto-generated)
└── logs/                — Extension logs
```

### Package Detection

The extension detects and validates:
- `@ai-agencee/cli` installation
- Node.js version (≥20 required)
- pnpm version (≥10 recommended)
- TypeScript configuration

**Auto-install prompt**: If `@ai-agencee/cli` is missing, one-click install via pnpm

---

## Configuration

### Extension Settings

```json
{
  "ai-agencee.autoIndex": true,
  "ai-agencee.indexRefreshInterval": 300000,  // 5 minutes
  "ai-agencee.enableCodernic": true,
  "ai-agencee.enableCommander": true,
  "ai-agencee.logLevel": "info"
}
```

### MCP Integration

Codernic connects to the local MCP server for index queries:

```json
// .vscode/settings.json
{
  "ai-agencee.mcpServer": {
    "command": "node",
    "args": ["packages/mcp/dist/bin/mcp-server.js"],
    "cwd": "${workspaceFolder}"
  }
}
```

---

## Use Cases

### 1. Onboarding New Developers
```
@codernic /ask What's the project architecture?
@codernic /ask Where is the authentication logic?
@codernic /ask Show me the main API endpoints
```

### 2. Feature Planning
```
@codernic /plan Add role-based access control
[Review generated plan]
@codernic /agent Execute the RBAC plan
```

### 3. Code Generation
```
@codernic /agent Create UserRepository with CRUD operations
@codernic /agent Add tests for UserRepository
@codernic /agent Generate OpenAPI spec for User endpoints
```

### 4. DAG Execution
```
Commander → Select "Security Audit DAG"
→ Configure parameters
→ Run with live progress tracking
→ View results and cost summary
```

### 5. Codebase Exploration
```
Symbol Explorer → UserService
→ See all methods, dependencies
→ Call hierarchy visualization
→ Click to navigate to definition
```

---

## Performance Metrics

### Indexing Performance
- **449 TypeScript files**: 1.03s
- **975 symbols extracted**: 100% accuracy
- **970 dependencies tracked**: Import relationships
- **Incremental update**: <100ms (single file change)

### Query Performance
- **Symbol lookup**: <10ms (FTS5 index)
- **Full-text search**: <50ms (10 results)
- **Dependency graph**: <200ms (full project)

### Memory Usage
- **Indexing peak**: ~50 MB
- **Runtime steady-state**: ~20 MB
- **Database size**: ~500 KB (449 files)

---

## Enterprise Features

### Security
- **RBAC enforcement**: All operations tagged with principal
- **Audit logging**: Immutable SHA-256 hash-chained logs
- **PII scrubbing**: Automatic redaction before LLM calls
- **Prompt injection detection**: 10 signature families

### Compliance
- **GDPR commands**: `data:export`, `data:delete` via Commander
- **SOC2-ready**: Audit trail, access control, encryption
- **Multi-tenant isolation**: Per-tenant workspace scoping

### Cost Control
- **Budget caps**: Per-run and per-lane limits
- **Cost tracking**: Real-time accumulation in Commander
- **Model routing**: Automatic downgrade to stay within budget

---

## Comparison with Competitors

| Feature | AI Agencee | Cursor | Copilot | Cline |
|---------|------------|--------|---------|-------|
| **DAG Orchestration** | ✅ Native | ❌ | ❌ | ❌ |
| **Multi-mode Assistant** | ✅ ASK/PLAN/AGENT | ❌ | ❌ | ⚠️ Limited |
| **Code Indexing** | ✅ FTS5 SQLite | ⚠️ Basic | ⚠️ Cloud | ❌ |
| **Audit Logging** | ✅ Hash-chained | ❌ | ❌ | ❌ |
| **RBAC** | ✅ Principal-tagged | ❌ | ❌ | ❌ |
| **Budget Enforcement** | ✅ Per-run caps | ❌ | ❌ | ❌ |
| **Local-first** | ✅ Ollama support | ⚠️ Partial | ❌ Cloud | ⚠️ Partial |
| **Visual DAG Editor** | ✅ React-based | ❌ | ❌ | ❌ |
| **Chat Participants** | ✅ @ai-kit + @codernic | ❌ | ✅ @workspace | ❌ |

---

## Installation

### From VSIX (Development)
```bash
code --install-extension ai-agencee-ext-0.6.57.vsix
```

### From Marketplace (Planned)
```
VS Code → Extensions → Search "AI Agencee"
```

### Requirements
- **VS Code**: ≥1.95.0
- **Node.js**: ≥20
- **pnpm**: ≥10 (recommended)
- **TypeScript**: ≥5.4 (for full features)

---

## Roadmap

### v0.7 (Q2 2026)
- Marketplace publication
- Inline diff preview for Agent mode changes
- Multi-workspace support
- Extension settings UI

### v0.8 (Q3 2026)
- Remote SSH support
- Codespaces integration
- Team settings sync
- Custom theme support

### v0.9 (Q4 2026)
- DAG debugger with breakpoints
- Time-travel debugging for runs
- Performance profiler
- AI-assisted refactoring

---

## Resources

- **Extension Documentation**: `/docs/vscode-extension`
- **Codernic Guide**: `/docs/features/28-code-assistant.md`
- **Commander Mode**: `/docs/vscode-extension/commander-mode.md`
- **API Reference**: `/docs/api/extension-api.md`
- **Troubleshooting**: `/docs/troubleshooting/vscode-extension.md`

---

## Summary

The AI Agencee VS Code Extension brings enterprise-grade multi-agent orchestration directly into your development environment. With Commander for workflow execution, Codernic's three-mode intelligence, visual editors, and production-ready code indexing, it eliminates context-switching while maintaining full audit trails, RBAC enforcement, and budget controls.

**Key Differentiator**: Unlike standalone coding assistants, this extension embeds code generation inside governed, supervised, budget-capped DAG workflows — ensuring every change is audited, attributed, and compliant.
