/**
 * @file detect-changes.ts
 * @description Detect git changes in working directory
 * 
 * Uses `git status --porcelain` for reliable change detection
 */

import { spawn } from 'child_process'
import type { GitChangesResult } from './git-integration.types.js'

/**
 * Detect changes in git working directory
 */
export async function detectGitChanges(projectRoot: string): Promise<GitChangesResult> {
  // Check if git repo exists
  const hasGitRepo = await checkGitRepo(projectRoot);

  if (!hasGitRepo) {
    return {
      modified: [],
      added: [],
      deleted: [],
      totalChanges: 0,
      hasGitRepo: false,
      isClean: true,
    };
  }

  // Get git status
  const { stdout } = await executeGitCommand(
    ['status', '--porcelain'],
    projectRoot,
  );

  // Parse git status output
  const modified: string[] = [];
  const added: string[] = [];
  const deleted: string[] = [];

  const lines = stdout.trim().split('\n').filter(line => line.length > 0);

  for (const line of lines) {
    // Git status porcelain format:
    // XY filename
    // X = index status, Y = working tree status
    const status = line.substring(0, 2);
    const filename = line.substring(3).trim();

    // Modified files (M in working tree or index)
    if (status.includes('M')) {
      modified.push(filename);
    }
    // Added/untracked files (A or ??)
    else if (status.includes('A') || status === '??') {
      added.push(filename);
    }
    // Deleted files (D)
    else if (status.includes('D')) {
      deleted.push(filename);
    }
  }

  const totalChanges = modified.length + added.length + deleted.length;

  return {
    modified,
    added,
    deleted,
    totalChanges,
    hasGitRepo: true,
    isClean: totalChanges === 0,
  };
}

/**
 * Check if directory is a git repository
 */
async function checkGitRepo(projectRoot: string): Promise<boolean> {
  try {
    const { exitCode } = await executeGitCommand(
      ['rev-parse', '--git-dir'],
      projectRoot,
    );
    return exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Execute git command
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
 * Stage specific files for commit
 */
export async function stageFiles(
  projectRoot: string,
  files: string[],
): Promise<{ success: boolean; error?: string }> {
  if (files.length === 0) {
    return { success: true };
  }

  try {
    const { exitCode, stderr } = await executeGitCommand(
      ['add', ...files],
      projectRoot,
    );

    if (exitCode !== 0) {
      return {
        success: false,
        error: `Git add failed: ${stderr}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
