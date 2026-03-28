/**
 * Prompt compression
 * 
 * Reduces token count while preserving semantic meaning.
 */

import type { PromptCompressionConfig } from './cost-optimization.types.js';

/**
 * Compress code by removing comments and excess whitespace
 */
export function compressCode(code: string): string {
  // Remove single-line comments
  code = code.replace(/\/\/.*$/gm, '');
  
  // Remove multi-line comments
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove excess whitespace (keep single spaces)
  code = code.replace(/\s+/g, ' ');
  
  // Trim each line
  code = code.split('\n').map(line => line.trim()).join('\n');
  
  // Remove empty lines
  code = code.replace(/\n\n+/g, '\n');
  
  return code.trim();
}

/**
 * Compress prompt text
 */
export function compressPrompt(prompt: string, config: PromptCompressionConfig = {}): {
  compressed: string;
  originalTokens: number;
  compressedTokens: number;
  ratio: number;
} {
  const {
    enabled = true,
    targetRatio = 0.7,
    strategies = {},
  } = config;
  
  if (!enabled) {
    const tokens = estimateTokens(prompt);
    return {
      compressed: prompt,
      originalTokens: tokens,
      compressedTokens: tokens,
      ratio: 1,
    };
  }
  
  const {
    removeComments = true,
    removeWhitespace = true,
    summarizeLongFiles = true,
  } = strategies;
  
  let compressed = prompt;
  
  // Remove code comments if enabled
  if (removeComments) {
    compressed = compressCode(compressed);
  }
  
  // Remove excess whitespace if enabled
  if (removeWhitespace) {
    compressed = compressed.replace(/\n\n\n+/g, '\n\n');  // Max 2 newlines
    compressed = compressed.replace(/ {2,}/g, ' ');  // Max 1 space
  }
  
  // Summarize long code blocks if enabled
  if (summarizeLongFiles) {
    compressed = summarizeLongCodeBlocks(compressed);
  }
  
  const originalTokens = estimateTokens(prompt);
  const compressedTokens = estimateTokens(compressed);
  
  return {
    compressed,
    originalTokens,
    compressedTokens,
    ratio: compressedTokens / originalTokens,
  };
}

/**
 * Summarize code blocks longer than 500 lines
 */
function summarizeLongCodeBlocks(text: string): string {
  const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
  
  return text.replace(codeBlockPattern, (match, lang, code) => {
    const lines = code.split('\n');
    
    if (lines.length <= 500) {
      return match;  // Keep as is
    }
    
    // Keep first 100 lines + last 100 lines
    const summary = [
      ...lines.slice(0, 100),
      '',
      `... [${lines.length - 200} lines omitted for brevity] ...`,
      '',
      ...lines.slice(-100),
    ].join('\n');
    
    return '```' + (lang || '') + '\n' + summary + '\n```';
  });
}

/**
 * Estimate token count (simple heuristic: 4 chars per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
