# Path Resolution in ai-agencee

> **Applies to**: `@ai-agencee/engine`, `@ai-agencee/cli`, `ai-kit`, demo scripts.

This document explains how DAG file paths and the project root are resolved,
what can go wrong, and how the built-in guards protect you.

---

## Overview

Three separate "path resolution" steps happen every time you run a DAG:

```
1. projectRoot   ← where is the repo / user project?
2. dagFilePath   ← where is the .dag.json file?
3. agentsBaseDir ← where are agentFile / supervisorFile resolved from?
```

All three cascade: if step 1 is wrong, steps 2 and 3 are wrong too.

---

## 1. Project root resolution

### CLI (`ai-kit agent:dag`)

```
--project <path>  →  path.resolve(<path>)           (explicit, always correct)
(omitted)         →  findProjectRoot(process.cwd())  (auto-detect, see below)
```

`findProjectRoot` walks up the directory tree from the current working
directory until it finds a folder containing one of:

| Marker | Meaning |
|---|---|
| `agents/` | The repo ships or manages its own DAG library |
| `package.json` | A Node.js project root |
| `pnpm-workspace.yaml` | A pnpm monorepo root |

After finding a candidate root, `validateProjectRoot` asserts that an
`agents/` directory exists there. If it does not, the CLI throws:

```
❌ Project root not found: Could not locate project root from: /some/path
  Pass --project <repo-root> to set the correct root explicitly.
```

### MCP server

```ts
const projectRoot = typeof a.projectRoot === 'string'
  ? a.projectRoot   // caller-supplied absolute path
  : process.cwd();  // subprocess CWD
```

When using the MCP `agent-dag` tool, always pass `projectRoot` explicitly
as an absolute path to avoid relying on the subprocess working directory.

### Programmatic API

```ts
const orchestrator = new DagOrchestrator('/absolute/path/to/project', options);
```

Always supply an absolute path. `DagOrchestrator` does not walk up the tree —
it trusts whatever it receives.

---

## 2. DAG file path resolution

```
path.isAbsolute(dagFile)
  ? dagFile                            // used as-is
  : path.resolve(projectRoot, dagFile) // joined to the project root
```

**Best practice for demo scripts**: use `path.join(__dirname, '..', 'agents', 'demos', ...)`.
This makes the path absolute at definition time and is completely CWD-independent.

**Best practice for CLI calls**: pass an absolute path, or run the command from
the repo root.

---

## 3. agentsBaseDir (agent / supervisor file resolution)

Within `DagOrchestrator.execute()`:

```ts
const agentsBaseDir = options.agentsBaseDir ?? dagDir ?? projectRoot;
```

Where `dagDir = path.dirname(dagFilePath)`.

For demo DAGs, each sub-directory is self-contained:
- `agentFile: "cve-scan.agent.json"` is resolved from `agents/demos/09-security-audit/`
- `modelRouterFile: "../model-router.json"` is resolved from `agents/demos/`

This works correctly as long as the DAG file path in step 2 was resolved to
the right absolute location.

---

## Common failure modes

### ENOENT on the DAG file itself

```
Error: DAG file not found: /some/wrong/path/agents/demos/09-security-audit/security-audit.dag.json
  projectRoot : /some/wrong/path
  dagFile arg : agents/demos/09-security-audit/security-audit.dag.json
  Tip: pass --project <repo-root> to set the correct project root.
```

**Cause**: `projectRoot` was resolved to the wrong directory (wrong CWD, wrong `--project`).
**Fix**: run from the repo root, or pass `--project /absolute/path/to/repo`.

### Windows: path resolves through a pnpm NTFS junction

On Windows, pnpm creates NTFS junctions for workspace package links.
`packages/cli/node_modules/@ai-agencee/engine` is a junction pointing to
`packages/agent-executor`. If a process navigates through this junction,
`process.cwd()` may return the logical junction path (e.g.
`...\agent-executor\dist\`) rather than the canonical filesystem path.

The `findProjectRoot` walk-up guard corrects this automatically: even if
`process.cwd()` returns a path inside `dist/`, the walk-up finds the real
repo root containing `agents/` and uses that instead.

### `dist/agents/` no longer exists

Previously, `packages/agent-executor/scripts/copy-agents.js` copied all
demo DAGs into `packages/agent-executor/dist/agents/` on every build.
This created a phantom copy that made running from the `dist/` directory
accidentally work on some machines and fail on others.

**This copy has been removed (2026-03-16).** Demo DAGs live exclusively in
`<repo-root>/agents/demos/`. The `copy-agents.js` script is now a no-op
placeholder.

---

## Demo scripts

All demo runner scripts (`scripts/run-scenarios.js`, `scripts/demo.js`)
derive `root` from `__dirname`:

```js
const root = path.resolve(__dirname, '..');
// All DAG paths:
path.join(root, 'agents', 'demos', '09-security-audit', 'security-audit.dag.json')
```

This is **CWD-independent** — the script works regardless of what directory
you invoke it from.

---

## Deployment checklist (Linux servers / Docker / CI)

| Concern | Required action |
|---|---|
| Docker `WORKDIR` | Set to repo root (`/app`), or always pass `--project /app` |
| systemd service | `WorkingDirectory=` pointing to repo root, or use `--project` |
| CI runners | Always `cd` to repo root before calling `ai-kit`, or pass `--project $GITHUB_WORKSPACE` |
| MCP server | Pass `projectRoot` as an absolute path in every `agent-dag` tool call |
| Programmatic | Pass absolute `projectRoot` to `new DagOrchestrator(...)` |
