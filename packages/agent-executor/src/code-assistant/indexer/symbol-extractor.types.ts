/**
 * Type definitions for Symbol Extractor
 */

export type SymbolExtractorOptions = {
  includePrivate?: boolean;
  extractDocstrings?: boolean;
  extractSignatures?: boolean;
};

export type ExtractedSymbols = {
  symbols: import('./codebase-indexer.types').Symbol[];
  imports: import('./codebase-indexer.types').Import[];
  exports: import('./codebase-indexer.types').Export[];
};
