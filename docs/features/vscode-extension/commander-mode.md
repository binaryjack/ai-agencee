# Commander Mode

> **Part of**: VS Code Extension v0.6.57  
> **Purpose**: Chat-based DAG execution and workflow management inside VS Code  
> **UI Location**: Secondary sidebar → Commander panel

---

## Overview

**Commander Mode** is the visual chat interface for executing AI Agencee workflows directly from VS Code. It eliminates the need to switch to terminal for `ai-kit` commands, provides real-time execution feedback with SSE streaming, and offers one-click access to agent scaffolding and DAG orchestration.

**Key Difference from Codernic**: Commander is focused on **workflow orchestration** (running DAGs, managing agents), while Codernic is focused on **codebase intelligence** (answering questions, planning features, generating code).

---

## Features

### 1. DAG Execution

**Launch DAGs visually** without writing terminal commands.

**How it works**:
1. Open Commander panel (Secondary sidebar)
2. Select a DAG from available configurations
3. Configure parameters (if required)
4. Click "Run DAG"
5. Watch real-time progress with lane-by-lane status updates

**Live Streaming**:
- Lane start/complete events
- Token streaming from LLM calls
- Real-time cost accumulation
- Supervisor verdicts (APPROVE, RETRY, ESCALATE)
- Barrier synchronization status

**Example Use Cases**:
```
Run security audit DAG
→ Watch Backend & Frontend lanes execute in parallel
→ See barrier sync when both complete
→ View Testing lane execution
→ Get final cost summary
```

---

### 2. Agent Management

**Create, edit, and manage agents** through chat interface.

**Operations**:
- **Create**: `Create new security-audit agent`
- **List**: `Show all available agents`
- **Edit**: Opens visual editor for selected agent
- **Delete**: `Remove deprecated-agent`

**Scaffolding Templates**:
- Security audit agent
- Documentation generator
- Test creation agent
- PR description agent
- Database migration agent
- Accessibility checker

---

### 3. AI-Kit CLI Integration

**Execute any `ai-kit` command** with real-time output.

**Command Categories**:

#### Plan Commands
```
ai-kit plan --interactive
ai-kit plan --output sprint-plan.md
```

#### DAG Commands
```
ai-kit agent:dag agents/execution-dag.json
ai-kit visualize --format mermaid
ai-kit advise --runs agents/runs/
```

#### Data Commands
```
ai-kit data:export --tenant tenant-123
ai-kit data:delete --principal user@example.com
ai-kit data:list-tenants
```

#### Code Intelligence
```
ai-kit code:index
ai-kit code:search "UserService"
ai-kit code:watch
```

---

### 4. Real-Time Feedback

**Live execution monitoring** with SSE event streaming.

**What you see**:
- Lane status badges (⏳ running, ✅ complete, ❌ failed)
- Token counter (cumulative across all lanes)
- Cost accumulator (updates with every LLM call)
- Supervisor decisions with rationale
- Barrier wait states

**Event Types**:
- `dag:start` — Run initiated
- `lane:start` — Lane execution begins
- `lane:complete` — Lane finished with verdict
- `token:delta` — Incremental token count
- `cost:update` — Running cost total
- `barrier:sync` — Barrier reached, waiting for parallel lanes
- `dag:end` — Final summary with total cost

---

### 5. Execution History

**View past runs** with full details.

**History Panel**:
- Run timestamp
- DAG name
- Final status (complete, failed, partial)
- Total cost
- Duration
- Click to view full audit log

**Filters**:
- By DAG name
- By date range
- By status (success, failure, partial)
- By cost threshold

---

## User Interface

### Chat Input
Natural language or command syntax:

**Natural Language**:
```
Run the security audit workflow
Create a new agent for database migrations
Show me the last 5 runs
What agents are available?
```

**Command Syntax**:
```
/run security-audit-dag.json
/create-agent database-migration
/list-agents
/history --last 10
```

### Side Panels

**Left Panel**: Conversation history
- Previous messages
- Command history
- Run results

**Right Panel**: Live execution view
- Current DAG visualization
- Lane status
- Cost and token metrics

---

## Integration with Codernic

Commander and Codernic work **together** for complete workflow coverage:

| Task | Use | Example |
|------|-----|---------|
| **Analyze codebase** | Codernic ASK | `@codernic /ask What's the auth flow?` |
| **Plan feature** | Codernic PLAN | `@codernic /plan Add rate limiting` |
| **Generate DAG** | Codernic PLAN | Output includes DAG JSON spec |
| **Run DAG** | Commander | Select DAG → Run |
| **Execute code changes** | Codernic AGENT | `@codernic /agent Implement rate limiter` |
| **View results** | Commander | History panel with audit log |

**Workflow Example**:
```
1. Codernic: @codernic /ask Show me the API structure
2. Codernic: @codernic /plan Add authentication to API
3. Commander: Save plan output as auth-dag.json
4. Commander: Run auth-dag.json
5. Commander: Monitor execution, see cost
6. Commander: Review results in history
```

---

## Configuration

### Extension Settings

