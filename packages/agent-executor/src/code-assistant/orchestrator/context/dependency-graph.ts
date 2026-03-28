/**
 * Dependency graph builder
 * 
 * Builds a directed graph of file dependencies and calculates
 * centrality scores to identify important files.
 */

import type {
    DependencyGraph,
    DependencyNode,
    IndexEntry,
} from './context.types.js';

export class FileDependencyGraph implements DependencyGraph {
  nodes: Map<string, DependencyNode>;
  
  constructor() {
    this.nodes = new Map();
  }
  
  /**
   * Add file to graph
   */
  addFile(filePath: string, imports: string[]): void {
    // Add or update node
    if (!this.nodes.has(filePath)) {
      this.nodes.set(filePath, {
        filePath,
        imports: [],
        importedBy: [],
        depth: 0,
        centrality: 0,
      });
    }
    
    const node = this.nodes.get(filePath)!;
    node.imports = imports;
    
    // Update reverse dependencies
    for (const importPath of imports) {
      if (!this.nodes.has(importPath)) {
        this.nodes.set(importPath, {
          filePath: importPath,
          imports: [],
          importedBy: [],
          depth: 0,
          centrality: 0,
        });
      }
      
      const importNode = this.nodes.get(importPath)!;
      if (!importNode.importedBy.includes(filePath)) {
        importNode.importedBy.push(filePath);
      }
    }
  }
  
  /**
   * Get all dependencies of a file (recursive)
   */
  getDependencies(filePath: string): string[] {
    const visited = new Set<string>();
    const queue: string[] = [filePath];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      
      visited.add(current);
      
      const node = this.nodes.get(current);
      if (node) {
        for (const dep of node.imports) {
          if (!visited.has(dep)) {
            queue.push(dep);
          }
        }
      }
    }
    
    visited.delete(filePath); // Remove self
    return Array.from(visited);
  }
  
  /**
   * Get all files that depend on this file (recursive)
   */
  getDependents(filePath: string): string[] {
    const visited = new Set<string>();
    const queue: string[] = [filePath];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      
      visited.add(current);
      
      const node = this.nodes.get(current);
      if (node) {
        for (const dep of node.importedBy) {
          if (!visited.has(dep)) {
            queue.push(dep);
          }
        }
      }
    }
    
    visited.delete(filePath); // Remove self
    return Array.from(visited);
  }
  
  /**
   * Calculate centrality scores (simplified PageRank)
   * 
   * Files with more imports/dependents are more central.
   */
  calculateCentrality(): void {
    const damping = 0.85;
    const iterations = 10;
    const nodeCount = this.nodes.size;
    
    if (nodeCount === 0) return;
    
    // Initialize all nodes with equal centrality
    for (const node of this.nodes.values()) {
      node.centrality = 1 / nodeCount;
    }
    
    // Iterate PageRank algorithm
    for (let iter = 0; iter < iterations; iter++) {
      const newCentrality = new Map<string, number>();
      
      for (const [filePath, node] of this.nodes.entries()) {
        let sum = 0;
        
        // Sum contributions from files that import this file
        for (const dependent of node.importedBy) {
          const depNode = this.nodes.get(dependent);
          if (depNode && depNode.imports.length > 0) {
            sum += depNode.centrality / depNode.imports.length;
          }
        }
        
        // PageRank formula
        const newValue = (1 - damping) / nodeCount + damping * sum;
        newCentrality.set(filePath, newValue);
      }
      
      // Update centrality values
      for (const [filePath, centrality] of newCentrality.entries()) {
        const node = this.nodes.get(filePath);
        if (node) {
          node.centrality = centrality;
        }
      }
    }
    
    // Normalize centrality scores to 0-1 range
    const maxCentrality = Math.max(...Array.from(this.nodes.values()).map(n => n.centrality));
    if (maxCentrality > 0) {
      for (const node of this.nodes.values()) {
        node.centrality /= maxCentrality;
      }
    }
  }
  
  /**
   * Calculate depth from task-related files
   */
  calculateDepth(taskFiles: string[]): void {
    // BFS from task files to calculate distances
    const visited = new Map<string, number>();
    const queue: Array<{ filePath: string; depth: number }> = [];
    
    // Start from task files (depth 0)
    for (const filePath of taskFiles) {
      if (this.nodes.has(filePath)) {
        queue.push({ filePath, depth: 0 });
        visited.set(filePath, 0);
      }
    }
    
    // BFS
    while (queue.length > 0) {
      const { filePath, depth } = queue.shift()!;
      const node = this.nodes.get(filePath);
      
      if (!node) continue;
      
      // Update node depth
      node.depth = depth;
      
      // Visit dependencies
      for (const dep of node.imports) {
        if (!visited.has(dep)) {
          visited.set(dep, depth + 1);
          queue.push({ filePath: dep, depth: depth + 1 });
        }
      }
      
      // Visit dependents
      for (const dep of node.importedBy) {
        if (!visited.has(dep)) {
          visited.set(dep, depth + 1);
          queue.push({ filePath: dep, depth: depth + 1 });
        }
      }
    }
  }
  
  /**
   * Get most central files
   */
  getMostCentral(limit: number = 10): DependencyNode[] {
    return Array.from(this.nodes.values())
      .sort((a, b) => b.centrality - a.centrality)
      .slice(0, limit);
  }
}

/**
 * Build dependency graph from index entries
 */
export function buildDependencyGraph(entries: IndexEntry[]): DependencyGraph {
  const graph = new FileDependencyGraph();
  
  for (const entry of entries) {
    graph.addFile(entry.filePath, entry.dependencies);
  }
  
  // Calculate centrality scores
  graph.calculateCentrality();
  
  return graph;
}
