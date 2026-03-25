/**
 * Configuration loader for Codernic indexer
 * Searches for .codernicrc.json, .codernicrc.yml, or codernicrc in package.json
 */

import { cosmiconfig } from 'cosmiconfig';

export type CodernicConfig = {
  indexer?: {
    languages?: string[];
    respectGitignore?: boolean;
    forceIncludePatterns?: string[];
    excludePatterns?: string[];
    includePatterns?: string[];
  };
};

const DEFAULT_CONFIG: CodernicConfig = {
  indexer: {
    languages: ['typescript', 'javascript'],
    respectGitignore: true,
    forceIncludePatterns: [],
    excludePatterns: ['node_modules', 'dist', 'build', '.git', 'coverage'],
    includePatterns: []
  }
};

/**
 * Load indexer configuration from project root
 * Searches for .codernicrc.json, .codernicrc.yml, or codernicrc in package.json
 * 
 * @param projectRoot - Absolute path to project root directory
 * @returns Merged configuration with defaults
 */
export async function loadIndexerConfig(projectRoot: string): Promise<CodernicConfig> {
  const explorer = cosmiconfig('codernic', {
    searchPlaces: [
      '.codernicrc.json',
      '.codernicrc.yml',
      '.codernicrc.yaml',
      'package.json'
    ],
    stopDir: projectRoot
  });

  try {
    const result = await explorer.search(projectRoot);
    
    if (!result || !result.config) {
      return DEFAULT_CONFIG;
    }

    // Merge found config with defaults (user config takes precedence)
    return {
      indexer: {
        ...DEFAULT_CONFIG.indexer,
        ...result.config.indexer
      }
    };
  } catch (error) {
    // If config file has syntax errors, log and return defaults
    console.warn(`Failed to load .codernicrc config: ${(error as Error).message}`);
    return DEFAULT_CONFIG;
  }
}

/**
 * Get indexer options from config with CLI overrides
 * CLI flags have highest priority, then config file, then defaults
 * 
 * @param projectRoot - Absolute path to project root
 * @param cliOptions - Options from CLI flags (highest priority)
 * @returns Final merged options
 */
export async function getIndexerOptions(
  projectRoot: string,
  cliOptions: Partial<{
    languages: string[];
    respectGitignore: boolean;
    forceIncludePatterns: string[];
    excludePatterns: string[];
    includePatterns: string[];
  }> = {}
) {
  const fileConfig = await loadIndexerConfig(projectRoot);
  
  // CLI > File Config > Defaults
  return {
    languages: cliOptions.languages ?? fileConfig.indexer?.languages ?? DEFAULT_CONFIG.indexer!.languages!,
    respectGitignore: cliOptions.respectGitignore ?? fileConfig.indexer?.respectGitignore ?? DEFAULT_CONFIG.indexer!.respectGitignore!,
    forceIncludePatterns: cliOptions.forceIncludePatterns ?? fileConfig.indexer?.forceIncludePatterns ?? DEFAULT_CONFIG.indexer!.forceIncludePatterns!,
    excludePatterns: cliOptions.excludePatterns ?? fileConfig.indexer?.excludePatterns ?? DEFAULT_CONFIG.indexer!.excludePatterns!,
    includePatterns: cliOptions.includePatterns ?? fileConfig.indexer?.includePatterns ?? DEFAULT_CONFIG.indexer!.includePatterns!
  };
}
