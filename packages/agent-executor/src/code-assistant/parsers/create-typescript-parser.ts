/**
 * Factory for TypeScriptParser
 */

import type { ParserOptions } from './parser-protocol.types';
import type { TypeScriptParserInstance } from './typescript-parser';
import { TypeScriptParser } from './typescript-parser';

export const createTypeScriptParser = function(options: ParserOptions = {}): TypeScriptParserInstance {
  return new (TypeScriptParser as any)(options);
};
