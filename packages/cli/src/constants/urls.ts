/**
 * External URLs and endpoints
 * Centralizes all external resources referenced in the CLI
 * 
 * Phase 1.1: Foundation - Constants Module
 */

/**
 * Documentation and support URLs
 */
export const URLS = {
  // Project documentation
  GITHUB_REPO: 'https://github.com/binaryjack/ai-agencee',
  DOCUMENTATION: 'https://github.com/binaryjack/ai-agencee/tree/main/docs',
  DISCUSSIONS: 'https://github.com/binaryjack/ai-agencee/discussions',
  ISSUES: 'https://github.com/binaryjack/ai-agencee/issues',
  
  // Provider signup (also in providers.ts for type safety)
  ANTHROPIC_SIGNUP: 'https://console.anthropic.com',
  OPENAI_SIGNUP: 'https://platform.openai.com',
  GOOGLE_AI_SIGNUP: 'https://makersuite.google.com',
  
  // Agent registry (future)
  AGENT_REGISTRY: 'https://registry.ai-agencee.dev',
  
  // Templates (future)
  TEMPLATE_REGISTRY: 'https://templates.ai-agencee.dev',
} as const;

export type UrlKey = keyof typeof URLS;

/**
 * Get URL by key
 */
export function getUrl(key: UrlKey): string {
  return URLS[key];
}
