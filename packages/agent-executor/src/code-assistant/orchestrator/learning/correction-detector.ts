/**
 * @file correction-detector.ts
 * @description Detect when user manually corrects AI-generated code
 * 
 * Strategy:
 * 1. Compare current file content with snapshot content
 * 2. Generate diff
 * 3. Classify type of correction
 * 4. Store in database
 */

import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ORCHESTRATOR_DEFAULTS } from '../config/defaults.js';
import type {
    Correction,
    CorrectionDetectionConfig,
    CorrectionDetectionResult,
    CorrectionType,
} from './learning.types.js';

/**
 * Detect corrections made to AI-generated code
 * 
 * @param config - Detection configuration
 * @returns Detection result with corrections
 */
export async function detectCorrections(
  config: CorrectionDetectionConfig,
): Promise<CorrectionDetectionResult> {
  const start = Date.now();
  const {
    projectRoot,
    snapshotId,
    generatedFiles,
    timeWindow = 60 * 60 * 1000, // 1 hour
  } = config;

  try {
    const corrections: Correction[] = [];

    for (const filePath of generatedFiles) {
      const fullPath = path.join(projectRoot, filePath);

      // Check if file exists
      let currentContent: string;
      try {
        currentContent = await fs.readFile(fullPath, 'utf-8');
      } catch {
        // File was deleted - skip
        continue;
      }

      // Get file stats to check modification time
      const stats = await fs.stat(fullPath);
      const modifiedAt = stats.mtimeMs;
      const now = Date.now();

      // Skip files that haven't been modified within time window
      if (now - modifiedAt > timeWindow) {
        continue;
      }

      // Get original content from git (using snapshot)
      const originalContent = await getOriginalContent(
        projectRoot,
        snapshotId,
        filePath,
      );

      if (!originalContent) {
        // Could not retrieve original content
        continue;
      }

      // Compare content
      if (currentContent === originalContent) {
        // No changes
        continue;
      }

      // Generate diff
      const diff = generateDiff(originalContent, currentContent);

      // Detect correction type
      const { correctionType, confidence } = detectCorrectionType(
        originalContent,
        currentContent,
        diff,
        filePath,
      );

      // Create correction record
      const correction: Correction = {
        id: generateCorrectionId(),
        snapshotId,
        task: '', // Will be filled from snapshot metadata
        mode: '', // Will be filled from snapshot metadata
        filePath,
        originalContent,
        correctedContent: currentContent,
        diff,
        correctionType,
        timestamp: Date.now(),
        projectRoot,
        language: detectLanguage(filePath),
        confidence,
      };

      corrections.push(correction);
    }

    return {
      success: true,
      corrections,
      duration: Date.now() - start,
    };

  } catch (error: unknown) {
    return {
      success: false,
      corrections: [],
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    };
  }
}

/**
 * Get original content from git snapshot
 */
async function getOriginalContent(
  projectRoot: string,
  snapshotId: string,
  filePath: string,
): Promise<string | undefined> {
  try {
    // Try to get content from git stash
    // This is a simplified version - real implementation would need
    // to handle different snapshot strategies
    const { spawn } = await import('node:child_process');
    
    return new Promise((resolve) => {
      const child = spawn(
        'git',
        ['show', `stash@{0}:${filePath}`],
        { cwd: projectRoot, shell: true },
      );

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (exitCode) => {
        if (exitCode === 0) {
          resolve(stdout);
        } else {
          resolve(undefined);
        }
      });

      child.on('error', () => {
        resolve(undefined);
      });
    });
  } catch {
    return undefined;
  }
}

/**
 * Generate human-readable diff
 */
function generateDiff(original: string, corrected: string): string {
  const originalLines = original.split('\n');
  const correctedLines = corrected.split('\n');
  
  let diff = '';
  const maxLines = Math.max(originalLines.length, correctedLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const originalLine = originalLines[i];
    const correctedLine = correctedLines[i];
    
    if (originalLine && !correctedLine) {
      diff += `- ${originalLine}\n`;
    } else if (!originalLine && correctedLine) {
      diff += `+ ${correctedLine}\n`;
    } else if (originalLine === correctedLine) {
      diff += `  ${originalLine}\n`;
    } else {
      diff += `- ${originalLine}\n`;
      diff += `+ ${correctedLine}\n`;
    }
  }
  
  return diff;
}

