/**
 * @file snapshot-manager.ts
 * @description Create and manage git-based snapshots for rollback
 * 
 * Strategies:
 * 1. git-stash: Creates git stash before execution (fastest, temporary)
 * 2. git-branch: Creates temporary branch (persistent, clean)
 * 3. git-commit: Creates commit on current branch (most persistent)
 * 4. none: No snapshot (user's choice)
 */

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import type {
    Snapshot,
    SnapshotConfig,
    SnapshotResult,
} from './rollback.types.js';

/**
 * Create snapshot before code execution
 * 
 * @param config - Snapshot configuration
 * @returns Snapshot result with metadata
 */
export async function createSnapshot(
  config: SnapshotConfig,
): Promise<SnapshotResult> {
  const start = Date.now();
  const {
    projectRoot,
    task,
    mode,
    filesToModify,
    filesToCreate = [],
    strategy = 'git-stash',
    includeUntracked = true,
  } = config;

  try {
    // Check if git repo exists
    const hasGit = await checkGitRepo(projectRoot);
    if (!hasGit) {
      return {
        success: false,
        error: 'Not a git repository',
        duration: Date.now() - start,
      };
    }

    // Generate snapshot ID
    const snapshotId = generateSnapshotId();

    // Create snapshot based on strategy
    let snapshot: Snapshot | undefined;

    switch (strategy) {
      case 'git-stash':
        snapshot = await createGitStashSnapshot(
          projectRoot,
          snapshotId,
          task,
          mode,
          filesToModify,
          filesToCreate,
          includeUntracked,
        );
        break;

      case 'git-branch':
        snapshot = await createGitBranchSnapshot(
          projectRoot,
          snapshotId,
          task,
          mode,
          filesToModify,
          filesToCreate,
        );
        break;

      case 'git-commit':
        snapshot = await createGitCommitSnapshot(
          projectRoot,
          snapshotId,
          task,
          mode,
          filesToModify,
          filesToCreate,
        );
        break;

      case 'none':
        // No snapshot - user's choice
        return {
          success: true,
          duration: Date.now() - start,
          snapshot: {
            id: snapshotId,
            task,
            mode,
            strategy: 'none',
            filesModified: filesToModify,
            filesCreated: filesToCreate,
            timestamp: Date.now(),
            projectRoot,
            applied: false,
            rolledBack: false,
          },
        };

      default:
        return {
          success: false,
          error: `Unknown snapshot strategy: ${strategy}`,
          duration: Date.now() - start,
        };
    }

    if (!snapshot) {
      return {
        success: false,
        error: 'Failed to create snapshot',
        duration: Date.now() - start,
      };
    }

    return {
      success: true,
      snapshot,
      duration: Date.now() - start,
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    };
  }
}

/**
 * Create git stash snapshot
 * 
 * Fastest strategy - creates a git stash with metadata
 */
async function createGitStashSnapshot(
  projectRoot: string,
  snapshotId: string,
  task: string,
  mode: string,
  filesToModify: string[],
  filesToCreate: string[],
  includeUntracked: boolean,
): Promise<Snapshot | undefined> {
  // Check if there are changes to stash
  const hasChanges = await hasUncommittedChanges(projectRoot);

  if (!hasChanges && filesToModify.length === 0 && filesToCreate.length === 0) {
    // No changes - create empty snapshot
    return {
      id: snapshotId,
      task,
      mode,
      strategy: 'git-stash',
      filesModified: [],
      filesCreated: [],
      timestamp: Date.now(),
      projectRoot,
      applied: false,
      rolledBack: false,
    };
  }

  // Create git stash with message
  const stashMessage = `codernic-snapshot-${snapshotId}: ${task}`;
  const args = ['stash', 'push', '-m', stashMessage];

  if (includeUntracked) {
    args.push('--include-untracked');
  }

  const { exitCode, stderr } = await executeGitCommand(args, projectRoot);

  if (exitCode !== 0) {
    throw new Error(`Git stash failed: ${stderr}`);
  }

  // Get stash reference (should be stash@{0})
  const stashRef = 'stash@{0}';

  return {
    id: snapshotId,
    task,
    mode,
    strategy: 'git-stash',
    stashRef,
    filesModified: filesToModify,
    filesCreated: filesToCreate,
    timestamp: Date.now(),
    projectRoot,
    applied: false,
    rolledBack: false,
  };
}

