export interface PlanOptions {
  project?: string;
  startFrom?: string;
  agentsDir?: string;
  verbose?: boolean;
  skipApproval?: boolean;
  /** Force a specific LLM provider: anthropic | openai | vscode */
  provider?: string;
  /** Path to a custom model-router.json config file */
  modelRouterConfig?: string;
}
