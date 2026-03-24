/**
 * Prototype method: _gatherContext
 *
 * Builds the "## Codebase context" section injected into the LLM prompt.
 *
 * Two-stage strategy (cheap → expensive):
 *   1. FTS5 keyword search — pulls relevant symbol names and signatures from the
 *      SQLite index with zero external API calls and sub-millisecond latency.
 *   2. File snippet injection — loads the first MAX_FILE_LINES of each unique
 *      source file that hosted a matching symbol, giving the LLM real syntax to
 *      reference rather than signature stubs alone.
 *
 * Semantic (vector) search is intentionally not used here — it requires an
 * embedding API call that adds latency and cost before the generation step.
 * The FTS5 index is accurate enough for context gathering because the task
 * description always contains the names of the symbols involved.
 *
 * Sustainability note: MAX_FILES and MAX_FILE_LINES are tight by design.
 * Feeding an LLM 20 full files to generate 10 lines of code is wasteful and
 * degrades output quality through context dilution.
 */

import * as fs from 'fs/promises'
import * as path from 'path'

import { createGraphTraversal } from '../../indexer/create-graph-traversal.js'
import type { CodebaseIndexStoreInstance } from '../../storage/codebase-index-store.types.js'
import type { ICodeAssistantOrchestrator } from '../code-assistant-orchestrator.js'
import { KNN_K, MAX_FILE_LINES, MAX_FILES, MAX_SYMBOLS } from './constants.js'

type SymbolRow = {
  name:       string;
  kind:       string;
  signature:  string | null;
  file_path:  string;
  line_start: number;
};

export async function _gatherContext(
  this: ICodeAssistantOrchestrator,
  store: CodebaseIndexStoreInstance,
  task:  string,
): Promise<string> {
  // Extract meaningful keywords from the task (≥4 chars, deduplicated, max 6)
  const seen: Record<string, boolean> = {};
  const keywords: string[] = [];
  for (const w of task.split(/\W+/)) {
    if (w.length >= 4 && !seen[w]) {
      seen[w] = true;
      keywords.push(w);
      if (keywords.length === 6) break;
    }
  }
  const ftsQuery = keywords.join(' OR ');

  // ── Stage 1: FTS5 symbol search ───────────────────────────────────────────

  let symbols: SymbolRow[] = [];
  if (ftsQuery) {
    try {
      symbols = (await store.query(
        `SELECT s.name, s.kind, s.signature, f.file_path, s.line_start
         FROM codebase_symbols_fts fts
         JOIN codebase_symbols s ON s.id       = fts.rowid
         JOIN codebase_files   f ON s.file_id  = f.id
         WHERE codebase_symbols_fts MATCH ?
         ORDER BY rank
         LIMIT ?`,
        [ftsQuery, MAX_SYMBOLS],
      )) as SymbolRow[];
    } catch {
      // Index not built yet or FTS table absent — generate from task desc only
    }
  }

  // ── Stage 1.5: Semantic (vector) search ──────────────────────────────────
  //
  // When an embedding provider is wired, embed the task and run knn against the
  // stored vectors.  Results are merged with FTS5 candidates (deduped by
  // name+file_path) so each retrieval method fills the other's blind spots:
  //   - FTS5   → exact symbol names, typo-sensitive
  //   - knn    → conceptual intent, unaware of symbol names

  const provider = this._options.embeddingProvider;
  if (provider) {
    try {
      const [queryVector] = await provider.embed([task]);
      const semanticHits = await store.semanticSearch(queryVector, KNN_K, ftsQuery || undefined);
      const seen = new Set(symbols.map(s => s.name + '\0' + s.file_path));
      for (const r of semanticHits) {
        const key = r.name + '\0' + r.file_path;
        if (!seen.has(key)) {
          seen.add(key);
          symbols.push({
            name: r.name, kind: r.kind, signature: r.signature,
            file_path: r.file_path, line_start: r.line_start,
          });
        }
      }
      if (symbols.length > MAX_SYMBOLS) symbols = symbols.slice(0, MAX_SYMBOLS);
    } catch {
      // Embedding provider unavailable or vectors not yet generated — degrade gracefully
    }
  }

  const blocks: string[] = [];

  if (symbols.length > 0) {
    blocks.push('### Relevant symbols\n');
    for (const s of symbols) {
      const sig = s.signature ? '\n  `' + s.signature + '`' : '';
      blocks.push(
        '- **' + s.kind + '** `' + s.name + '`' +
        ' (' + s.file_path + ':' + s.line_start + ')' + sig,
      );
    }
  }

  // ── Stage 1.75: Graph-distance expansion ─────────────────────────────────
  //
  // For each FTS5/semantic hit, traverse the call graph to find transitively
  // related symbols (functions called by matches, or functions that call matches).
  // This surfaces code that's conceptually related but lacks keyword overlap.

  const graphTraversal = createGraphTraversal(store);
  const transitiveSymbols: Array<{ name: string; filePath: string; distance: number; score: number }> = [];
  const seenTransitive = new Set(symbols.map(s => s.name + '\0' + s.file_path));

  for (const symbol of symbols.slice(0, 5)) { // Only expand top 5 to control cost
    try {
      // Get the symbol ID from database
      const idResults = await store.query(
        `SELECT s.id FROM codebase_symbols s
         JOIN codebase_files f ON s.file_id = f.id
         WHERE s.name = ? AND f.file_path = ?
         LIMIT 1`,
        [symbol.name, symbol.file_path]
      ) as Array<{ id: number }>;
      
      if (idResults.length > 0) {
        const reachable = await graphTraversal.computeReachableSymbols(idResults[0].id, 2);
        
        for (const reach of reachable) {
          const key = reach.name + '\0' + reach.filePath;
          if (!seenTransitive.has(key) && transitiveSymbols.length < 10) {
            seenTransitive.add(key);
            transitiveSymbols.push(reach);
          }
        }
      }
    } catch {
      // Call graph not built or error in traversal — continue gracefully
    }
  }

  if (transitiveSymbols.length > 0) {
    blocks.push('\n### Related symbols (transitive)\n');
    for (const t of transitiveSymbols) {
      blocks.push(
        '- `' + t.name + '` (' + t.filePath + ') — distance ' + t.distance +
        ', score ' + t.score.toFixed(2)
      );
    }
  }

  // ── Stage 2: file snippet injection ──────────────────────────────────────

  const uniquePaths = Array.from(
    new Set(symbols.map(function(s) { return s.file_path; })),
  ).slice(0, MAX_FILES);

  for (const fp of uniquePaths) {
    try {
      const abs     = path.isAbsolute(fp) ? fp : path.join(this._options.projectRoot, fp);
      const raw     = await fs.readFile(abs, 'utf-8');
      const lines   = raw.split('\n');
      const snippet = lines.slice(0, MAX_FILE_LINES).join('\n');
      const truncated = lines.length > MAX_FILE_LINES
        ? '\n// … ' + (lines.length - MAX_FILE_LINES) + ' more lines omitted'
        : '';
      blocks.push('\n### FILE: ' + fp + '\n```\n' + snippet + truncated + '\n```');
    } catch {
      // File removed between index time and now — skip silently
    }
  }

  return blocks.join('\n');
}
