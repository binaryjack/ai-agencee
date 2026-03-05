/**
 * G-37: Prompt Distillation — collect high-quality LLM runs as few-shot examples
 * that get injected into future prompts via PromptRegistry.
 *
 * Flow:
 *   1. After a lane produces an APPROVE verdict, `saveExample()` is called.
 *   2. The raw prompt+response pair is stored under `.agents/examples/<taskType>/`.
 *   3. On the next run, `PromptRegistry.render()` calls `loadExamples()` which
 *      injects the saved pairs as an <examples> XML block.
 *
 * This enables zero-cost self-improvement: the model sees its best outputs as
 * demonstrations, which measurably improves subsequent responses on similar tasks.
 *
 * Usage (manual):
 *   import { saveExample, loadExamples } from './distillation.js';
 *   await saveExample('code-review', runId, { prompt: '…', response: '…' });
 *   const examples = await loadExamples('code-review', { limit: 3 });
 */

import { existsSync } from 'fs'
import * as fs from 'fs/promises'
import * as path from 'path'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExampleRecord {
  runId: string;
  taskType: string;
  prompt: string;
  response: string;
  savedAt: string;
  /** Optional score 0-1 (e.g., from eval harness). Used to rank examples. */
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface LoadExamplesOptions {
  /** Maximum number of examples to return. Default: 3 */
  limit?: number;
  /** Minimum score threshold. Default: 0.0 */
  minScore?: number;
  /** Root of the project where .agents/ lives. Default: process.cwd() */
  projectRoot?: string;
}

export interface SaveExampleOptions {
  score?: number;
  metadata?: Record<string, unknown>;
  /** Root of the project where .agents/ lives. Default: process.cwd() */
  projectRoot?: string;
}

// ─── Save ─────────────────────────────────────────────────────────────────────

/**
 * Persist a (prompt, response) pair as a training example for `taskType`.
 * Files are written to `.agents/examples/<taskType>/<runId>.json`.
 */
export async function saveExample(
  taskType: string,
  runId: string,
  content: { prompt: string; response: string },
  options: SaveExampleOptions = {}
): Promise<void> {
  const root = options.projectRoot ?? process.cwd();
  const dir = path.join(root, '.agents', 'examples', sanitizeSegment(taskType));

  await fs.mkdir(dir, { recursive: true });

  const record: ExampleRecord = {
    runId,
    taskType,
    prompt: content.prompt,
    response: content.response,
    savedAt: new Date().toISOString(),
    score: options.score,
    metadata: options.metadata,
  };

  const filePath = path.join(dir, `${sanitizeSegment(runId)}.json`);
  await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');
}

// ─── Load ─────────────────────────────────────────────────────────────────────

/**
 * Load saved examples for `taskType`, sorted by score then recency.
 * Returns at most `limit` examples.
 */
export async function loadExamples(
  taskType: string,
  options: LoadExamplesOptions = {}
): Promise<ExampleRecord[]> {
  const root = options.projectRoot ?? process.cwd();
  const limit = options.limit ?? 3;
  const minScore = options.minScore ?? 0.0;
  const dir = path.join(root, '.agents', 'examples', sanitizeSegment(taskType));

  if (!existsSync(dir)) return [];

  let files: string[];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }

  const records: ExampleRecord[] = [];
  for (const file of files) {
    try {
      const raw = await fs.readFile(path.join(dir, file), 'utf-8');
      const rec = JSON.parse(raw) as ExampleRecord;
      if ((rec.score ?? 1.0) >= minScore) records.push(rec);
    } catch {
      // skip corrupt files
    }
  }

  // Sort: higher score first, then newer first
  records.sort((a, b) => {
    const scoreDiff = (b.score ?? 1) - (a.score ?? 1);
    if (scoreDiff !== 0) return scoreDiff;
    return b.savedAt.localeCompare(a.savedAt);
  });

  return records.slice(0, limit);
}

// ─── XML Block ────────────────────────────────────────────────────────────────

/**
 * Format loaded examples as an XML block suitable for injection into prompts:
 *
 * ```xml
 * <examples>
 *   <example index="1">
 *     <prompt>…</prompt>
 *     <response>…</response>
 *   </example>
 * </examples>
 * ```
 *
 * Returns empty string when no examples found.
 */
export async function buildExamplesBlock(taskType: string, options: LoadExamplesOptions = {}): Promise<string> {
  const examples = await loadExamples(taskType, options);
  if (examples.length === 0) return '';

  const items = examples
    .map(
      (ex, i) =>
        `  <example index="${i + 1}">\n` +
        `    <prompt>${escapeXml(ex.prompt)}</prompt>\n` +
        `    <response>${escapeXml(ex.response)}</response>\n` +
        `  </example>`
    )
    .join('\n');

  return `<examples>\n${items}\n</examples>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeSegment(s: string): string {
  return s.replace(/[^\w-]/g, '_');
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