/**
 * Create git branch snapshot
 * 
 * Creates temporary branch from HEAD
 */
async function createGitBranchSnapshot(
  projectRoot: string,
  snapshotId: string,
  task: string,
  mode: string,
  filesToModify: string[],
  filesToCreate: string[],
): Promise<Snapshot | undefined> {
  const branchName = `codernic-snapshot-${snapshotId}`;

  // Create branch from HEAD
  const { exitCode, stderr } = await executeGitCommand(
    ['branch', branchName],
    projectRoot,
  );

  if (exitCode !== 0) {
    throw new Error(`Git branch creation failed: ${stderr}`);
  }

  return {
    id: snapshotId,
    task,
    mode,
    strategy: 'git-branch',
    branchName,
    filesModified: filesToModify,
    filesCreated: filesToCreate,
    timestamp: Date.now(),
    projectRoot,
    applied: false,
    rolledBack: false,
  };
}

/**
 * Create git commit snapshot
 * 
 * Creates commit on current branch
 */
async function createGitCommitSnapshot(
  projectRoot: string,
  snapshotId: string,
  task: string,
  mode: string,
  filesToModify: string[],
  filesToCreate: string[],
): Promise<Snapshot | undefined> {
  // Check if there are changes to commit
  const hasChanges = await hasUncommittedChanges(projectRoot);

  if (!hasChanges) {
    // No changes - get current HEAD commit
    const { stdout: currentCommit } = await executeGitCommand(
      ['rev-parse', 'HEAD'],
      projectRoot,
    );

    return {
      id: snapshotId,
      task,
      mode,
      strategy: 'git-commit',
      commitHash: currentCommit.trim(),
      filesModified: filesToModify,
      filesCreated: filesToCreate,
      timestamp: Date.now(),
      projectRoot,
      applied: false,
      rolledBack: false,
    };
  }

  // Stage all changes
  await executeGitCommand(['add', '-A'], projectRoot);

  // Create commit
  const commitMessage = `[snapshot-${snapshotId}] ${task}`;
  const { exitCode, stderr, stdout } = await executeGitCommand(
    ['commit', '-m', commitMessage],
    projectRoot,
  );

  if (exitCode !== 0) {
    throw new Error(`Git commit failed: ${stderr}`);
  }

  // Extract commit hash
  const commitHash = extractCommitHash(stdout);

  if (!commitHash) {
    throw new Error('Failed to extract commit hash');
  }

  return {
    id: snapshotId,
    task,
    mode,
    strategy: 'git-commit',
    commitHash,
    filesModified: filesToModify,
    filesCreated: filesToCreate,
    timestamp: Date.now(),
    projectRoot,
    applied: false,
    rolledBack: false,
  };
}

/**
 * Generate unique snapshot ID
 */
function generateSnapshotId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString('hex');
  return `${timestamp}-${random}`;
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
 * Check if working directory has uncommitted changes
 */
async function hasUncommittedChanges(projectRoot: string): Promise<boolean> {
  const { stdout } = await executeGitCommand(
    ['status', '--porcelain'],
    projectRoot,
  );
  return stdout.trim().length > 0;
}

/**
 * Extract commit hash from git commit output
 */
function extractCommitHash(output: string): string | undefined {
  const regex = /\[.+?\s+([a-f0-9]+)\]/;
  const match = regex.exec(output);
  return match ? match[1] : undefined;
}

/**
 * Execute git command
 */
function executeGitCommand(
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd, shell: true });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode || 0 });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}
