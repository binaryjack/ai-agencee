/**
 * Type definitions for Dependency Analyzer
 */

export type DependencyAnalyzerOptions = {
  projectRoot: string;
  resolveExtensions?: string[];
};

export type DependencyAnalysisResult = {
  graph: import('./codebase-indexer.types').DependencyGraph;
  unresolvedImports: string[];
};
