/**
 * CLI Command: ai-kit code search
 * Full-text search (FTS5) or semantic vector search across indexed symbols.
 */

import { OllamaEmbeddingProvider, OpenAIEmbeddingProvider } from '@ai-agencee/engine/code-assistant/embeddings';
import { createCodebaseIndexStore } from '@ai-agencee/engine/code-assistant/storage';
import * as path from 'node:path';

type SearchOptions = {
  project?: string;
  kind?: string;
  limit?: number;
  json?: boolean;
  semantic?: boolean;
  withDeps?: boolean;
};

type SymbolRow = {
  name: string;
  kind: string;
  line_start: number;
  line_end: number;
  signature: string | null;
  file_path: string;
  file_id?: number;
};

type SymbolRowWithDeps = SymbolRow & {
  callers: string[];
  callees: string[];
};

export const runCodeSearch = async function(term: string, options: SearchOptions = {}): Promise<void> {
  if (!term || term.trim() === '') {
    console.error('❌ Search term is required. Usage: ai-kit code search <term>');
    process.exit(1);
  }

  const { project = process.cwd(), kind, limit = 20, json = false, semantic = false, withDeps = false } = options;

  const projectRoot = path.resolve(project);
  const dbPath = path.join(projectRoot, '.agencee', 'code-index.db');
  const projectId = path.basename(projectRoot);

  let store: Awaited<ReturnType<typeof createCodebaseIndexStore>>;
  try {
    store = await createCodebaseIndexStore({ dbPath, projectId });
  } catch {
    console.error('❌ Could not open index. Run: ai-kit code index first.');
    process.exit(1);
  }

  try {
    if (semantic) {
      await runSemanticSearch(store, term, { kind, limit, json });
    } else {
      await runFtsSearch(store, term, { kind, limit, json, withDeps }, projectRoot);
    }
  } finally {
    await store.close();
  }
};

async function runFtsSearch(
  store: Awaited<ReturnType<typeof createCodebaseIndexStore>>,
  term: string,
  options: { kind?: string; limit: number; json: boolean; withDeps?: boolean },
  projectRoot: string,
): Promise<void> {
  const { kind, limit, json, withDeps = false } = options;
  const kindFilter = kind ? 'AND s.kind = ?' : '';
  const params: (string | number)[] = [term, (store as any)._projectId];
  if (kind) params.push(kind);
  params.push(limit);

  const rows = (await store.query(
    `SELECT s.name, s.kind, s.line_start, s.line_end, s.signature, f.file_path, f.id as file_id
     FROM codebase_symbols_fts fts
     JOIN codebase_symbols s ON s.id = fts.rowid
     JOIN codebase_files f ON s.file_id = f.id
     WHERE codebase_symbols_fts MATCH ?
       AND f.project_id = ?
       ${kindFilter}
     ORDER BY rank
     LIMIT ?`,
    params
  )) as unknown as SymbolRow[];

  if (withDeps && rows.length > 0) {
    const enriched = await enrichWithDeps(store, rows, projectRoot);
    printResults(enriched, term, json);
  } else {
    printResults(rows, term, json);
  }
}

async function enrichWithDeps(
  store: Awaited<ReturnType<typeof createCodebaseIndexStore>>,
  rows: SymbolRow[],
  projectRoot: string,
): Promise<SymbolRowWithDeps[]> {
  const fileIds = [...new Set(rows.map(r => r.file_id).filter((id): id is number => id !== undefined))];
  if (fileIds.length === 0) return rows.map(r => ({ ...r, callers: [], callees: [] }));

  const placeholders = fileIds.map(() => '?').join(', ');
  const [callerRows, calleeRows] = await Promise.all([
    (store as any).query(
      `SELECT DISTINCT df.file_path AS dep_path, d.to_file_id
       FROM codebase_dependencies d
       JOIN codebase_files df ON d.from_file_id = df.id
       WHERE d.to_file_id IN (${placeholders})`,
      fileIds,
    ) as Promise<Array<{ dep_path: string; to_file_id: number }>>,
    (store as any).query(
      `SELECT DISTINCT df.file_path AS dep_path, d.from_file_id
       FROM codebase_dependencies d
       JOIN codebase_files df ON d.to_file_id = df.id
       WHERE d.from_file_id IN (${placeholders})`,
      fileIds,
    ) as Promise<Array<{ dep_path: string; from_file_id: number }>>,
  ]);

  const callerMap = new Map<number, string[]>();
  const calleeMap = new Map<number, string[]>();
  for (const r of callerRows) {
    const list = callerMap.get(r.to_file_id) ?? [];
    list.push(path.relative(projectRoot, r.dep_path));
    callerMap.set(r.to_file_id, list);
  }
  for (const r of calleeRows) {
    const list = calleeMap.get(r.from_file_id) ?? [];
    list.push(path.relative(projectRoot, r.dep_path));
    calleeMap.set(r.from_file_id, list);
  }

  return rows.map(r => ({
    ...r,
    callers: r.file_id !== undefined ? (callerMap.get(r.file_id) ?? []) : [],
    callees: r.file_id !== undefined ? (calleeMap.get(r.file_id) ?? []) : [],
  }));
}

async function runSemanticSearch(
  store: Awaited<ReturnType<typeof createCodebaseIndexStore>>,
  term: string,
  options: { kind?: string; limit: number; json: boolean }
): Promise<void> {
  const { limit, json } = options;

  // Pick embedding provider: OpenAI if key available, else Ollama
  const provider = process.env['OPENAI_API_KEY']
    ? new (OpenAIEmbeddingProvider as any)({ apiKey: process.env['OPENAI_API_KEY'] })
    : new (OllamaEmbeddingProvider as any)()

  let queryVector: Float32Array
  try {
    const vectors = await provider.embed([term])
    queryVector = vectors[0]
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`❌ Embedding failed: ${msg}`)
    console.error('   Make sure Ollama is running (ollama serve) or set OPENAI_API_KEY.')
    process.exit(1)
  }

  const results = await (store as any).semanticSearch(queryVector, limit)

  if (results.length === 0) {
    if (json) { console.log(JSON.stringify([], null, 2)); }
    else { console.log(`🔍 No semantic results for "${term}"`); }
    process.exit(1)
  }

  if (json) {
    console.log(JSON.stringify(results, null, 2))
    return
  }

  console.log(`🔍 Found ${results.length} semantic result(s) for "${term}"\n`)
  for (const r of results) {
    const score = (r.score as number).toFixed(3)
    const sig   = r.signature ? `  ${r.signature}` : ''
    console.log(`  [${r.kind}] ${r.name}  (score: ${score})`)
    console.log(`          ${r.file_path}${sig}`)
    console.log()
  }
}

function printResults(rows: Array<SymbolRow | SymbolRowWithDeps>, term: string, json: boolean): void {
  if (rows.length === 0) {
    if (json) { console.log(JSON.stringify([], null, 2)); }
    else { console.log(`🔍 No results for "${term}"`); }
    process.exit(1);
  }

  if (json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  console.log(`🔍 Found ${rows.length} result(s) for "${term}"\n`);
  for (const row of rows) {
    const location = `${row.file_path}:${row.line_start}`;
    const signature = row.signature ? `  ${row.signature}` : '';
    console.log(`  [${row.kind}] ${row.name}`);
    console.log(`          ${location}${signature}`);
    const withDepsRow = row as SymbolRowWithDeps;
    if (withDepsRow.callers?.length) console.log(`          callers: ${withDepsRow.callers.join(', ')}`);
    if (withDepsRow.callees?.length) console.log(`          callees: ${withDepsRow.callees.join(', ')}`);
    console.log();
  }
}
