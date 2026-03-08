export interface BenchmarkEntry {
  provider: string;
  model: string;
  suite: string;
  promptLabel: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  tokensPerSec: number;
  costUSD: number;
  success: boolean;
  error?: string;
}