```json
{
  "ai-agencee.commander.enabled": true,
  "ai-agencee.commander.autoRefresh": true,
  "ai-agencee.commander.maxHistory": 50,
  "ai-agencee.commander.showTokens": true,
  "ai-agencee.commander.showCost": true
}
```

### Workspace Settings

Commander respects workspace-level configuration:

**`.agencee/config.json`**:
```json
{
  "commander": {
    "defaultDAGPath": "agents/dags",
    "defaultAgentPath": "agents",
    "enableNotifications": true,
    "costWarningThreshold": 0.50
  }
}
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+C` | Open Commander |
| `Ctrl+Enter` | Send message |
| `↑` / `↓` | Navigate history |
| `Ctrl+K` | Clear chat |
| `Esc` | Cancel running DAG |

---

## Example Sessions

### Session 1: Security Audit
```
User: Run security audit on the backend
Commander: Starting security-audit-dag.json...
          
          Lane: Backend Analysis [RUNNING]
          → Analyzing authentication flow
          → Checking for SQL injection vulnerabilities
          → Scanning for XSS patterns
          Lane: Backend Analysis [COMPLETE] ✅
          Verdict: APPROVE
          
          Lane: Dependency Audit [RUNNING]
          → Running npm audit
          → Checking CVE database
          Lane: Dependency Audit [COMPLETE] ✅
          Verdict: APPROVE
          
          DAG: COMPLETE
          Cost: $0.23
          Duration: 2m 15s
```

### Session 2: Create Agent
```
User: Create a new agent for API documentation
Commander: Opening agent creation wizard...

          Agent Name: api-documentation
          Template: Documentation Generator
          
          Configuration:
          ✓ Tech stack: Auto-detected (TypeScript, Express)
          ✓ Output format: OpenAPI 3.0 + Markdown
          ✓ Model tier: Sonnet (code analysis)
          ✓ Checks: file-exists, json-has-key, grep
          
          Agent saved to: .agencee/config/agents/api-documentation.agent.json
          
User: Run it
Commander: Starting api-documentation-dag.json...
          [... execution output ...]
```

---

## Performance

### Startup Time
- **Cold start**: <500ms (webview initialization)
- **Warm start**: <100ms (cached)

### Execution Overhead
- **SSE connection**: <50ms latency
- **Event rendering**: <10ms per event
- **History loading**: <200ms (50 runs)

### Resource Usage
- **Memory**: ~30 MB (webview + state)
- **CPU**: <5% idle, <15% during streaming

---

## Troubleshooting

### Commander not opening
1. Check extension is activated: `AI Agencee` in status bar
2. Check workspace has `.agencee/` folder
3. Reload window: `Ctrl+Shift+P` → "Reload Window"

### DAG execution fails
1. Check `ai-kit` CLI is installed: `ai-kit --version`
2. Verify DAG JSON is valid: `ai-kit check dag.json`
3. Check output channel: `AI Agencee` logs

### SSE connection issues
1. Check firewall allows localhost connections
2. Verify no blocking proxy
3. Check extension output for connection errors

### Cost not updating
1. Ensure `.agencee/config/model-router.json` exists
2. Check model tier assignments
3. Verify cost tracking is enabled in settings

---

## Comparison with Terminal

| Feature | Commander | Terminal (`ai-kit`) |
|---------|-----------|---------------------|
| **DAG execution** | Visual selection + click | `ai-kit agent:dag dag.json` |
| **Live progress** | Real-time SSE updates | Text output only |
| **Cost tracking** | Live accumulator | Final summary only |
| **Agent creation** | Visual wizard | Manual JSON editing |
| **History** | Clickable list | File system browsing |
| **Interruption** | Click "Cancel" button | `Ctrl+C` |
| **Multi-window** | Embedded in VS Code | Separate terminal |

**When to use Commander**: Interactive development, visual feedback, frequent agent management

**When to use Terminal**: CI/CD, scripting, automation, headless environments

---

## Roadmap

### v0.7 (Q2 2026)
- Inline diff preview for DAG changes
- Visual DAG editor integration
- Multi-DAG parallel execution
- Export run history to CSV/JSON

### v0.8 (Q3 2026)
- Run comparison (diff two runs)
- Cost forecasting (estimate before run)
- Custom templates for agents
- Team settings sync

### v0.9 (Q4 2026)
- DAG debugger with breakpoints
- Time-travel debugging
- Performance profiler
- AI-assisted optimization

---

## Resources

- **Main Documentation**: [/docs/features/40-vscode-extension.md](../40-vscode-extension.md)
- **Codernic Guide**: [/docs/features/28-code-assistant.md](../28-code-assistant.md)
- **CLI Reference**: [/docs/features/15-cli-commands.md](../15-cli-commands.md)
- **Event Bus**: [/docs/features/08-event-bus.md](../08-event-bus.md)

---

## Summary

Commander Mode transforms VS Code into a complete AI orchestration control center. With chat-based DAG execution, real-time progress monitoring, visual agent management, and full integration with Codernic's codebase intelligence, it eliminates context-switching while maintaining enterprise-grade audit trails and cost controls.

**One interface. Full orchestration. Zero terminal commands.**
