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

type CallGraphNode = {
  callees: Set<number>;  // Symbol IDs this function calls
  callers: Set<number>;  // Symbol IDs that call this function
};

type CallGraph = Map<number, CallGraphNode>;

export type GraphTraversalInstance = {
  _store: CodebaseIndexStoreInstance;
  _callGraphCache: CallGraph | null;
  _cacheTimestamp: number;
  _CACHE_TTL_MS: number;
  computeReachableSymbols(symbolId: number, maxDepth: number): Promise<ReachableSymbol[]>;
  _bfsTraversal(startSymbolId: number, maxDepth: number, callGraph: CallGraph): Map<number, number>;
  _loadCallGraph(): Promise<CallGraph>;
  _getOrLoadCallGraph(): Promise<CallGraph>;
  _batchLoadSymbolDetails(symbolIds: number[]): Promise<Map<number, { name: string; filePath: string }>>;
};

export const GraphTraversal = function(this: GraphTraversalInstance, store: CodebaseIndexStoreInstance) {
  Object.defineProperty(this, '_store', {
    enumerable: false,
    value: store
  });
  
  Object.defineProperty(this, '_callGraphCache', {
    enumerable: false,
    writable: true,
    value: null
  });
  
  Object.defineProperty(this, '_cacheTimestamp', {
    enumerable: false,
    writable: true,
    value: 0
  });
  
  Object.defineProperty(this, '_CACHE_TTL_MS', {
    enumerable: false,
    value: 5 * 60 * 1000 // 5 minutes
  });
};

/**
 * Compute all symbols reachable from a starting symbol via function calls
 * Uses BFS to find symbols within maxDepth hops
 * Returns symbols with distance-based scoring (1.0 for distance 0, 0.5 for distance 1, 0.25 for distance 2, etc.)
 * 
 * PERFORMANCE: Batch-loads entire call graph upfront to eliminate N+1 queries.
 * Single graph traversal makes only 2 SQL queries total regardless of depth.
 */
GraphTraversal.prototype.computeReachableSymbols = async function(
  this: GraphTraversalInstance,
  symbolId: number,
  maxDepth: number = 2
): Promise<ReachableSymbol[]> {
  // Load call graph once (cached for 5 minutes)
  const callGraph = await this._getOrLoadCallGraph();
  
  // BFS traversal using in-memory graph (no SQL queries)
  const distanceMap = this._bfsTraversal(symbolId, maxDepth, callGraph);
  
  // Batch-load symbol details for all discovered symbols
  const symbolIds = Array.from(distanceMap.keys()).filter(id => id !== symbolId);
  const symbolDetailsMap = await this._batchLoadSymbolDetails(symbolIds);
  
  // Convert to result array with scores
  const results: ReachableSymbol[] = [];
  
  for (const [symId, distance] of distanceMap.entries()) {
    if (symId === symbolId) continue; // Skip self
    
    const details = symbolDetailsMap.get(symId);
    if (details) {
      // Distance-based decay: 1.0 -> 0.5 -> 0.25 -> 0.125
      const score = Math.pow(0.5, distance);
      
      results.push({
        symbolId: symId,
        name: details.name,
        filePath: details.filePath,
        distance,
        score
      });
    }
  }
  
  // Sort by score descending (closer symbols first)
  return results.sort((a, b) => b.score - a.score);
};

/**
 * BFS traversal of function call graph using in-memory adjacency list
 * Returns a map of symbolId -> distance from start symbol
 * PERFORMANCE: Pure in-memory traversal, zero SQL queries
 */
