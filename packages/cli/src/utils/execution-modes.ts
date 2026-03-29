/**
 * Execution Mode Presets — Phase 1.6
 * 
 * Provides predefined execution modes that combine multiple CLI options
 * into opinionated presets for common scenarios.
 * 
 * Philosophy: "Smart defaults that adapt to context"
 */

/**
 * Execution modes
 */
export enum ExecutionMode {
  /** Quick execution: minimal output, skip optional checks, fast */
  QUICK = 'quick',
  
  /** Standard balanced mode (default) */
  STANDARD = 'standard',
  
  /** Thorough execution: full validation, detailed output, all checks */
  THOROUGH = 'thorough',
  
  /** CI/CD mode: non-interactive, JSON output, fail-fast */
  CI = 'ci',
  
  /** Development mode: interactive, verbose, dashboard enabled */
  DEV = 'dev',
}

/**
 * Mode configuration
 */
export interface ModeConfig {
  mode: ExecutionMode;
  verbose: boolean;
  json: boolean;
  dashboard: boolean;
  interactive: boolean;
  dryRun: boolean;
  yes: boolean; // Skip confirmations
}

/**
 * Mode preset definitions
 */
const MODE_PRESETS: Record<ExecutionMode, Partial<ModeConfig>> = {
  [ExecutionMode.QUICK]: {
    verbose: false,
    json: false,
    dashboard: false,
    interactive: false,
    dryRun: false,
    yes: true, // Skip confirmations for speed
  },
  [ExecutionMode.STANDARD]: {
    verbose: true,
    json: false,
    dashboard: false,
    interactive: false,
    dryRun: false,
    yes: false,
  },
  [ExecutionMode.THOROUGH]: {
    verbose: true,
    json: false,
    dashboard: true,
    interactive: true,
    dryRun: false,
    yes: false,
  },
  [ExecutionMode.CI]: {
    verbose: false,
    json: true,
    dashboard: false,
    interactive: false,
    dryRun: false,
    yes: true, // No user prompts in CI
  },
  [ExecutionMode.DEV]: {
    verbose: true,
    json: false,
    dashboard: true,
    interactive: true,
    dryRun: false,
    yes: false,
  },
};

/**
 * Get mode configuration from mode name
 */
export function getModeConfig(mode?: string): Partial<ModeConfig> {
  if (!mode) {
    return MODE_PRESETS[ExecutionMode.STANDARD];
  }

  const normalizedMode = mode.toLowerCase() as ExecutionMode;
  
  if (!Object.values(ExecutionMode).includes(normalizedMode)) {
    console.warn(`\n⚠️  Unknown mode: "${mode}". Using standard mode.`);
    console.warn(`   Available modes: ${Object.values(ExecutionMode).join(', ')}\n`);
    return MODE_PRESETS[ExecutionMode.STANDARD];
  }

  return MODE_PRESETS[normalizedMode];
}

/**
 * Apply mode configuration to command options
 * 
 * Mode presets can be overridden by explicit flags.
 * For example: --mode=ci --verbose will use CI mode but with verbose output.
 */
export function applyModeConfig<T extends Record<string, any>>(
  options: T,
  modeConfig: Partial<ModeConfig>
): T {
  // Apply mode defaults only for options that are undefined
  for (const [key, value] of Object.entries(modeConfig)) {
    if (key === 'mode') continue; // Skip the mode field itself
    if (options[key] === undefined) {
      (options as any)[key] = value;
    }
  }

  return options;
}

/**
 * Get mode description for help text
 */
export function getModeDescription(mode: ExecutionMode): string {
  const descriptions: Record<ExecutionMode, string> = {
    [ExecutionMode.QUICK]: 'Quick: minimal output, skip confirmations, fast execution',
    [ExecutionMode.STANDARD]: 'Standard: balanced mode with reasonable defaults (default)',
    [ExecutionMode.THOROUGH]: 'Thorough: full validation, dashboard, interactive prompts',
    [ExecutionMode.CI]: 'CI: non-interactive, JSON output, optimized for automation',
    [ExecutionMode.DEV]: 'Dev: verbose output, dashboard, interactive prompts',
  };

  return descriptions[mode];
}

/**
 * Print mode configuration summary
 */
export function printModeConfig(config: Partial<ModeConfig>): void {
  const mode = config.mode || ExecutionMode.STANDARD;
  console.log(`\n📋 Execution Mode: ${mode.toUpperCase()}`);
  console.log('─'.repeat(50));
  console.log(`  Verbose       : ${config.verbose ? '✓' : '✗'}`);
  console.log(`  Dashboard     : ${config.dashboard ? '✓' : '✗'}`);
  console.log(`  Interactive   : ${config.interactive ? '✓' : '✗'}`);
  console.log(`  JSON output   : ${config.json ? '✓' : '✗'}`);
  console.log(`  Skip confirms : ${config.yes ? '✓' : '✗'}`);
  console.log('');
}

/**
 * Detect CI environment and auto-enable CI mode
 */
export function detectCIEnvironment(): boolean {
  const ciEnvVars = [
    'CI',
    'CONTINUOUS_INTEGRATION',
    'GITHUB_ACTIONS',
    'GITLAB_CI',
    'CIRCLECI',
    'TRAVIS',
    'JENKINS_URL',
    'TEAMCITY_VERSION',
    'BUILDKITE',
  ];

  return ciEnvVars.some(envVar => process.env[envVar] === 'true' || process.env[envVar] !== undefined);
}

/**
 * Get auto-detected mode based on environment
 */
export function getAutoMode(): ExecutionMode {
  if (detectCIEnvironment()) {
    return ExecutionMode.CI;
  }

  // Check if running in an interactive terminal
  if (!process.stdout.isTTY) {
    return ExecutionMode.CI; // Non-TTY likely means automation
  }

  return ExecutionMode.STANDARD;
}

/**
 * Resolve mode with auto-detection fallback
 */
export function resolveMode(requestedMode?: string): ExecutionMode {
  if (requestedMode) {
    const normalizedMode = requestedMode.toLowerCase() as ExecutionMode;
    if (Object.values(ExecutionMode).includes(normalizedMode)) {
      return normalizedMode;
    }
  }

  return getAutoMode();
}
