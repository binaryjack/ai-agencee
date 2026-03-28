/**
 * @file commit-changes.ts
 * @description Execute git commit with generated or provided message
 * 
 * Safety features:
 * - Validates that files are staged before committing
 * - Supports dry-run mode
 * - Returns commit hash for tracking
 */

import { spawn } from 'child_process';
import type { GitCommitResult } from './git-integration.types.js';

/**
 * Commit staged changes with message
 * 
 * @param projectRoot - Project root directory
 * @param message - Commit message
 * @param dryRun - If true, show what would be committed without committing
 * @returns Commit result with hash
 */
export async function commitChanges(
  projectRoot: string,
  message: string,
  dryRun = false,
): Promise<GitCommitResult> {
  const start = Date.now();

  // Validate that there are staged changes
  const stagedFiles = await getStagedFiles(projectRoot);
  
  if (stagedFiles.length === 0) {
    return {
      success: false,
      message,
      filesCommitted: [],
      duration: Date.now() - start,
      error: 'No files staged for commit',
    };
  }

  // Dry run: show what would be committed
  if (dryRun) {
    return {
      success: true,
      message,
      filesCommitted: stagedFiles,
      duration: Date.now() - start,
    };
  }

  // Execute git commit
  try {
    const { exitCode, stdout, stderr } = await executeGitCommand(
      ['commit', '-m', message],
      projectRoot,
    );

    if (exitCode !== 0) {
      return {
        success: false,
        message,
        filesCommitted: stagedFiles,
        duration: Date.now() - start,
        error: `Git commit failed: ${stderr}`,
      };
    }

    // Extract commit hash from output
    const commitHash = extractCommitHash(stdout);

    return {
      success: true,
      message,
      filesCommitted: stagedFiles,
      commitHash,
      duration: Date.now() - start,
    };

  } catch (error) {
    return {
      success: false,
      message,
      filesCommitted: stagedFiles,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get list of staged files
 */
async function getStagedFiles(projectRoot: string): Promise<string[]> {
  const { stdout } = await executeGitCommand(
    ['diff', '--cached', '--name-only'],
    projectRoot,
  );

  return stdout
    .trim()
    .split('\n')
    .filter(line => line.length > 0);
}

/**
 * Extract commit hash from git commit output
 * 
 * Output format: "[branch hash] commit message"
 */
function extractCommitHash(output: string): string | undefined {
  const match = output.match(/\[.+?\s+([a-f0-9]+)\]/);
  return match ? match[1] : undefined;
}

/**
 * Execute git command and capture output
 */
function executeGitCommand(
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const proc = spawn('git', args, {
      cwd,
      shell: true,
    });

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (exitCode) => {
      resolve({
        stdout,
        stderr,
        exitCode: exitCode ?? 1,
      });
    });

    proc.on('error', (error) => {
      resolve({
        stdout,
        stderr: stderr + '\n' + error.message,
        exitCode: 1,
      });
    });
  });
}

/**
 * Check if there are uncommitted changes
 */
export async function hasUncommittedChanges(projectRoot: string): Promise<boolean> {
  const { stdout } = await executeGitCommand(
    ['status', '--porcelain'],
    projectRoot,
  );

  return stdout.trim().length > 0;
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(projectRoot: string): Promise<string | null> {
  const { exitCode, stdout } = await executeGitCommand(
    ['branch', '--show-current'],
    projectRoot,
  );

  if (exitCode !== 0) {
    return null;
  }

  return stdout.trim() || null;
}
