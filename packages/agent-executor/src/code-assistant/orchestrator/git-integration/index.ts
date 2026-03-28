/**
 * @file index.ts
 * @description Main git integration orchestrator
 * 
 * High-level workflow:
 * 1. Detect changes in working directory
 * 2. Stage specified files
 * 3. Generate commit message (LLM or heuristic)
 * 4. Commit changes with message
 * 5. Return commit hash and metadata
 * 
 * Usage:
 * ```ts
 * const result = await executeGitCommit({
 *   projectRoot: '/path/to/project',
 *   modifiedFiles: ['src/utils.ts', 'src/api.ts'],
 *   taskDescription: 'Add authentication to API',
 *   useConventionalCommits: true,
 * });
 * 
 * if (result.success) {
 *   console.log(`Committed: ${result.commitHash}`);
 * } else {
 *   console.error(`Commit failed: ${result.error}`);
 * }
 * ```
 */

import type { IModelRouter } from '../../../lib/model-router/index.js';
import { commitChanges } from './commit-changes.js';
import { detectGitChanges, stageFiles } from './detect-changes.js';
import { generateCommitMessage } from './generate-commit-message.js';
import type {
    GitCommitResult,
    GitIntegrationConfig,
} from './git-integration.types.js';

/**
 * Execute full git commit workflow
 * 
 * @param config - Git integration configuration
 * @param modelRouter - Optional model router for LLM-based commit message generation
 * @returns Commit result
 */
export async function executeGitCommit(
  config: GitIntegrationConfig,
  modelRouter?: IModelRouter,
): Promise<GitCommitResult> {
  const {
    projectRoot,
    modifiedFiles,
    commitMessage,
    stageFiles: shouldStage = true,
    useConventionalCommits = true,
    taskDescription,
  } = config;

  const start = Date.now();

  try {
    // Step 1: Detect git changes
    const changes = await detectGitChanges(projectRoot);

    if (!changes.hasGitRepo) {
      return {
        success: false,
        message: '',
        filesCommitted: [],
        duration: Date.now() - start,
        error: 'Not a git repository',
      };
    }

    // Step 2: Determine files to commit
    // Use explicitly modified files, or detect from git status
    const filesToCommit = modifiedFiles.length > 0
      ? modifiedFiles
      : [...changes.modified, ...changes.added];

    if (filesToCommit.length === 0) {
      return {
        success: true,
        message: 'No changes to commit',
        filesCommitted: [],
        duration: Date.now() - start,
      };
    }

    // Step 3: Stage files if requested
    if (shouldStage) {
      const stageResult = await stageFiles(projectRoot, filesToCommit);
      if (!stageResult.success) {
        return {
          success: false,
          message: '',
          filesCommitted: [],
          duration: Date.now() - start,
          error: stageResult.error,
        };
      }
    }

    // Step 4: Generate or use provided commit message
    let finalMessage: string;

    if (commitMessage) {
      finalMessage = commitMessage;
    } else {
      // Generate commit message
      const messageResult = await generateCommitMessage(
        {
          changedFiles: filesToCommit,
          description: taskDescription,
          useConventionalCommits,
        },
        modelRouter,
      );
      finalMessage = messageResult.message;
    }

    // Step 5: Commit changes
    const commitResult = await commitChanges(projectRoot, finalMessage);

    return commitResult;

  } catch (error) {
    return {
      success: false,
      message: '',
      filesCommitted: [],
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Re-export types and utilities
export { commitChanges, getCurrentBranch, hasUncommittedChanges } from './commit-changes.js';
export { detectGitChanges, stageFiles } from './detect-changes.js';
export { generateCommitMessage } from './generate-commit-message.js';
export * from './git-integration.types.js';

