import type { IDagBuilder } from '../dag-builder.js';

export function dagToJSON(this: IDagBuilder, indent = 2): string {
  return JSON.stringify(this.build(), null, indent);
}