/**
 * Detect type of correction from diff
 */
function detectCorrectionType(
  original: string,
  corrected: string,
  diff: string,
  filePath: string,
): { correctionType: CorrectionType; confidence: number } {
  // Simple heuristic-based detection
  // Real implementation would use AST analysis

  const diffLower = diff.toLowerCase();

  // Import fixes
  if (diffLower.includes('import') || diffLower.includes('require')) {
    return { correctionType: 'import-fix', confidence: ORCHESTRATOR_DEFAULTS.LEARNING.CONFIDENCE_THRESHOLDS.IMPORT_FIX };
  }

  // Type fixes
  if (diffLower.includes(': ') && (
    diffLower.includes('string') ||
    diffLower.includes('number') ||
    diffLower.includes('boolean') ||
    diffLower.includes('any') ||
    diffLower.includes('unknown')
  )) {
    return { correctionType: 'type-fix', confidence: ORCHESTRATOR_DEFAULTS.LEARNING.CONFIDENCE_THRESHOLDS.TYPE_FIX };
  }

  // Syntax fixes (common patterns)
  if (
    diffLower.includes(';') ||
    diffLower.includes('{') ||
    diffLower.includes('}') ||
    diffLower.includes('(') ||
    diffLower.includes(')')
  ) {
    // Check if it's just punctuation changes
    const originalNoPunct = original.replace(/[;{}()]/g, '');
    const correctedNoPunct = corrected.replace(/[;{}()]/g, '');
    
    if (originalNoPunct === correctedNoPunct) {
      return { correctionType: 'syntax-fix', confidence: ORCHESTRATOR_DEFAULTS.LEARNING.CONFIDENCE_THRESHOLDS.SYNTAX_FIX };
    }
  }

  // Style fixes (indentation, spacing)
  const originalTrimmed = original.split('\n').map(l => l.trim()).join('\n');
  const correctedTrimmed = corrected.split('\n').map(l => l.trim()).join('\n');
  
  if (originalTrimmed === correctedTrimmed) {
    return { correctionType: 'style-fix', confidence: ORCHESTRATOR_DEFAULTS.LEARNING.CONFIDENCE_THRESHOLDS.STYLE_FIX };
  }

  // Security fixes (common patterns)
  if (
    diffLower.includes('sanitize') ||
    diffLower.includes('escape') ||
    diffLower.includes('validate') ||
    diffLower.includes('csrf') ||
    diffLower.includes('xss')
  ) {
    return { correctionType: 'security-fix', confidence: ORCHESTRATOR_DEFAULTS.LEARNING.CONFIDENCE_THRESHOLDS.SECURITY_FIX };
  }

  // Optimization (performance-related keywords)
  if (
    diffLower.includes('cache') ||
    diffLower.includes('memo') ||
    diffLower.includes('debounce') ||
    diffLower.includes('throttle')
  ) {
    return { correctionType: 'optimization', confidence: ORCHESTRATOR_DEFAULTS.LEARNING.CONFIDENCE_THRESHOLDS.PERFORMANCE_FIX };
  }

  // Refactor (major structural changes)
  const originalLines = original.split('\n').length;
  const correctedLines = corrected.split('\n').length;
  const lineDifference = Math.abs(originalLines - correctedLines);
  
  if (lineDifference > 10) {
    return { correctionType: 'refactor', confidence: ORCHESTRATOR_DEFAULTS.LEARNING.CONFIDENCE_THRESHOLDS.REFACTOR };
  }

  // Logic fix (default)
  return { correctionType: 'logic-fix', confidence: 0.5 };
}

/**
 * Detect programming language from file extension
 */
function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  
  const languageMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript-react',
    '.js': 'javascript',
    '.jsx': 'javascript-react',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.rs': 'rust',
    '.go': 'go',
    '.rb': 'ruby',
    '.php': 'php',
    '.cs': 'csharp',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
  };
  
  return languageMap[ext] || 'unknown';
}

/**
 * Generate unique correction ID
 */
function generateCorrectionId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString('hex');
  return `corr-${timestamp}-${random}`;
}
