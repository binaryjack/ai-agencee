/**
 * Centralized path constants for CLI package
 * Eliminates hardcoded paths scattered across commands
 * 
 * Phase 1.1: Foundation - Constants Module
 */

import { join, resolve } from 'path'

/**
 * Get the CLI package root directory
 * Works in both development (src/) and production (dist/) contexts
 */
function getPackageRoot(): string {
  // In production: packages/cli/dist/src/constants/paths.js
  // In development: packages/cli/src/constants/paths.ts
  // We need to get to packages/cli/
  
  const distPath = resolve(__dirname, '../../../');  // From dist/src/constants/
  const srcPath = resolve(__dirname, '../../');      // From src/constants/
  
  // Check if we're in dist or src
  if (__dirname.includes('/dist/')) {
    return distPath;
  }
  return srcPath;
}

const PACKAGE_ROOT = getPackageRoot();

/**
 * Template and resource directories
 */
export const PATHS = {
  // Package structure
  PACKAGE_ROOT,
  
  // Template directories
  TEMPLATES_ROOT: join(PACKAGE_ROOT, 'templates'),
  TEMPLATES_DEMOS: join(PACKAGE_ROOT, 'templates', 'demos'),
  TEMPLATES_USE_CASES: join(PACKAGE_ROOT, 'templates', 'use-cases'),
  TEMPLATES_AGENTS: join(PACKAGE_ROOT, 'templates', 'agents'),
  
  // Prompt templates
  PROMPTS_DIR: join(PACKAGE_ROOT, 'prompts'),
  
  // Project structure (relative paths in user projects)
  PROJECT_AGENTS_DIR: 'agents',
  PROJECT_CACHE_DIR: '.agents',
  PROJECT_CONFIG_DIR: '.agencee',
  
  // Configuration files
  ENV_FILE: '.env',
  GITIGNORE_FILE: '.gitignore',
  AGENCEE_CONFIG: '.agencee.json',
  
  // Generated files
  DAG_FILE: 'dag.json',
  MODEL_ROUTER_FILE: 'model-router.json',
} as const;

export type PathKey = keyof typeof PATHS;

/**
 * Get a path by key with optional path segments appended
 * 
 * @example
 * getPath('TEMPLATES_DEMOS', 'security-scan', 'dag.json')
 * // Returns: /path/to/packages/cli/templates/demos/security-scan/dag.json
 */
export function getPath(key: PathKey, ...segments: string[]): string {
  return join(PATHS[key], ...segments);
}

/**
 * Check if a path key represents a template directory
 */
export function isTemplateDir(key: PathKey): boolean {
  return key.startsWith('TEMPLATES_');
}

/**
 * Check if a path key represents a project file/directory
 */
export function isProjectPath(key: PathKey): boolean {
  return key.startsWith('PROJECT_');
}
