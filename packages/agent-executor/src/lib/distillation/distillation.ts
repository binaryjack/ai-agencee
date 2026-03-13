import { existsSync } from 'fs'
import * as fs from 'fs/promises'
import * as path from 'path'
import { EXAMPLES_DIR } from '../path-constants.js'

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
  /** Root of the project that owns the agent workspace. Default: process.cwd() */
  projectRoot?: string;
}

export interface SaveExampleOptions {
  score?: number;
  metadata?: Record<string, unknown>;
  /** Root of the project that owns the agent workspace. Default: process.cwd() */
  projectRoot?: string;
}

// ─── Save ─────────────────────────────────────────────────────────────────────

export async function saveExample(
  taskType: string,
  runId: string,
  content: { prompt: string; response: string },
  options: SaveExampleOptions = {}
): Promise<void> {
  const root = options.projectRoot ?? process.cwd();
  const dir = path.join(root, EXAMPLES_DIR, sanitizeSegment(taskType));

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

export async function loadExamples(
  taskType: string,
  options: LoadExamplesOptions = {}
): Promise<ExampleRecord[]> {
  const root = options.projectRoot ?? process.cwd();
  const limit = options.limit ?? 3;
  const minScore = options.minScore ?? 0.0;
  const dir = path.join(root, EXAMPLES_DIR, sanitizeSegment(taskType));

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

  records.sort((a, b) => {
    const scoreDiff = (b.score ?? 1) - (a.score ?? 1);
    if (scoreDiff !== 0) return scoreDiff;
    return b.savedAt.localeCompare(a.savedAt);
  });

  return records.slice(0, limit);
}

// ─── XML Block ────────────────────────────────────────────────────────────────

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
