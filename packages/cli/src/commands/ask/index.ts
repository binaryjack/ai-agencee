/**
 * CLI Command: ai-kit ask
 * 
 * ASK mode: Instant, zero-cost code exploration using FTS5 full-text search.
 * No LLM calls, no API costs, no hallucinations - just fast, accurate search results.
 * 
 * Perfect for:
 * - Quick lookups: "Show me all API endpoints"
 * - Code discovery: "Find authentication logic"
 * - Architecture exploration: "Where is the database connection?"
 * 
 * Part of Phase 2.6 (Workflow Polish) - providing instant answers at zero cost.
 */

import { createCodebaseIndexStore } from '@ai-agencee/engine/code-assistant/storage';
import * as path from 'node:path';

/**
 * ANSI color codes for terminal formatting
 */
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  dim: '\x1b[2m',
};

const chalk = {
  red: (text: string) => `${COLORS.red}${text}${COLORS.reset}`,
  green: (text: string) => `${COLORS.green}${text}${COLORS.reset}`,
  yellow: (text: string) => `${COLORS.yellow}${text}${COLORS.reset}`,
  blue: (text: string) => `${COLORS.blue}${text}${COLORS.reset}`,
  magenta: (text: string) => `${COLORS.magenta}${text}${COLORS.reset}`,
  cyan: (text: string) => `${COLORS.cyan}${text}${COLORS.reset}`,
  gray: (text: string) => `${COLORS.gray}${text}${COLORS.reset}`,
  dim: (text: string) => `${COLORS.dim}${text}${COLORS.reset}`,
  bold: (text: string) => `${COLORS.bold}${text}${COLORS.reset}`,
};

const greenBold = (text: string) => `${COLORS.bold}${COLORS.green}${text}${COLORS.reset}`;
const cyanBold = (text: string) => `${COLORS.bold}${COLORS.cyan}${text}${COLORS.reset}`;
const blueBold = (text: string) => `${COLORS.bold}${COLORS.blue}${text}${COLORS.reset}`;
const white = (text: string) => text; // No color

type AskOptions = {
  project?: string;
  limit?: number;
  json?: boolean;
};

type SymbolRow = {
  name: string;
  kind: string;
  line_start: number;
  line_end: number;
  signature: string | null;
  file_path: string;
};

/**
 * Run ASK mode: instant FTS5 search with zero cost
 */
