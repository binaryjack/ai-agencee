/**
 * Factory for creating graph traversal instances
 */

import type { CodebaseIndexStoreInstance } from '../storage/codebase-index-store.types'
import { GraphTraversal, type GraphTraversalInstance } from './graph-traversal'

export function createGraphTraversal(store: CodebaseIndexStoreInstance): GraphTraversalInstance {
  return new (GraphTraversal as any)(store);
}
