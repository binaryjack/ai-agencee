/**
 * @file detect-framework.ts
 * @description Detect test framework from project structure and configuration
 * 
 * Supports: Jest, Vitest, Pytest, Go test, RSpec, Mocha
 * Detection strategy: Check package.json scripts, config files, directory structure
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { FrameworkDetection, TestFramework } from './test-runner.types.js';

/**
 * Detect test framework in a project
 */
export async function detectFramework(projectRoot: string): Promise<FrameworkDetection> {
  // Try detection strategies in order of reliability
  const detection = 
    await detectFromPackageJson(projectRoot) ??
    await detectFromConfigFiles(projectRoot) ??
    await detectFromLanguage(projectRoot);

  return detection;
}

/**
 * Detect framework from package.json scripts and dependencies
 */
async function detectFromPackageJson(projectRoot: string): Promise<FrameworkDetection | null> {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  try {
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);

    // Check test script first (most reliable)
    const testScript = pkg.scripts?.test;
    if (testScript) {
      if (testScript.includes('vitest')) {
        return {
          framework: 'vitest',
          confidence: 0.95,
          command: 'npm',
          args: ['run', 'test'],
          configFile: await findConfigFile(projectRoot, ['vitest.config.ts', 'vitest.config.js']),
        };
      }
      if (testScript.includes('jest')) {
        return {
          framework: 'jest',
          confidence: 0.95,
          command: 'npm',
          args: ['run', 'test'],
          configFile: await findConfigFile(projectRoot, ['jest.config.js', 'jest.config.ts']),
        };
      }
      if (testScript.includes('mocha')) {
        return {
          framework: 'mocha',
          confidence: 0.95,
          command: 'npm',
          args: ['run', 'test'],
        };
      }
    }

    // Check dependencies as fallback
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    if (allDeps.vitest) {
      return {
        framework: 'vitest',
        confidence: 0.8,
        command: 'npx',
        args: ['vitest', 'run'],
        configFile: await findConfigFile(projectRoot, ['vitest.config.ts', 'vitest.config.js']),
      };
    }

    if (allDeps.jest) {
      return {
        framework: 'jest',
        confidence: 0.8,
        command: 'npx',
        args: ['jest'],
        configFile: await findConfigFile(projectRoot, ['jest.config.js', 'jest.config.ts']),
      };
    }

    if (allDeps.mocha) {
      return {
        framework: 'mocha',
        confidence: 0.8,
        command: 'npx',
        args: ['mocha'],
      };
    }

  } catch {
    // package.json not found or invalid, continue to next strategy
  }

  return null;
}

/**
 * Detect framework from configuration files
 */
async function detectFromConfigFiles(projectRoot: string): Promise<FrameworkDetection | null> {
  const configChecks: Array<{
    files: string[];
    framework: TestFramework;
    command: string;
    args: string[];
  }> = [
    {
      files: ['vitest.config.ts', 'vitest.config.js', 'vite.config.ts'],
      framework: 'vitest',
      command: 'npx',
      args: ['vitest', 'run'],
    },
    {
      files: ['jest.config.js', 'jest.config.ts', 'jest.config.json'],
      framework: 'jest',
      command: 'npx',
      args: ['jest'],
    },
    {
      files: ['pytest.ini', 'pyproject.toml', 'setup.cfg'],
      framework: 'pytest',
      command: 'pytest',
      args: [],
    },
    {
      files: ['.rspec', 'spec/spec_helper.rb'],
      framework: 'rspec',
      command: 'rspec',
      args: [],
    },
  ];

  for (const check of configChecks) {
    const configFile = await findConfigFile(projectRoot, check.files);
    if (configFile) {
      return {
        framework: check.framework,
        confidence: 0.7,
        command: check.command,
        args: check.args,
        configFile,
      };
    }
  }

  return null;
}

/**
 * Detect framework from language/project structure
 */
async function detectFromLanguage(projectRoot: string): Promise<FrameworkDetection> {
  // Check for Go project
  if (await fileExists(path.join(projectRoot, 'go.mod'))) {
    return {
      framework: 'go-test',
      confidence: 0.9,
      command: 'go',
      args: ['test', './...'],
    };
  }

  // Check for Python project
  const hasPythonFiles = await hasFilesWithExtension(projectRoot, '.py');
  if (hasPythonFiles) {
    return {
      framework: 'pytest',
      confidence: 0.5,
      command: 'pytest',
      args: [],
    };
  }

  // Check for Ruby project
  if (await fileExists(path.join(projectRoot, 'Gemfile'))) {
    return {
      framework: 'rspec',
      confidence: 0.5,
      command: 'rspec',
      args: [],
    };
  }

  // Default to unknown
  return {
    framework: 'unknown',
    confidence: 0,
    command: 'echo',
    args: ['No test framework detected'],
  };
}

/**
 * Find first existing config file from list of candidates
 */
async function findConfigFile(projectRoot: string, candidates: string[]): Promise<string | undefined> {
  for (const candidate of candidates) {
    const fullPath = path.join(projectRoot, candidate);
    if (await fileExists(fullPath)) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if directory has files with given extension
 */
async function hasFilesWithExtension(dir: string, ext: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(ext)) {
        return true;
      }
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const fullPath = path.join(dir, entry.name);
        if (await hasFilesWithExtension(fullPath, ext)) {
          return true;
        }
      }
    }
  } catch {
    // Directory not accessible
  }
  return false;
}
