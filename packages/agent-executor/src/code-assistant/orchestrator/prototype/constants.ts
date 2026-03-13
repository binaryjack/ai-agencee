/**
 * Shared constants for the Code Assistant Orchestrator prototype methods.
 *
 * Centralised here so every prototype file imports from one place — changing a
 * ceiling or the system prompt never requires touching the business logic files.
 */

import type { TaskType } from '../../../lib/llm-provider.js';

// ─── Context-window budgets ───────────────────────────────────────────────────

/** Maximum symbols pulled from the FTS5 index per generation request. */
export const MAX_SYMBOLS    = 40;

/**
 * Maximum distinct source files whose content is injected into the prompt.
 * Kept deliberately low — each file can be up to MAX_FILE_LINES long and we
 * want to remain well inside the LLM context window.
 */
export const MAX_FILES      = 8;

/**
 * Lines taken from each source file.  We truncate rather than summarise so the
 * LLM sees real syntax — import paths, signatures, function bodies — instead of
 * paraphrased prose that could introduce hallucinated symbol names.
 */
export const MAX_FILE_LINES = 200;

// ─── Mode → TaskType mapping ─────────────────────────────────────────────────

/**
 * Maps each user-facing Codernic mode to the ModelRouter TaskType that selects
 * the right model family (Haiku / Sonnet / Opus).
 *
 * quick-fix, feature  → Sonnet  (creative generation, balanced cost)
 * refactor            → Sonnet  (restructuring, code-aware)
 * debug               → Haiku   (deterministic analysis, cheap)
 */
export const MODE_TASK_TYPE: Record<string, TaskType> = {
  'quick-fix': 'code-generation',
  'feature':   'code-generation',
  'refactor':  'refactoring',
  'debug':     'file-analysis',
};

// ─── System prompt ────────────────────────────────────────────────────────────

/**
 * Stable system prompt injected on every generation call.
 *
 * Design principles:
 * - Output-format rules are explicit and machine-parseable (## FILE / ## DELETE).
 * - The LLM is forbidden from inventing symbols not present in the context, which
 *   is the #1 source of non-compiling code in competing tools.
 * - Dry-run mode is handled at the call site (execute.ts), not here.
 */
export const SYSTEM_PROMPT = `\
You are Codernic, an expert AI coding engine integrated into the ai-agencee platform.
You receive a natural-language task and real codebase context (symbol signatures and file
content) extracted from a live SQLite index — no hallucinated imports, only real symbols.

OUTPUT CONTRACT — follow exactly, no exceptions:
1. Emit only ## FILE or ## DELETE blocks. No prose, no explanations outside them.
2. File create / full-replace format:
   ## FILE: relative/path/to/file.ts
   \`\`\`typescript
   // entire file content including unchanged parts
   \`\`\`
3. File delete format:
   ## DELETE: relative/path/to/file.ts
4. Only reference symbols that appear verbatim in the provided context section.
5. Preserve existing import paths, naming conventions, and the project's code style.
6. A ## FILE block replaces the entire file — always include unmodified sections too.`;
