import type { IDagBuilder } from '../dag-builder.js';

export function dagDescription(this: IDagBuilder, text: string): IDagBuilder {
  this._description = text;
  return this;
}
