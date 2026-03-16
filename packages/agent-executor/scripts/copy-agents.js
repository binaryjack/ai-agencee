/**
 * copy-agents.js
 *
 * INTENTIONALLY INERT — shadow copy removed (Fix A, 2026-03-16).
 *
 * Previously this script copied <repo-root>/agents/ → dist/agents/ on every
 * build.  That created a phantom copy of all demo DAGs inside the compiled
 * output directory.  On Windows, pnpm NTFS junctions meant that
 * process.cwd() could resolve to packages/agent-executor/dist/ (through
 * the junction at packages/cli/node_modules/@ai-agencee/engine → packages/
 * agent-executor).  When that happened, relative DAG paths were resolved
 * against dist/ instead of the repo root, producing ENOENT errors.
 *
 * The correct behaviour is:
 *   • Demo DAGs live ONLY in <repo-root>/agents/demos/
 *   • All callers (run-scenarios.js, CLI scripts, cloud-api) must pass
 *     absolute paths derived from their own __dirname or an explicit
 *     --project flag.
 *   • The engine never searches dist/ for DAG files.
 *
 * This script is kept as a no-op placeholder so the "build" script entry
 * in package.json does not need to change.
 */
'use strict';
console.log('[copy-agents] shadow copy disabled — agents/ live at repo root only');