GraphTraversal.prototype._bfsTraversal = function(
  this: GraphTraversalInstance,
  startSymbolId: number,
  maxDepth: number,
  callGraph: CallGraph
): Map<number, number> {
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
    
    const node = callGraph.get(current.symbolId);
    if (!node) continue;
    
    // Traverse outgoing edges (callees)
    for (const calleeId of node.callees) {
      if (!visited.has(calleeId)) {
        const nextDistance = current.distance + 1;
        visited.set(calleeId, nextDistance);
        queue.push({ symbolId: calleeId, distance: nextDistance });
      }
    }
    
    // Traverse incoming edges (callers)
    for (const callerId of node.callers) {
      if (!visited.has(callerId)) {
        const nextDistance = current.distance + 1;
        visited.set(callerId, nextDistance);
        queue.push({ symbolId: callerId, distance: nextDistance });
      }
    }
  }
  
  return visited;
};

/**
 * Load entire call graph from database in a single query
 * Builds in-memory adjacency list for fast BFS traversal
 * PERFORMANCE: Single SQL query loads entire graph structure
 */
GraphTraversal.prototype._loadCallGraph = async function(
  this: GraphTraversalInstance
): Promise<CallGraph> {
  const callGraph: CallGraph = new Map();
  
  // Single query to load all call relationships
  const edges = await this._store.query(`
    SELECT 
      fc.caller_symbol_id,
      s2.id as callee_symbol_id
    FROM codebase_function_calls fc
    LEFT JOIN codebase_symbols s2 ON fc.callee_name = s2.name
    WHERE fc.callee_symbol_id IS NOT NULL OR s2.id IS NOT NULL
  `, []) as Array<{ caller_symbol_id: number; callee_symbol_id: number }>;
  
  // Build adjacency list
  for (const edge of edges) {
    const callerId = edge.caller_symbol_id;
    const calleeId = edge.callee_symbol_id;
    
    if (!calleeId) continue; // Skip unresolved external calls
    
    // Ensure caller node exists
    if (!callGraph.has(callerId)) {
      callGraph.set(callerId, { callees: new Set(), callers: new Set() });
    }
    
    // Ensure callee node exists
    if (!callGraph.has(calleeId)) {
      callGraph.set(calleeId, { callees: new Set(), callers: new Set() });
    }
    
    // Add bidirectional edges
    callGraph.get(callerId)!.callees.add(calleeId);
    callGraph.get(calleeId)!.callers.add(callerId);
  }
  
  return callGraph;
};

/**
 * Get cached call graph or load fresh if cache expired
 * PERFORMANCE: 5-minute TTL reduces database load for repeated queries
 */
GraphTraversal.prototype._getOrLoadCallGraph = async function(
  this: GraphTraversalInstance
): Promise<CallGraph> {
  const now = Date.now();
  
  // Return cached graph if still valid
  if (this._callGraphCache && (now - this._cacheTimestamp) < this._CACHE_TTL_MS) {
    return this._callGraphCache;
  }
  
  // Load fresh graph and cache it
  this._callGraphCache = await this._loadCallGraph();
  this._cacheTimestamp = now;
  
  return this._callGraphCache;
};

/**
 * Batch-load symbol details for multiple symbol IDs in a single query
 * PERFORMANCE: Single SQL query replaces N individual queries
 */
GraphTraversal.prototype._batchLoadSymbolDetails = async function(
  this: GraphTraversalInstance,
  symbolIds: number[]
): Promise<Map<number, { name: string; filePath: string }>> {
  const result = new Map<number, { name: string; filePath: string }>();
  
  if (symbolIds.length === 0) {
    return result;
  }
  
  // Single query with IN clause
  const placeholders = symbolIds.map(() => '?').join(',');
  const rows = await this._store.query(
    `SELECT s.id, s.name, f.file_path as filePath
     FROM codebase_symbols s
     JOIN codebase_files f ON s.file_id = f.id
     WHERE s.id IN (${placeholders})`,
    symbolIds
  ) as Array<{ id: number; name: string; filePath: string }>;
  
  // Build lookup map
  for (const row of rows) {
    result.set(row.id, { name: row.name, filePath: row.filePath });
  }
  
  return result;
};
