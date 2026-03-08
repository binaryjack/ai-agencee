import { execute } from './prototype/index.js';
import type { IJsonFieldHandler } from './json-field-handler.types.js';

export const JsonFieldHandler = function(this: IJsonFieldHandler) {
  // no-op constructor
} as unknown as IJsonFieldHandler;

Object.assign(JsonFieldHandler.prototype, {
  type: 'json-field' as const,
  execute,
});
