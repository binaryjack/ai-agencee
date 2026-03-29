/**
 * LLM Provider Configuration
 * Centralizes provider-specific settings (API keys, URLs, models)
 * 
 * Phase 1.1: Foundation - Constants Module
 */

/**
 * Provider configuration structure
 */
export interface ProviderConfig {
  /** Display name */
  name: string;
  
  /** Environment variable name for API key */
  envVar: string | null;
  
  /** Signup/console URL */
  signupUrl: string | null;
  
  /** Available models */
  models: {
    [key: string]: string;
  };
  
  /** Default model */
  defaultModel?: string;
}

/**
 * Supported LLM providers
 */
export const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    envVar: 'ANTHROPIC_API_KEY',
    signupUrl: 'https://console.anthropic.com',
    models: {
      haiku: 'claude-3-haiku-20240307',
      sonnet: 'claude-3-sonnet-20240229',
      opus: 'claude-3-opus-20240229',
      'sonnet-3.5': 'claude-3-5-sonnet-20240620',
    },
    defaultModel: 'claude-3-haiku-20240307',
  },
  
  openai: {
    name: 'OpenAI',
    envVar: 'OPENAI_API_KEY',
    signupUrl: 'https://platform.openai.com',
    models: {
      'gpt-4-turbo': 'gpt-4-turbo-preview',
      'gpt-4': 'gpt-4',
      'gpt-3.5-turbo': 'gpt-3.5-turbo',
    },
    defaultModel: 'gpt-4-turbo-preview',
  },
  
  google: {
    name: 'Google AI',
    envVar: 'GOOGLE_API_KEY',
    signupUrl: 'https://makersuite.google.com',
    models: {
      'gemini-pro': 'gemini-pro',
      'gemini-pro-vision': 'gemini-pro-vision',
    },
    defaultModel: 'gemini-pro',
  },
  
  mock: {
    name: 'Mock Provider',
    envVar: null,
    signupUrl: null,
    models: {
      deterministic: 'mock-deterministic',
    },
    defaultModel: 'mock-deterministic',
  },
} as const satisfies Record<string, ProviderConfig>;

export type ProviderName = keyof typeof PROVIDERS;

/**
 * Get provider configuration by name
 * 
 * @throws Error if provider not found
 */
export function getProviderConfig(name: string): ProviderConfig {
  if (!(name in PROVIDERS)) {
    throw new Error(`Unknown provider: ${name}. Available: ${Object.keys(PROVIDERS).join(', ')}`);
  }
  
  return PROVIDERS[name as ProviderName];
}

/**
 * Get environment variable name for a provider
 * 
 * @returns Environment variable name, or null if provider doesn't use one (e.g., mock)
 */
export function getProviderEnvVar(name: ProviderName): string | null {
  return PROVIDERS[name].envVar;
}

/**
 * Get signup URL for a provider
 * 
 * @returns Signup URL, or null if not applicable (e.g., mock)
 */
export function getProviderSignupUrl(name: ProviderName): string | null {
  return PROVIDERS[name].signupUrl;
}

/**
 * Check if a provider requires an API key
 */
export function requiresApiKey(name: ProviderName): boolean {
  return PROVIDERS[name].envVar !== null;
}

/**
 * Get all provider names
 */
export function getProviderNames(): ProviderName[] {
  return Object.keys(PROVIDERS) as ProviderName[];
}

/**
 * Get all providers that require API keys
 */
export function getProvidersWithApiKeys(): ProviderName[] {
  return getProviderNames().filter(requiresApiKey);
}
