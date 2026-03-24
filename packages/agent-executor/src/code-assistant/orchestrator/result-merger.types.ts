/**
 * Result Merger Types
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

export type ResultMergerInstance = {
  _results: Map<string, SearchResult>;
  _maxResults: number;
  add(result: SearchResult): void;
  addMany(results: SearchResult[]): void;
  getResults(): SearchResult[];
  clear(): void;
};
