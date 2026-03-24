/**
 * Graph Traversal Utilities
 * BFS traversal for computing transitive dependencies and call graphs
 */

import type { CodebaseIndexStoreInstance } from '../storage/codebase-index-store.types'

export type ReachableSymbol = {
  symbolId: number;
  name: string;
  filePath: string;
  distance: number;
  score: number;
};

export type GraphTraversalInstance = {
  _store: CodebaseIndexStoreInstance;
  computeReachableSymbols(symbolId: number, maxDepth: number): Promise<ReachableSymbol[]>;
  _bfsTraversal(startSymbolId: number, maxDepth: number): Promise<Map<number, number>>;
};

export const GraphTraversal = function(this: GraphTraversalInstance, store: CodebaseIndexStoreInstance) {
  Object.defineProperty(this, '_store', {
    enumerable: false,
    value: store
  });
};

/**
 * Compute all symbols reachable from a starting symbol via function calls
 * Uses BFS to find symbols within maxDepth hops
 * Returns symbols with distance-based scoring (1.0 for distance 0, 0.5 for distance 1, 0.25 for distance 2, etc.)
 */
GraphTraversal.prototype.computeReachableSymbols = async function(
  this: GraphTraversalInstance,
  symbolId: number,
  maxDepth: number = 2
): Promise<ReachableSymbol[]> {
  // BFS to find all reachable symbols with their distances
  const distanceMap = await this._bfsTraversal(symbolId, maxDepth);
  
  // Convert to array with scores
  const results: ReachableSymbol[] = [];
  
  for (const [symId, distance] of distanceMap.entries()) {
    if (symId === symbolId) continue; // Skip self
    
    // Get symbol details from database
    const symbolDetails = await this._store.query(
      `SELECT s.id, s.name, f.file_path as filePath
       FROM codebase_symbols s
       JOIN codebase_files f ON s.file_id = f.id
       WHERE s.id = ?`,
      [symId]
    ) as Array<{ id: number; name: string; filePath: string }>;
    
    if (symbolDetails.length > 0) {
      const symbol = symbolDetails[0];
      // Distance-based decay: 1.0 -> 0.5 -> 0.25 -> 0.125
      const score = Math.pow(0.5, distance);
      
      results.push({
        symbolId: symbol.id,
        name: symbol.name,
        filePath: symbol.filePath,
        distance,
        score
      });
    }
  }
  
  // Sort by score descending (closer symbols first)
  return results.sort((a, b) => b.score - a.score);
};

/**
 * BFS traversal of function call graph
 * Returns a map of symbolId -> distance from start symbol
 */
GraphTraversal.prototype._bfsTraversal = async function(
  this: GraphTraversalInstance,
  startSymbolId: number,
  maxDepth: number
): Promise<Map<number, number>> {
  const visited = new Map<number, number>(); // symbolId -> distance
  const queue: Array<{ symbolId: number; distance: number }> = [];
  
  // Initialize with start symbol
  queue.push({ symbolId: startSymbolId, distance: 0 });
  visited.set(startSymbolId, 0);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.distance >= maxDepth) {
      continue; // Don't expand beyond max depth
    }
    
    // Get all symbols called by current symbol (outgoing edges)
    const callees = await this._store.query(`
      SELECT DISTINCT s.id, s.name
      FROM codebase_function_calls fc
      JOIN codebase_symbols s ON fc.callee_name = s.name
      WHERE fc.caller_symbol_id = ?
    `, [current.symbolId]) as Array<{ id: number; name: string }>;
    
    for (const callee of callees) {
      if (!visited.has(callee.id)) {
        const nextDistance = current.distance + 1;
        visited.set(callee.id, nextDistance);
        queue.push({ symbolId: callee.id, distance: nextDistance });
      }
    }
    
    // Also traverse incoming edges (symbols that call this symbol)
    const callers = await this._store.query(`
      SELECT DISTINCT fc.caller_symbol_id as id
      FROM codebase_function_calls fc
      JOIN codebase_symbols s ON fc.caller_symbol_id = s.id
      WHERE fc.callee_name = (SELECT name FROM codebase_symbols WHERE id = ?)
    `, [current.symbolId]) as Array<{ id: number }>;
    
    for (const caller of callers) {
      if (!visited.has(caller.id)) {
        const nextDistance = current.distance + 1;
        visited.set(caller.id, nextDistance);
        queue.push({ symbolId: caller.id, distance: nextDistance });
      }
    }
  }
  
  return visited;
};
