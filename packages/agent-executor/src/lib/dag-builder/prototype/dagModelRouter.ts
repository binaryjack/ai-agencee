import type { IDagBuilder } from '../dag-builder.js';

export function dagModelRouter(this: IDagBuilder, filePath: string): IDagBuilder {
  this._modelRouterFile = filePath;
  return this;
}
