import type { SamplingCallback } from '../llm-provider.js'
import type { InjectionDetectionMode, InjectionSignature } from '../prompt-injection-detector/index.js'
import type { IRbacPolicy } from '../rbac/index.js'
import type { SecretsProvider } from '../secrets/index.js'

export interface DagRunOptions {
  verbose?: boolean;
  resultsDir?: string;
  /** USD spend cap for the entire run. Lanes stop when the cap is exceeded. */
  budgetCapUSD?: number;
  /** Pause at needs-human-review checkpoints and prompt the operator for a decision. */
  interactive?: boolean;
  /**
   * Path to a model-router.json file (relative to projectRoot).
   * Overrides dag.json's modelRouterFile field when provided.
   */
  modelRouterFile?: string;
  /**
   * Override the directory that contains agent/supervisor JSON files.
   * When not set, defaults to the directory of the dag.json file itself.
   */
  agentsBaseDir?: string;
  /**
   * Inject a VS Code sampling callback (MCP server context).
   * When provided a VSCodeSamplingProvider is registered as 'vscode' and set
   * as the default provider, bypassing the need for API keys.
   */
  samplingCallback?: SamplingCallback;
  /**
   * Force all lanes to use a specific provider regardless of model-router.json.
   * Use 'mock' to run without API keys (e.g. pnpm demo, CI dry-runs).
   * Valid values: 'anthropic' | 'openai' | 'vscode' | 'mock'
   */
  forceProvider?: string;
  /**
   * Override the resolved principal for RBAC checks.
   * Defaults to `RbacPolicy.resolvePrincipal()` (env var ? git author ? username).
   */
  principal?: string;
  /**
   * E8 — Prompt injection detection.
   */
  injectionDetection?: {
    enabled?: boolean;
    mode?: InjectionDetectionMode;
    skipRoles?: Array<'system' | 'user' | 'assistant'>;
    customSignatures?: InjectionSignature[];
  };
  /**
   * Pre-loaded RBAC policy.  When not provided the policy is loaded from
   * the RBAC policy file; permissive if the file is absent.
   */
  rbacPolicy?: IRbacPolicy;
  /**
   * Secrets provider used to inject API keys and credentials.
   * Defaults to a composite of `process.env` + `.env` / `.env.local` files.
   */
  secrets?: SecretsProvider;
  /**
   * Additional secret key names to inject into `process.env` beyond the built-in list.
   */
  extraSecretKeys?: string[];
  /**
   * Scripted mock responses for use with `forceProvider: 'mock'`.
   */
  mockResponses?: Record<string, string>;
}