export async function runAsk(query: string, options: AskOptions = {}): Promise<void> {
  if (!query || query.trim() === '') {
    console.error(chalk.red('❌ Query is required'));
    console.error(chalk.dim('   Usage: ai-kit ask "Show me all API endpoints"'));
    console.error(chalk.dim('   Example: ai-kit ask "authentication logic"'));
    process.exit(1);
  }

  const { project = process.cwd(), limit = 30, json = false } = options;

  const projectRoot = path.resolve(project);
  const dbPath = path.join(projectRoot, '.agencee', 'code-index.db');
  const projectId = path.basename(projectRoot);

  // Open code index
  let store: Awaited<ReturnType<typeof createCodebaseIndexStore>>;
  try {
    store = await createCodebaseIndexStore({ dbPath, projectId });
  } catch {
    console.error(chalk.red('❌ Code index not found'));
    console.error(chalk.dim('   Run: ') + chalk.cyan('ai-kit code index') + chalk.dim(' first'));
    process.exit(1);
  }

  try {
    // Extract search terms from natural language query
    const searchTerms = extractSearchTerms(query);
    
    // FTS5 search (zero cost, instant results)
    const results = await performFtsSearch(store, searchTerms, limit);

    if (json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    // Pretty print results
    printAskResults(query, results, searchTerms);
  } finally {
    await store.close();
  }
}

/**
 * Extract meaningful search terms from natural language query
 */
function extractSearchTerms(query: string): string {
  // Remove common question words and punctuation
  const stopWords = ['show', 'me', 'all', 'find', 'where', 'is', 'the', 'a', 'an', 'are', 'what', 'how', 'when', 'which'];
  
  const terms = query
    .toLowerCase()
    .replace(/[?!.,;:]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 2 && !stopWords.includes(term));

  return terms.join(' OR ');
}

/**
 * Perform FTS5 full-text search
 */
async function performFtsSearch(
  store: Awaited<ReturnType<typeof createCodebaseIndexStore>>,
  searchTerms: string,
  limit: number
): Promise<SymbolRow[]> {
  const projectId = (store as any)._projectId;

  const rows = (await store.query(
    `SELECT s.name, s.kind, s.line_start, s.line_end, s.signature, f.file_path
     FROM codebase_symbols_fts fts
     JOIN codebase_symbols s ON s.id = fts.rowid
     JOIN codebase_files f ON s.file_id = f.id
     WHERE codebase_symbols_fts MATCH ?
       AND f.project_id = ?
     ORDER BY rank
     LIMIT ?`,
    [searchTerms, projectId, limit]
  )) as unknown as SymbolRow[];

  return rows;
}

/**
 * Pretty print ASK mode results with file grouping
 */
function printAskResults(originalQuery: string, results: SymbolRow[], searchTerms: string): void {
  console.log();
  console.log(chalk.cyan('━'.repeat(80)));
  console.log(cyanBold('  ASK MODE') + chalk.dim(' — Zero-cost instant search'));
  console.log(chalk.cyan('━'.repeat(80)));
  console.log();
  
  console.log(chalk.dim('  Query: ') + white(originalQuery));
  console.log(chalk.dim('  Terms: ') + chalk.yellow(searchTerms));
  console.log();

  if (results.length === 0) {
    console.log(chalk.yellow('  ⚠ No results found'));
    console.log();
    console.log(chalk.dim('  Try:'));
    console.log(chalk.dim('    • Broader search terms (e.g., "auth" instead of "authentication")'));
    console.log(chalk.dim('    • Different keywords from the original query'));
    console.log(chalk.dim('    • Run ') + chalk.cyan('ai-kit code index') + chalk.dim(' to refresh the index'));
    console.log();
    return;
  }

  // Group results by file
  const byFile = new Map<string, SymbolRow[]>();
  for (const row of results) {
    const relativePath = path.relative(process.cwd(), row.file_path);
    if (!byFile.has(relativePath)) {
      byFile.set(relativePath, []);
    }
    byFile.get(relativePath)!.push(row);
  }

  // Print results grouped by file
  console.log(chalk.green(`  ✓ Found ${results.length} result(s) in ${byFile.size} file(s)`));
  console.log();

  for (const [filePath, symbols] of byFile.entries()) {
    console.log(blueBold(`  📄 ${filePath}`));
    
    for (const symbol of symbols) {
      const kindColor = getKindColor(symbol.kind);
      const kindBadge = `[${symbol.kind}]`.padEnd(12);
      const location = chalk.dim(`L${symbol.line_start}`);
      
      console.log(`     ${kindColor(kindBadge)} ${white(symbol.name)} ${location}`);
      
      if (symbol.signature) {
        const sig = symbol.signature.length > 60 
          ? symbol.signature.substring(0, 57) + '...'
          : symbol.signature;
        console.log(chalk.dim(`                  ${sig}`));
      }
    }
    
    console.log();
  }

  // Cost summary (zero cost!)
  console.log(chalk.cyan('━'.repeat(80)));
  console.log(greenBold('  💚 ZERO COST'));
  console.log(chalk.dim('     • No LLM calls ($0.00)'));
  console.log(chalk.dim('     • No API requests (0 Wh)'));
  console.log(chalk.dim('     • No hallucinations (FTS5 search only)'));
  console.log(chalk.dim('     • Instant results (<100ms)'));
  console.log(chalk.cyan('━'.repeat(80)));
  console.log();
}

/**
 * Get color for symbol kind
 */
function getKindColor(kind: string): (text: string) => string {
  switch (kind.toLowerCase()) {
    case 'function':
    case 'method':
      return chalk.magenta;
    case 'class':
    case 'interface':
      return chalk.blue;
    case 'variable':
    case 'property':
      return chalk.yellow;
    case 'type':
    case 'enum':
      return chalk.cyan;
    default:
      return chalk.gray;
  }
}
