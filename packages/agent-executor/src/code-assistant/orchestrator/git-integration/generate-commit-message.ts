/**
 * @file generate-commit-message.ts
 * @description Generate intelligent commit messages using LLM or heuristics
 * 
 * Strategy:
 * 1. Analyze file changes (added, modified, deleted)
 * 2. Detect change patterns (feature, fix, refactor, etc.)
 * 3. Use LLM for intelligent message generation OR
 * 4. Fall back to heuristic-based generation
 * 5. Format using conventional commits standard
 */

import * as path from 'path';
import type { IModelRouter } from '../../../lib/model-router/index.js';
import type {
  CommitMessageConfig,
  CommitMessageResult,
} from './git-integration.types.js';

/**
 * Generate commit message from changes
 * 
 * @param config - Configuration for commit message generation
 * @param modelRouter - Optional model router for LLM-based generation
 * @returns Generated commit message
 */
export async function generateCommitMessage(
  config: CommitMessageConfig,
  modelRouter?: IModelRouter,
): Promise<CommitMessageResult> {
  const { changedFiles, description, useConventionalCommits = true } = config;

  // Try LLM-based generation first if router available
  if (modelRouter && description) {
    try {
      return await generateWithLLM(config, modelRouter);
    } catch {
      // Fall back to heuristic generation
    }
  }

  // Heuristic-based generation
  return generateWithHeuristics(config);
}

/**
 * Generate commit message using LLM
 */
async function generateWithLLM(
  config: CommitMessageConfig,
  modelRouter: IModelRouter,
): Promise<CommitMessageResult> {
  const { changedFiles, description, useConventionalCommits, maxLength = 72 } = config;

  // Build prompt for LLM
  const prompt = buildLLMPrompt(changedFiles, description, useConventionalCommits);

  // Call LLM with minimal tokens
  const response = await modelRouter.route('text-generation', {
    messages: [
      {
        role: 'system',
        content: 'You are a commit message generator. Generate concise, descriptive commit messages following conventional commits format.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    maxTokens: 150,
    temperature: 0.3,
  });

  // Parse LLM response
  const message = response.content.trim();
  const lines = message.split('\n');
  const subject = lines[0].substring(0, maxLength);
  const body = lines.length > 1 ? lines.slice(1).join('\n').trim() : undefined;

  // Extract type from conventional commit
  const typeMatch = subject.match(/^(\w+)(\(.+\))?:/);
  const type = typeMatch ? typeMatch[1] : undefined;

  return {
    message,
    subject,
    body,
    type,
    confidence: 0.9,
  };
}

/**
 * Generate commit message using heuristics
 */
function generateWithHeuristics(config: CommitMessageConfig): CommitMessageResult {
  const { changedFiles, description, changeType, useConventionalCommits = true } = config;

  // Detect change type from files if not provided
  const detectedType = changeType || detectChangeType(changedFiles);

  // Build subject line
  let subject: string;

  if (useConventionalCommits) {
    const scope = detectScope(changedFiles);
    const scopePart = scope ? `(${scope})` : '';
    const desc = description || generateDescription(changedFiles, detectedType);
    subject = `${detectedType}${scopePart}: ${desc}`;
  } else {
    subject = description || generateDescription(changedFiles, detectedType);
  }

  // Limit subject line length
  if (subject.length > 72) {
    subject = subject.substring(0, 69) + '...';
  }

  // Build body with file summary
  const body = buildFilesSummary(changedFiles);

  const message = body ? `${subject}\n\n${body}` : subject;

  return {
    message,
    subject,
    body: body || undefined,
    type: detectedType,
    confidence: 0.7,
  };
}

/**
 * Detect change type from file paths and patterns
 */
function detectChangeType(files: string[]): string {
  // Check for test files
  const hasTests = files.some(f => 
    f.includes('test') || 
    f.includes('spec') || 
    f.includes('__tests__')
  );

  // Check for documentation
  const hasDocs = files.some(f => 
    f.endsWith('.md') || 
    f.includes('docs/') ||
    f.includes('README')
  );

  // Check for configuration
  const hasConfig = files.some(f =>
    f.includes('config') ||
    f.endsWith('.json') ||
    f.endsWith('.yml') ||
    f.endsWith('.yaml')
  );

  // Check for build/deployment
  const hasBuild = files.some(f =>
    f.includes('package.json') ||
    f.includes('Dockerfile') ||
    f.includes('.github/workflows')
  );

  // Determine primary type
  if (hasDocs) return 'docs';
  if (hasTests) return 'test';
  if (hasBuild) return 'chore';
  if (hasConfig) return 'chore';

  // Check file extensions for code changes
  const hasNewFiles = files.some(f => !path.extname(f));
  if (hasNewFiles) return 'feat';

  // Default to fix for modifications
  return 'fix';
}

/**
 * Detect scope from file paths (common directory)
 */
function detectScope(files: string[]): string | null {
  if (files.length === 0) return null;

  // Find common directory
  const dirs = files.map(f => {
    const parsed = path.parse(f);
    const parts = parsed.dir.split(path.sep);
    return parts.length > 0 ? parts[0] : null;
  }).filter(Boolean);

  if (dirs.length === 0) return null;

  // Count occurrences
  const counts = new Map<string, number>();
  for (const dir of dirs) {
    counts.set(dir!, (counts.get(dir!) || 0) + 1);
  }

  // Return most common directory
  let maxCount = 0;
  let commonDir: string | null = null;
  for (const [dir, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      commonDir = dir;
    }
  }

  return commonDir;
}

/**
 * Generate description from files and type
 */
function generateDescription(files: string[], type: string): string {
  const count = files.length;

  const templates: Record<string, string> = {
    feat: count === 1 ? `add ${path.basename(files[0])}` : `add ${count} new files`,
    fix: count === 1 ? `fix ${path.basename(files[0])}` : `fix issues in ${count} files`,
    refactor: count === 1 ? `refactor ${path.basename(files[0])}` : `refactor ${count} files`,
    docs: 'update documentation',
    test: count === 1 ? `add tests for ${path.basename(files[0])}` : `add ${count} tests`,
    chore: 'update configuration',
  };

  return templates[type] || `update ${count} files`;
}

/**
 * Build files summary for commit body
 */
function buildFilesSummary(files: string[]): string {
  if (files.length === 0) return '';
  if (files.length > 10) {
    return `Modified ${files.length} files`;
  }

  return 'Files changed:\n' + files.map(f => `- ${f}`).join('\n');
}

/**
 * Build LLM prompt for commit message generation
 */
function buildLLMPrompt(
  files: string[],
  description: string | undefined,
  useConventionalCommits: boolean,
): string {
  let prompt = 'Generate a commit message for the following changes:\n\n';

  if (description) {
    prompt += `Task description: ${description}\n\n`;
  }

  prompt += `Files changed (${files.length}):\n`;
  const displayFiles = files.slice(0, 20);
  for (const file of displayFiles) {
    prompt += `- ${file}\n`;
  }

  if (files.length > 20) {
    prompt += `... and ${files.length - 20} more files\n`;
  }

  prompt += '\n';

  if (useConventionalCommits) {
    prompt += 'Use conventional commits format: <type>(<scope>): <description>\n';
    prompt += 'Types: feat, fix, refactor, docs, test, chore\n';
  }

  prompt += 'Keep the subject line under 72 characters.\n';
  prompt += 'Make it concise and descriptive.';

  return prompt;
}
