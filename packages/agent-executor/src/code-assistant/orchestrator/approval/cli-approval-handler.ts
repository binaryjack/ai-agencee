/**
 * CLI approval handler for terminal-based human approval.
 *
 * Displays:
 * - Diff of each patch
 * - Validation errors/warnings
 * - Interactive prompts for approve/reject/edit
 *
 * Uses readline for interactive terminal input.
 */

import { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';
import type {
    ApprovalRequest,
    ApprovalResponse,
    ApprovalStats,
    CliApprovalHandler as ICliApprovalHandler,
    PatchApproval,
} from './approval.types.js';

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Format file diff for terminal display
 */
function formatDiff(patch: PatchApproval, showLineNumbers: boolean = true): string {
  const lines: string[] = [];
  
  // Header
  const icon = patch.isDelete ? '🗑️' : patch.isNew ? '➕' : '📝';
  const action = patch.isDelete ? 'DELETE' : patch.isNew ? 'NEW' : 'MODIFY';
  lines.push(`${colors.bright}${icon} ${action}: ${patch.filePath}${colors.reset}`);
  lines.push('─'.repeat(60));
  
  if (patch.isDelete) {
    lines.push(`${colors.red}This file will be deleted${colors.reset}`);
    return lines.join('\n');
  }
  
  // Show content (simplified - no actual diff, just show new content)
  const content = patch.generatedContent;
  const contentLines = content.split('\n');
  
  contentLines.forEach((line, idx) => {
    const lineNum = showLineNumbers ? `${colors.dim}${String(idx + 1).padStart(4)} ${colors.reset}` : '';
    lines.push(`${lineNum}${colors.green}+ ${line}${colors.reset}`);
  });
  
  return lines.join('\n');
}

/**
 * CLI approval handler implementation
 */
export class CliApprovalHandler implements ICliApprovalHandler {
  private stats: ApprovalStats = {
    totalPatches: 0,
    approvedCount: 0,
    editedCount: 0,
    rejectedCount: 0,
    approvalRate: 0,
    avgTimePerPatch: 0,
  };
  
  public colorDiffs: boolean = true;
  public showLineNumbers: boolean = true;
  public maxLinesPerPatch: number = 50;
  
  async requestApproval(request: ApprovalRequest): Promise<ApprovalResponse> {
    const startTime = Date.now();
    
    console.log('\n' + '═'.repeat(60));
    console.log(`${colors.bright}${colors.cyan}Code Generation Approval Required${colors.reset}`);
    console.log('═'.repeat(60));
    
    // Show task
    console.log(`\n${colors.bright}Task:${colors.reset} ${request.task}`);
    console.log(`${colors.bright}Mode:${colors.reset} ${request.mode}`);
    console.log(`${colors.bright}Estimated Cost:${colors.reset} $${request.estimatedCost.toFixed(4)}`);
    
    // Show validation results
    if (request.validationResult) {
      const { passed, totalErrors, totalWarnings } = request.validationResult;
      const statusIcon = passed ? '✅' : '❌';
      const statusColor = passed ? colors.green : colors.red;
      
      console.log(`\n${colors.bright}Validation:${colors.reset} ${statusColor}${statusIcon} ${passed ? 'PASSED' : 'FAILED'}${colors.reset}`);
      console.log(`  Errors: ${totalErrors}, Warnings: ${totalWarnings}`);
      
      if (!passed || totalWarnings > 0) {
        console.log(`\n${colors.yellow}Issues Found:${colors.reset}`);
        request.validationResult.issues.slice(0, 5).forEach((issue) => {
          const icon = issue.severity === 'error' ? '✗' : '⚠';
          const color = issue.severity === 'error' ? colors.red : colors.yellow;
          const location = issue.filePath ? ` (${issue.filePath}:${issue.line || '?'})` : '';
          console.log(`  ${color}${icon} ${issue.message}${location}${colors.reset}`);
        });
        
        if (request.validationResult.issues.length > 5) {
          console.log(`  ${colors.dim}...and ${request.validationResult.issues.length - 5} more${colors.reset}`);
        }
      }
    }
    
    // Show patches
    console.log(`\n${colors.bright}Changes (${request.patches.length} files):${colors.reset}`);
    
    const rl = readline.createInterface({ input, output });
    const patches: PatchApproval[] = [];
    
    try {
      for (const patch of request.patches) {
        console.log('\n' + formatDiff(patch, this.showLineNumbers));
        
        // Prompt for action
        const answer = await rl.question(
          `\n${colors.bright}Action?${colors.reset} [${colors.green}a${colors.reset}]pprove / [${colors.red}r${colors.reset}]eject / [${colors.yellow}e${colors.reset}]dit / [${colors.blue}s${colors.reset}]kip: `
        );
        
        const action = answer.trim().toLowerCase();
        
        if (action === 'a' || action === 'approve' || action === '') {
          patches.push({ ...patch, action: 'approve' });
          this.stats.approvedCount++;
          console.log(`${colors.green}✓ Approved${colors.reset}`);
        } else if (action === 'r' || action === 'reject') {
          const reason = await rl.question('Rejection reason (optional): ');
          patches.push({
            ...patch,
            action: 'reject',
            rejectionReason: reason || 'Rejected by user',
          });
          this.stats.rejectedCount++;
          console.log(`${colors.red}✗ Rejected${colors.reset}`);
        } else if (action === 'e' || action === 'edit') {
          console.log(`${colors.yellow}⚠ Edit mode not implemented in CLI - approving with note${colors.reset}`);
          patches.push({ ...patch, action: 'approve' });
          this.stats.editedCount++;
        } else {
          // Skip - add with no action
          patches.push({ ...patch });
          console.log(`${colors.dim}○ Skipped${colors.reset}`);
        }
        
        this.stats.totalPatches++;
      }
      
      // Final confirmation
      const approved = patches.some((p) => p.action === 'approve' || !p.action);
      
      if (approved) {
        const confirm = await rl.question(
          `\n${colors.bright}Apply ${patches.filter((p) => p.action === 'approve' || !p.action).length} changes?${colors.reset} [Y/n]: `
        );
        
        if (confirm.trim().toLowerCase() === 'n') {
          rl.close();
          return {
            approved: false,
            patches,
            approvalDuration: Date.now() - startTime,
            cancellationReason: 'User cancelled final confirmation',
          };
        }
      }
      
      rl.close();
      
      // Update stats
      this.stats.approvalRate = this.stats.totalPatches > 0
        ? this.stats.approvedCount / this.stats.totalPatches
        : 0;
      this.stats.avgTimePerPatch = this.stats.totalPatches > 0
        ? (Date.now() - startTime) / this.stats.totalPatches
        : 0;
      
      return {
        approved,
        patches,
        approvalDuration: Date.now() - startTime,
      };
    } catch (error: unknown) {
      rl.close();
      throw error;
    }
  }
  
  getStats(): ApprovalStats {
    return { ...this.stats };
  }
}
