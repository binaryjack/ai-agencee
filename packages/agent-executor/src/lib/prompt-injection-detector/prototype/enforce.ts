import type { LLMPrompt } from '../../llm-provider.js';
import {
    InjectionDetectionMode,
    InjectionScanResult,
    IPromptInjectionDetector,
    PromptInjectionError,
} from '../prompt-injection-detector.js';

export function enforce(
  this: IPromptInjectionDetector,
  prompt: LLMPrompt,
  mode: InjectionDetectionMode = 'warn',
): InjectionScanResult {
  const result = this.scan(prompt);
  if (!result.detected) return result;

  const warning = {
    level:           'SECURITY_WARNING',
    event:           'PROMPT_INJECTION_DETECTED',
    confidence:      result.confidence,
    familiesMatched: result.familiesMatched,
    matchCount:      result.matches.length,
  };
  process.stderr.write(`[ai-kit] ${JSON.stringify(warning)}\n`);

  if (mode === 'block') {
    throw new PromptInjectionError(result);
  }

  return result;
}
