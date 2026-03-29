/**
 * DAG Type Definitions
 * Replaces: any, Record<string, any>, inline DAG structures
 * 
 * Phase 1.4: Foundation - Core Types
 */

/**
 * Complete DAG (Directed Acyclic Graph) workflow structure
 */
export interface Dag {
  /** Human-readable workflow name */
  name: string;
  
  /** Description of what this workflow does */
  description: string;
  
  /** Parallel execution lanes */
  lanes: DagLane[];
  
  /** Global synchronization points */
  globalBarriers: string[];
  
  /** Maps capabilities to lane IDs that provide them */
  capabilityRegistry: CapabilityRegistry;
  
  /** Path to model router configuration (relative to DAG file) */
  modelRouterFile: string;
}

/**
 * A single lane in the DAG
 */
export interface DagLane {
  /** Unique lane identifier (lowercase-with-dashes) */
  id: string;
  
  /** Path to agent configuration file */
  agentFile: string;
  
  /** Path to supervisor configuration file */
  supervisorFile: string;
  
  /** Lane IDs that must complete before this lane starts */
  dependsOn: string[];
  
  /** Capabilities this lane provides */
  capabilities: string[];
}

/**
 * Capability registry mapping
 * Maps capability names to lane ID(s) that provide them
 */
export interface CapabilityRegistry {
  [capability: string]: string | string[];
}

/**
 * DAG validation result
 */
export interface DagValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * DAG execution options
 */
export interface DagExecutionOptions {
  /** Path to DAG file */
  dagFile: string;
  
  /** Project root directory */
  projectRoot?: string;
  
  /** Enable verbose output */
  verbose?: boolean;
  
  /** Enable interactive dashboard */
  dashboard?: boolean;
  
  /** Skip approval prompts */
  skipApproval?: boolean;
  
  /** Provider override */
  provider?: string;
}

// ==========================================================================
// Type Guards
// ==========================================================================

/**
 * Check if a value is a valid Dag
 */
export function isDag(value: unknown): value is Dag {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    Array.isArray(obj.lanes) &&
    obj.lanes.every(isDagLane) &&
    Array.isArray(obj.globalBarriers) &&
    obj.globalBarriers.every(barrier => typeof barrier === 'string') &&
    typeof obj.capabilityRegistry === 'object' &&
    obj.capabilityRegistry !== null &&
    typeof obj.modelRouterFile === 'string'
  );
}

/**
 * Check if a value is a valid DagLane
 */
export function isDagLane(value: unknown): value is DagLane {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.agentFile === 'string' &&
    typeof obj.supervisorFile === 'string' &&
    Array.isArray(obj.dependsOn) &&
    obj.dependsOn.every(dep => typeof dep === 'string') &&
    Array.isArray(obj.capabilities) &&
    obj.capabilities.every(cap => typeof cap === 'string')
  );
}

/**
 * Check if a value is a valid CapabilityRegistry
 */
export function isCapabilityRegistry(value: unknown): value is CapabilityRegistry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  return Object.values(obj).every(val => 
    typeof val === 'string' ||
    (Array.isArray(val) && val.every(v => typeof v === 'string'))
  );
}

// ==========================================================================
// Utility Functions
// ==========================================================================

/**
 * Create an empty DAG structure
 */
export function createEmptyDag(name: string, description: string): Dag {
  return {
    name,
    description,
    lanes: [],
    globalBarriers: [],
    capabilityRegistry: {},
    modelRouterFile: 'model-router.json',
  };
}

/**
 * Create a DAG lane
 */
export function createDagLane(
  id: string,
  agentFile: string,
  supervisorFile: string,
  capabilities: string[] = [],
  dependsOn: string[] = []
): DagLane {
  return {
    id,
    agentFile,
    supervisorFile,
    dependsOn,
    capabilities,
  };
}

/**
 * Get all lane IDs from a DAG
 */
export function getLaneIds(dag: Dag): string[] {
  return dag.lanes.map(lane => lane.id);
}

/**
 * Find a lane by ID
 */
export function findLaneById(dag: Dag, laneId: string): DagLane | undefined {
  return dag.lanes.find(lane => lane.id === laneId);
}

/**
 * Check if a DAG has cycles (basic check)
 */
export function hasCycles(dag: Dag): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  function visit(laneId: string): boolean {
    if (recursionStack.has(laneId)) {
      return true; // Cycle detected
    }
    
    if (visited.has(laneId)) {
      return false; // Already processed
    }
    
    visited.add(laneId);
    recursionStack.add(laneId);
    
    const lane = findLaneById(dag, laneId);
    if (lane) {
      for (const depId of lane.dependsOn) {
        if (visit(depId)) {
          return true;
        }
      }
    }
    
    recursionStack.delete(laneId);
    return false;
  }
  
  for (const lane of dag.lanes) {
    if (visit(lane.id)) {
      return true;
    }
  }
  
  return false;
}
