/**
 * Result Merger - Deduplicates and merges search results from multiple sources
 * 
 * Combines FTS5, semantic search, and graph traversal results with smart
 * deduplication and score-based ranking.
 */

export type SearchResult = {
  name: string;
  kind: string;
  signature: string | null;
  file_path: string;
  line_start: number;
  score?: number;
  source?: 'fts' | 'semantic' | 'graph';
};

export class ResultMerger {
  private readonly _results: Map<string, SearchResult>;
  private readonly _maxResults: number;

  constructor(maxResults: number = 50) {
    this._results = new Map();
    this._maxResults = maxResults;
  }

  /**
   * Add a single search result.
   * Deduplicates by name+file_path key.
   * If duplicate, keeps the one with higher score.
   */
  add(result: SearchResult): void {
    const key = `${result.name}\0${result.file_path}`;
    const existing = this._results.get(key);
    
    if (existing) {
      // Keep result with higher score
      const existingScore = existing.score ?? 0;
      const newScore = result.score ?? 0;
      
      if (newScore > existingScore) {
        this._results.set(key, result);
      }
    } else {
      this._results.set(key, result);
    }
  }

  /**
   * Add multiple search results in batch.
   */
  addMany(results: SearchResult[]): void {
    for (const result of results) {
      this.add(result);
    }
  }

  /**
   * Get merged results, sorted by score descending.
   * Limits to maxResults configured in constructor.
   */
  getResults(): SearchResult[] {
    const results = Array.from(this._results.values());
    
    // Sort by score descending (higher is better)
    results.sort((a, b) => {
      const scoreA = a.score ?? 0;
      const scoreB = b.score ?? 0;
      return scoreB - scoreA;
    });
    
    return results.slice(0, this._maxResults);
  }

  /**
   * Clear all results.
   */
  clear(): void {
    this._results.clear();
  }
}

/**
 * @deprecated Use ResultMerger class directly. This type alias exists for backward compatibility.
 */
export type ResultMergerInstance = ResultMerger;
