/**
 * Factory for CodebaseIndexStore
 */

import type { CodebaseIndexStoreInstance } from './codebase-index-store';
import { CodebaseIndexStore } from './codebase-index-store';
import type { CodebaseIndexStoreOptions } from './codebase-index-store.types';

export const createCodebaseIndexStore = async function(options: CodebaseIndexStoreOptions): Promise<CodebaseIndexStoreInstance> {
  const store = new (CodebaseIndexStore as any)(options);
  await store.initialize();
  return store;
};
