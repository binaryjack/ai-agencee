/**
 * Type definitions for the approval gate system.
 *
 * Implements human-in-the-loop approval for code generation:
 * - Preview code before applying to disk
 * - Approve/reject individual patches
 * - Edit generated code before applying
 * - Trust levels: preview | approve-each | auto
 *
 * Philosophy: Humans review AI output at critical checkpoints,
 * providing quality control and learning opportunities.
 */

/**
 * Trust level for approval gates
 */
export type ApprovalTrustLevel = 'preview' | 'approve-each' | 'auto';

/**
 * Action taken by user on a patch
 */
export type ApprovalAction = 'approve' | 'reject' | 'edit';

/**
 * Single patch with approval metadata
 */
export interface PatchApproval {
  /** Index in the patches array */
  patchIndex: number;
  
  /** File path for this patch */
  filePath: string;
  
  /** Whether this is a new file */
  isNew: boolean;
  
  /** Whether this is a deletion */
  isDelete: boolean;
  
  /** Original content (for edits and deletions) */
  originalContent?: string;
  
  /** Generated content */
  generatedContent: string;
  
  /** User's action */
  action?: ApprovalAction;
  
  /** Edited content (if action is 'edit') */
  editedContent?: string;
  
  /** Reason for rejection (if action is 'reject') */
  rejectionReason?: string;
}

/**
 * Approval request sent to approval handler
 */
export interface ApprovalRequest {
  /** Task that generated these patches */
  task: string;
  
  /** Execution mode */
  mode: 'quick-fix' | 'feature' | 'refactor' | 'debug';
  
  /** Patches requiring approval */
  patches: PatchApproval[];
  
  /** Total estimated cost of this execution */
  estimatedCost: number;
  
  /** Validation results (if validation was run) */
  validationResult?: {
    passed: boolean;
    totalErrors: number;
    totalWarnings: number;
    issues: Array<{
      validator: string;
      severity: 'error' | 'warning' | 'info';
      message: string;
      filePath?: string;
      line?: number;
      suggestion?: string;
    }>;
  };
}

/**
 * Approval response from approval handler
 */
export interface ApprovalResponse {
  /** Whether user approved the execution */
  approved: boolean;
  
  /** Updated patches with user actions */
  patches: PatchApproval[];
  
  /** Total time spent in approval (ms) */
  approvalDuration: number;
  
  /** Cancellation reason (if approved is false) */
  cancellationReason?: string;
}

/**
 * Statistics about approval decisions
 */
export interface ApprovalStats {
  /** Total patches presented */
  totalPatches: number;
  
  /** Patches approved without changes */
  approvedCount: number;
  
  /** Patches edited before approval */
  editedCount: number;
  
  /** Patches rejected */
  rejectedCount: number;
  
  /** Approval rate (approved / total) */
  approvalRate: number;
  
  /** Average time per patch (ms) */
  avgTimePerPatch: number;
}

/**
 * Configuration for approval gate system
 */
export interface ApprovalGateConfig {
  /** Trust level for automatic approval */
  trustLevel: ApprovalTrustLevel;
  
  /** Approval handler implementation */
  approvalHandler?: ApprovalHandler;
  
  /** Auto-approve if validation passes with no errors */
  autoApproveIfValidationPasses?: boolean;
  
  /** Auto-approve for specific file patterns (e.g., test files) */
  autoApprovePatterns?: string[];
  
  /** Always require approval for specific patterns (e.g., config files) */
  alwaysRequireApprovalPatterns?: string[];
  
  /** Timeout for approval (ms) - auto-reject if exceeded */
  approvalTimeout?: number;
}

/**
 * Approval handler interface - implement this for custom approval UIs
 */
export interface ApprovalHandler {
  /**
   * Request approval from user
   * @param request Approval request with patches and validation results
   * @returns Promise resolving to approval response
   */
  requestApproval(request: ApprovalRequest): Promise<ApprovalResponse>;
  
  /**
   * Get approval statistics
   */
  getStats?(): ApprovalStats;
}

/**
 * Default CLI approval handler for terminal-based approval
 */
export interface CliApprovalHandler extends ApprovalHandler {
  /** Whether to show diffs in color */
  colorDiffs?: boolean;
  
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  
  /** Maximum lines to show per patch (default: 50) */
  maxLinesPerPatch?: number;
}
