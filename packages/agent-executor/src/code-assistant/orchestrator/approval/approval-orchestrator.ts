/**
 * Approval gate orchestrator - integrates human approval into execution workflow.
 *
 * Handles:
 * - Trust level evaluation (auto-approve vs. require approval)
 * - Pattern matching for auto-approval
 * - Approval request construction
 * - Patch filtering based on approval decisions
 *
 * Philosophy: Humans control what gets applied to disk.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { FilePatch } from '../../code-assistant-orchestrator.types.js';
import type { ValidationResult } from '../validation/validation.types.js';
import type {
    ApprovalGateConfig,
    ApprovalRequest,
    ApprovalResponse,
    ApprovalTrustLevel,
    PatchApproval,
} from './approval.types.js';

/**
 * Check if file path matches any pattern
 */
function matchesPattern(filePath: string, patterns: string[]): boolean {
  // Simple glob matching - * matches any characters except /
  // ** matches any characters including /
  return patterns.some((pattern) => {
    const regexPattern = pattern
      .replace(/\*\*/g, '§§') // Temporary placeholder for **
      .replace(/\*/g, '[^/]*') // * matches non-slash
      .replace(/§§/g, '.*') // ** matches everything
      .replace(/\./g, '\\.'); // Escape dots
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  });
}

/**
 * Determine if approval is required based on trust level and config
 */
export async function requiresApproval(
  trustLevel: ApprovalTrustLevel,
  patches: FilePatch[],
  config: ApprovalGateConfig,
  validationResult?: ValidationResult,
): Promise<boolean> {
  // Auto trust level - never require approval
  if (trustLevel === 'auto') {
    return false;
  }
  
  // Preview trust level - always require approval
  if (trustLevel === 'preview') {
    return true;
  }
  
  // Approve-each level - check conditions
  
  // Auto-approve if validation passes and config allows
  if (config.autoApproveIfValidationPasses && validationResult?.passed) {
    // Check if all patches match auto-approve patterns
    if (config.autoApprovePatterns && config.autoApprovePatterns.length > 0) {
      const allMatch = patches.every((p) =>
        matchesPattern(p.relativePath, config.autoApprovePatterns!)
      );
      if (allMatch) {
        return false;
      }
    }
  }
  
  // Check if any patches require approval
  if (config.alwaysRequireApprovalPatterns && config.alwaysRequireApprovalPatterns.length > 0) {
    const anyRequire = patches.some((p) =>
      matchesPattern(p.relativePath, config.alwaysRequireApprovalPatterns!)
    );
    if (anyRequire) {
      return true;
    }
  }
  
  // Default: require approval for approve-each
  return true;
}

/**
 * Convert FilePatch to PatchApproval with file content
 */
async function createPatchApproval(
  patch: FilePatch,
  index: number,
  projectRoot: string,
): Promise<PatchApproval> {
  const fullPath = path.isAbsolute(patch.relativePath)
    ? patch.relativePath
    : path.join(projectRoot, patch.relativePath);
  
  let originalContent: string | undefined;
  let isNew = true;
  
  // Try to read original content
  try {
    originalContent = await fs.readFile(fullPath, 'utf-8');
    isNew = false;
  } catch {
    // File doesn't exist - it's new
  }
  
  return {
    patchIndex: index,
    filePath: patch.relativePath,
    isNew,
    isDelete: patch.delete ?? false,
    originalContent,
    generatedContent: patch.content,
  };
}

/**
 * Request approval from user for patches
 */
export async function requestPatchApproval(
  task: string,
  mode: 'quick-fix' | 'feature' | 'refactor' | 'debug',
  patches: FilePatch[],
  estimatedCost: number,
  config: ApprovalGateConfig,
  projectRoot: string,
  validationResult?: ValidationResult,
): Promise<ApprovalResponse> {
  // Create patch approvals with file content
  const patchApprovals = await Promise.all(
    patches.map((p, i) => createPatchApproval(p, i, projectRoot))
  );
  
  // Build approval request
  const request: ApprovalRequest = {
    task,
    mode,
    patches: patchApprovals,
    estimatedCost,
    validationResult: validationResult ? {
      passed: validationResult.passed,
      totalErrors: validationResult.totalErrors,
      totalWarnings: validationResult.totalWarnings,
      issues: validationResult.validators.flatMap((v) =>
        v.issues.map((issue) => ({
          validator: issue.validator,
          severity: issue.severity,
          message: issue.message,
          filePath: issue.filePath,
          line: issue.line,
          suggestion: issue.suggestion,
        }))
      ),
    } : undefined,
  };
  
  // Use approval handler
  if (!config.approvalHandler) {
    throw new Error('Approval handler not configured');
  }
  
  // Request approval with timeout
  const timeout = config.approvalTimeout || 300000; // 5 minutes default
  
  const approvalPromise = config.approvalHandler.requestApproval(request);
  const timeoutPromise = new Promise<ApprovalResponse>((_, reject) => {
    setTimeout(() => reject(new Error('Approval timeout')), timeout);
  });
  
  return Promise.race([approvalPromise, timeoutPromise]);
}

/**
 * Filter patches based on approval decisions
 */
export function filterApprovedPatches(
  originalPatches: FilePatch[],
  approvalResponse: ApprovalResponse,
): FilePatch[] {
  if (!approvalResponse.approved) {
    return [];
  }
  
  const approvedPatches: FilePatch[] = [];
  
  for (const approval of approvalResponse.patches) {
    const action = approval.action || 'approve';
    
    if (action === 'approve') {
      // Use original patch
      approvedPatches.push(originalPatches[approval.patchIndex]);
    } else if (action === 'edit' && approval.editedContent) {
      // Use edited content
      const originalPatch = originalPatches[approval.patchIndex];
      approvedPatches.push({
        ...originalPatch,
        content: approval.editedContent,
      });
    }
    // action === 'reject' - don't add to approved patches
  }
  
  return approvedPatches;
}

/**
 * Main approval gate workflow
 */
export async function executeApprovalGate(
  task: string,
  mode: 'quick-fix' | 'feature' | 'refactor' | 'debug',
  patches: FilePatch[],
  estimatedCost: number,
  config: ApprovalGateConfig,
  projectRoot: string,
  validationResult?: ValidationResult,
): Promise<{
  approved: boolean;
  filteredPatches: FilePatch[];
  approvalDuration: number;
  rejectionReason?: string;
}> {
  // Check if approval is required
  const needsApproval = await requiresApproval(
    config.trustLevel,
    patches,
    config,
    validationResult,
  );
  
  if (!needsApproval) {
    // Auto-approve all patches
    return {
      approved: true,
      filteredPatches: patches,
      approvalDuration: 0,
    };
  }
  
  // Request approval
  const approvalResponse = await requestPatchApproval(
    task,
    mode,
    patches,
    estimatedCost,
    config,
    projectRoot,
    validationResult,
  );
  
  if (!approvalResponse.approved) {
    return {
      approved: false,
      filteredPatches: [],
      approvalDuration: approvalResponse.approvalDuration,
      rejectionReason: approvalResponse.cancellationReason,
    };
  }
  
  // Filter patches based on approval
  const filteredPatches = filterApprovedPatches(patches, approvalResponse);
  
  return {
    approved: true,
    filteredPatches,
    approvalDuration: approvalResponse.approvalDuration,
  };
}
