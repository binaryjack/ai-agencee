/**
 * Factory for CodebaseIndexer
 */

import { CodebaseIndexer } from './codebase-indexer';
import type { CodebaseIndexerInstance, CodebaseIndexerOptions } from './codebase-indexer.types';

export const createCodebaseIndexer = function(options: CodebaseIndexerOptions): CodebaseIndexerInstance {
  return new (CodebaseIndexer as any)(options);
};
