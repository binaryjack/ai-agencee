/**
 * Git Utilities
 * 
 * Provides common git operations for rollback functionality.
 * Extracted from rollback-executor.ts to follow Single Responsibility Principle.
 */

import { spawn } from 'node:child_process';

export interface GitCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Execute a git command in the specified directory
 * 
 * @param args - Git command arguments
 * @param cwd - Working directory
 * @returns Command result with exit code and output
 */
export async function executeGitCommand(
  args: string[],
  cwd: string,
): Promise<GitCommandResult> {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd, shell: true });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
    
    child.on('error', (err) => {
      resolve({
        exitCode: 1,
        stdout: '',
        stderr: err.message,
      });
    });
  });
}

/**
 * Check if working directory has uncommitted changes
 * 
 * @param projectRoot - Project root directory
 * @returns True if there are uncommitted changes
 */
export async function hasUncommittedChanges(projectRoot: string): Promise<boolean> {
  const { stdout } = await executeGitCommand(['status', '--porcelain'], projectRoot);
  return stdout.length > 0;
}

/**
 * Check if a git stash reference exists
 * 
 * @param stashRef - Stash reference (e.g., 'stash@{0}')
 * @param projectRoot - Project root directory
 * @returns True if stash exists
 */
export async function stashExists(stashRef: string, projectRoot: string): Promise<boolean> {
  const { exitCode } = await executeGitCommand(['stash', 'list'], projectRoot);
  if (exitCode !== 0) return false;
  
  const { stdout } = await executeGitCommand(['stash', 'list'], projectRoot);
  return stdout.includes(stashRef);
}

/**
 * Check if a branch exists
 * 
 * @param branchName - Branch name
 * @param projectRoot - Project root directory
 * @returns True if branch exists
 */
export async function branchExists(branchName: string, projectRoot: string): Promise<boolean> {
  const { exitCode } = await executeGitCommand(['rev-parse', '--verify', branchName], projectRoot);
  return exitCode === 0;
}

/**
 * Check if a commit exists
 * 
 * @param commitHash - Commit hash
 * @param projectRoot - Project root directory
 * @returns True if commit exists
 */
export async function commitExists(commitHash: string, projectRoot: string): Promise<boolean> {
  const { exitCode } = await executeGitCommand(['cat-file', '-e', commitHash], projectRoot);
  return exitCode === 0;
}
