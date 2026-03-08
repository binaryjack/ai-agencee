# ai-agencee Python SDK

Python wrapper for the [ai-agencee](https://github.com/binaryjack/ai-starter-kit) multi-agent framework.

## Prerequisites

- **Python 3.9+**
- **Node.js 20+** with `ai-kit` available:

```bash
npm install -g @ai-agencee/cli
# or use npx — the SDK falls back to `npx --yes @ai-agencee/cli` automatically
```

## Installation

```bash
pip install ai-agencee
```

## Quick Start

### Run a DAG pipeline

```python
from ai_agencee import run_dag

result = run_dag("agents/dag.json", project_root="/path/to/my-project")

print(result["status"])          # "success" | "partial" | "failed"
print(result["summary"])         # human-readable summary
for finding in result["findings"]:
    print(" •", finding)
```

### Scope to a specific tenant

```python
result = run_dag(
    "agents/security-review.dag.json",
    project_root=".",
    tenant_id="acme-corp",
    budget_usd=2.50,
)
```

### List available agents

```python
from ai_agencee import list_agents

for agent in list_agents(project_root="."):
    print(agent["name"], "—", agent.get("description", ""))
```

### Error handling

```python
from ai_agencee import run_dag, AiAgenceeError, CliNotFoundError

try:
    result = run_dag("agents/dag.json")
except CliNotFoundError:
    print("Install Node.js 20+ and run: npm install -g @ai-agencee/cli")
except AiAgenceeError as exc:
    print(f"DAG failed (exit {exc.returncode}): {exc}")
```

## API Reference

### `run_dag(dag_file, *, project_root=".", budget_usd=None, provider=None, tenant_id=None, timeout=300)`

Run a DAG pipeline synchronously. Returns the parsed JSON result dict.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `dag_file` | `str \| Path` | — | Path to DAG JSON, relative to `project_root` |
| `project_root` | `str \| Path` | `"."` | Working directory for the CLI process |
| `budget_usd` | `float \| None` | `None` | Per-run USD spend cap |
| `provider` | `str \| None` | `None` | Force a specific provider (`"anthropic"`, `"openai"`, `"mock"`) |
| `tenant_id` | `str \| None` | `None` | Tenant isolation key (sets `AIKIT_TENANT_ID`) |
| `timeout` | `int` | `300` | Max seconds to wait |

### `list_agents(*, project_root=".")`

Return a list of agent definition dicts found in the project.

### Exceptions

| Exception | When |
|-----------|------|
| `CliNotFoundError` | `ai-kit` and `npx` are both missing from PATH |
| `AiAgenceeError` | CLI exits with non-zero status; has `.returncode` and `.stderr` |

## License

MIT
