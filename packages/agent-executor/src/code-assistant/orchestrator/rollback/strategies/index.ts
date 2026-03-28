/**
 * @file strategies/index.ts
 * @description Rollback Strategy Factory
 * 
 * SOLID Principles - Open/Closed Principle (OCP) in Action:
 * 
 * This factory demonstrates the Strategy Pattern, which is the primary
 * implementation of the Open/Closed Principle:
 * 
 * - CLOSED for modification: Adding a new strategy doesn't change existing code
 * - OPEN for extension: New strategies easily added
 * 
 * How to Add a New Strategy:
 * 
 * 1. Create strategy file (e.g., docker-snapshot-strategy.ts):
 *    ```typescript
 *    export class DockerSnapshotStrategy implements IRollbackStrategy {
 *      getName() { return 'docker-snapshot'; }
 *      validate(snapshot) { ... }
 *      async execute(snapshot, options) { ... }
 *    }
 *    ```
 * 
 * 2. Import and register here:
 *    ```typescript
 *    import { DockerSnapshotStrategy } from './docker-snapshot-strategy.js';
 *    
 *    case 'docker-snapshot':
 *      return new DockerSnapshotStrategy();
 *    ```
 * 
 * 3. Done! Zero changes to:
 *    - rollback-executor.ts (core logic unchanged)
 *    - rollback-orchestrator.ts (orchestrator unchanged)
 *    - Any existing strategy files
 * 
 * Current Strategies:
 * - git-stash: Use git stash for rollback (40 lines)
 * - git-branch: Create rollback branch (60 lines)
 * - git-commit: Commit-based rollback (50 lines)
 * - none: No-op rollback for testing (25 lines)
 * 
 * Extensible to:
 * - file-backup: File copy rollback
 * - hybrid: Git + file backup combination
 * - incremental: Patch-based rollback
 * - docker-snapshot: Container-based rollback
 * - cloud-backup: Cloud storage rollback
 */

export { GitBranchStrategy } from './git-branch-strategy.js'
export { GitCommitStrategy } from './git-commit-strategy.js'
export { GitStashStrategy } from './git-stash-strategy.js'
export { NoneStrategy } from './none-strategy.js'
export { IRollbackStrategy } from './rollback-strategy.interface.js'

import type { SnapshotStrategy } from '../rollback.types.js'
import { GitBranchStrategy } from './git-branch-strategy.js'
import { GitCommitStrategy } from './git-commit-strategy.js'
import { GitStashStrategy } from './git-stash-strategy.js'
import { NoneStrategy } from './none-strategy.js'
import type { IRollbackStrategy } from './rollback-strategy.interface.js'

/**
 * Factory for creating rollback strategies based on strategy type
 * 
 * Strategy Pattern Implementation:
 * - Each strategy implements IRollbackStrategy interface
 * - Factory hides concrete classes from clients
 * - Adding new strategy only requires updating this switch
 * - Exhaustiveness checking via TypeScript's never type
 * 
 * @param strategyType - Type of rollback strategy to create
 * @returns Concrete strategy instance
 * @throws Error if strategy type is unknown
 */
export function createRollbackStrategy(strategyType: SnapshotStrategy): IRollbackStrategy {
  switch (strategyType) {
    case 'git-stash':
      return new GitStashStrategy();
    case 'git-branch':
      return new GitBranchStrategy();
    case 'git-commit':
      return new GitCommitStrategy();
    case 'none':
      return new NoneStrategy();
    default: {
      const exhaustiveCheck: never = strategyType;
      throw new Error(`Unknown rollback strategy: ${exhaustiveCheck}`);
    }
  }
}
