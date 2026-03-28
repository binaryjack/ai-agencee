/**
 * Context prioritizer
 * 
 * Ranks symbols by relevance to the task using multiple factors:
 * - Keyword matching
 * - File recency
 * - Dependency centrality
 * - Usage frequency
 */

import type {
    CodeSymbol,
    ContextOptimizationResult,
    ContextPrioritizationConfig,
    DependencyGraph,
    IndexEntry,
    RankedSymbol,
} from './context.types.js';
import { estimateTokens } from './symbol-extractor.js';

/**
 * Default prioritization weights
 */
const DEFAULT_WEIGHTS = {
  keywordMatch: 0.4,
  recency: 0.2,
  dependency: 0.3,
  usage: 0.1,
};

/**
 * Calculate keyword match score
 */
function calculateKeywordScore(symbol: CodeSymbol, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  
  let matches = 0;
  const symbolText = `${symbol.name} ${symbol.code}`.toLowerCase();
  
  for (const keyword of keywords) {
    if (symbolText.includes(keyword.toLowerCase())) {
      matches++;
    }
  }
  
  return matches / keywords.length;
}

/**
 * Calculate recency score (0-1, newer = higher)
 */
function calculateRecencyScore(lastModified: number): number {
  const now = Date.now();
  const ageMs = now - lastModified;
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  
  // Exponential decay
  return Math.exp(-ageMs / maxAge);
}

/**
 * Prioritize context symbols
 */
export function prioritizeSymbols(
  entries: IndexEntry[],
  graph: DependencyGraph,
  config: ContextPrioritizationConfig
): ContextOptimizationResult {
  const weights = { ...DEFAULT_WEIGHTS, ...config.weights };
  const keywords = config.keywords || [];
  const alwaysInclude = new Set(config.alwaysInclude || []);
  const exclude = new Set(config.exclude || []);
  
  // Collect all symbols with scores
  const rankedSymbols: RankedSymbol[] = [];
  
  for (const entry of entries) {
    // Skip excluded files
    if (exclude.has(entry.filePath)) continue;
    
    const node = graph.nodes.get(entry.filePath);
    const dependencyCentrality = node ? node.centrality : 0;
    const recencyScore = calculateRecencyScore(entry.lastModified);
    
    for (const symbol of entry.symbols) {
      const keywordScore = calculateKeywordScore(symbol, keywords);
      
      // Calculate overall relevance score
      const relevanceScore =
        weights.keywordMatch * keywordScore +
        weights.recency * recencyScore +
        weights.dependency * dependencyCentrality +
        weights.usage * 0.5; // Usage tracking: Will be implemented when we track how often symbols are actually used in generated code
      
      // Generate reason
      const reasons: string[] = [];
      if (keywordScore > 0.5) reasons.push(`keyword match (${Math.round(keywordScore * 100)}%)`);
      if (recencyScore > 0.7) reasons.push('recently modified');
      if (dependencyCentrality > 0.7) reasons.push('central dependency');
      if (alwaysInclude.has(entry.filePath)) reasons.push('always included');
      
      const reason = reasons.length > 0 ? reasons.join(', ') : 'low relevance';
      
      rankedSymbols.push({
        ...symbol,
        relevanceScore,
        reason,
        matchedKeywords: keywords.filter(k =>
          `${symbol.name} ${symbol.code}`.toLowerCase().includes(k.toLowerCase())
        ),
      });
    }
  }
  
  // Sort by relevance score (descending)
  rankedSymbols.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // Select symbols that fit within token limit
  const selectedSymbols: RankedSymbol[] = [];
  const filesIncluded = new Set<string>();
  let estimatedTokens = 0;
  
  for (const symbol of rankedSymbols) {
    // Always include files from alwaysInclude
    const mustInclude = alwaysInclude.has(symbol.filePath);
    
    const symbolTokens = estimateTokens(symbol.code);
    
    if (mustInclude || estimatedTokens + symbolTokens <= config.maxTokens) {
      selectedSymbols.push(symbol);
      filesIncluded.add(symbol.filePath);
      estimatedTokens += symbolTokens;
    }
    
    // Stop when we hit the token limit
    if (estimatedTokens >= config.maxTokens) {
      break;
    }
  }
  
  return {
    symbols: selectedSymbols,
    estimatedTokens,
    filesIncluded: Array.from(filesIncluded),
    stats: {
      totalSymbols: rankedSymbols.length,
      selectedSymbols: selectedSymbols.length,
      compressionRatio: rankedSymbols.length > 0
        ? 1 - (selectedSymbols.length / rankedSymbols.length)
        : 0,
    },
  };
}

/**
 * Extract keywords from task description
 */
export function extractKeywords(task: string): string[] {
  // Remove common words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  ]);
  
  // Split on non-word characters
  const words = task
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  
  // Remove duplicates
  return Array.from(new Set(words));
}
