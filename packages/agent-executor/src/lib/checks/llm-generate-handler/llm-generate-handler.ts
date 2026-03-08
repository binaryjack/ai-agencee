import { execute } from './prototype/index.js';
import type { ILlmGenerateHandler } from './llm-generate-handler.types.js';

export const LlmGenerateHandler = function(this: ILlmGenerateHandler) {
  // no-op constructor
} as unknown as ILlmGenerateHandler;

Object.assign(LlmGenerateHandler.prototype, {
  type: 'llm-generate' as const,
  execute,
});
