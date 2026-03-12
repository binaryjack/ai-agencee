/**
 * Factory for ParserRegistry
 */

import type { ParserRegistryOptions } from './parser-protocol.types';
import type { ParserRegistryInstance } from './parser-registry';
import { ParserRegistry } from './parser-registry';

export const createParserRegistry = function(options: ParserRegistryOptions = {}): ParserRegistryInstance {
  return new (ParserRegistry as any)(options);
};
