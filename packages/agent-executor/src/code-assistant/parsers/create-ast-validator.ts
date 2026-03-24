/**
 * Factory for creating AST validator instances
 */

import { AstValidator, type AstValidatorInstance } from './ast-validator'

export function createAstValidator(): AstValidatorInstance {
  return new (AstValidator as any)();
}
