# DAG Preview Mode (Phase 3.1)

## Overview

The `--preview` flag provides detailed execution analysis **before** running a DAG, helping developers understand:
- What files will be analyzed
- How execution will be phased based on dependencies
- Estimated cost, duration, and energy usage
- Budget compliance

This prevents surprises and allows review before committing to execution.

## Usage

```bash
# Preview execution plan with detailed analysis
ai-kit agent:dag security-scan.dag.json --preview

# Preview with budget cap warning
ai-kit agent:dag code-review.dag.json --preview --budget 0.50

# Preview specific DAG file
ai-kit agent:dag ./agents/my-custom-dag.json --preview
```

## Preview Output

The preview displays:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📋 DAG PREVIEW — Execution Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  DAG: Security Scan  
  Comprehensive security analysis of codebase

Phase 1:
  ├─ secret-scanner
  │  Agent: Secret Scanner
  │  Model: haiku
  │  Checks: 5
  │  Files: src/**/*.ts, package.json, .env.example
  │  Cost: $0.0113
  │  Time: ~25s
  └─ Phase total: $0.0113 | ~25s

Phase 2: (parallel execution)
  ├─ dependency-audit 🔍
  │  Agent: Dependency Auditor
  │  Model: sonnet
  │  Checks: 3
  │  Files: package.json, package-lock.json, yarn.lock
  │  Cost: $0.0810
  │  Time: ~30s
  ├─ sql-injection-scanner
  │  Agent: SQL Injection Scanner
  │  Model: haiku
  │  Checks: 4
  │  Files: src/**/*.ts, src/db/**/*.sql
  │  Cost: $0.0090
  │  Time: ~20s
  └─ Phase total: $0.0900 | ~30s

Total Estimate:
  💰 Cost: $0.1013
  ⚡ Energy: 11.26 Wh
  ⏱️  Duration: ~55s
  🎯 Budget: $0.3987 remaining (cap: $0.50)

  Files analyzed: 8
    • .env.example
    • package.json
    • package-lock.json
    • src/**/*.sql
    • src/**/*.ts
    • yarn.lock

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  💚 DRY RUN — No execution, no costs
  • No LLM calls made
  • No files modified
  • Estimates only
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Interactive Approval

After viewing the preview, you'll be prompted:

```
What would you like to do?
  ✅ Proceed with execution
  ✏️  Edit DAG file
  ❌ Cancel
```

- **Proceed**: Continues to execution immediately
- **Edit**: Opens the DAG file in your default editor (`$EDITOR`, `$VISUAL`, or `code`)
- **Cancel**: Exits without running

## Phase Computation

Phases are computed based on lane dependencies:

- **Phase 1**: Lanes with no dependencies (entry points)
- **Phase 2**: Lanes that depend only on Phase 1 lanes
- **Phase N**: Lanes that depend on lanes from previous phases

Lanes in the same phase with no cross-dependencies run **in parallel**.

## Cost Estimation

Cost estimates use current Anthropic pricing (Jan 2026):

| Model  | Input ($/1M tokens) | Output ($/1M tokens) | Avg ($/1k tokens) |
|--------|--------------------:|---------------------:|------------------:|
| Haiku  | $0.25              | $1.25                | $0.00075          |
| Sonnet | $3.00              | $15.00               | $0.009            |
| Opus   | $15.00             | $75.00               | $0.045            |
| Mock   | $0.00              | $0.00                | $0.00             |

Assumptions:
- Average check: ~2k input tokens, ~1k output = 3k total
- Energy: ~1 Wh per 1000 tokens

## File Analysis

File patterns are extracted from agent `checks.files` arrays:

```json
{
  "checks": [
    {
      "id": "secret-scan",
      "files": ["src/**/*.ts", "package.json", ".env.example"]
    }
  ]
}
```

Files are deduplicated and sorted alphabetically.

## Budget Warnings

If the estimated cost exceeds the `--budget` cap:

```
⚠️  Budget: EXCEEDED by $0.0013 (cap: $0.10)
```

The preview will still allow you to proceed (for manual override), but actual execution will abort if budget is exceeded during runtime.

## Comparison with --dry-run

| Feature | --dry-run | --preview |
|---------|-----------|-----------|
| Validates DAG syntax | ✅ | ✅ |
| Shows lane structure | ✅ | ✅ |
| Phase-by-phase breakdown | ❌ | ✅ |
| File access analysis | ❌ | ✅ |
| Cost/duration estimates | ❌ | ✅ |
| Energy consumption | ❌ | ✅ |
| Interactive approval | ❌ | ✅ |
| Edit DAG option | ❌ | ✅ |
| Budget compliance check | ❌ | ✅ |

Use `--dry-run` for quick validation, `--preview` for detailed review before execution.

## Environment Variables

- `EDITOR` or `VISUAL`: Editor to open DAG files (default: `code`)

## Examples

### 1. Preview before expensive run

```bash
# Check cost before running comprehensive analysis
ai-kit agent:dag full-analysis.dag.json --preview --budget 1.00
```

### 2. Quick iteration on DAG design

```bash
# Preview → Edit → Preview loop
ai-kit agent:dag my-workflow.dag.json --preview
# Select "Edit DAG file"
# Make changes...
ai-kit agent:dag my-workflow.dag.json --preview
# Select "Proceed with execution"
```

### 3. CI/CD pre-flight check

```bash
# Preview in CI to ensure cost expectations are met
ai-kit agent:dag ci-checks.dag.json --preview --yes --json > preview.json
jq '.budgetExceeded' preview.json  # Check if budget exceeded
```

## Implementation Details

**Files changed:**
- `packages/cli/src/commands/dag/dag-preview.ts` (NEW): Core preview logic
- `packages/cli/src/commands/dag/run-dag.ts`: Integration with runDag()
- `packages/cli/bin/ai-kit.ts`: CLI --preview flag

**Dependencies:**
- `prompts`: Interactive approval
- `node:child_process`: Editor integration

**Type-safe:** Full TypeScript interfaces for `DagPreview`, `PhasePreview`, `LanePreview`.

## Future Enhancements

- JSON output mode for CI/CD integration
- Cost breakdown by check (not just lane)
- Detailed token estimation per checkpoint
- Historical cost comparison
- Preview caching for faster re-runs
