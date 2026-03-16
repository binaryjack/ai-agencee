import type { BuiltDagDefinition, IDagBuilder } from '../dag-builder.js';

export function dagBuild(this: IDagBuilder): BuiltDagDefinition {
  if (this._currentLane) {
    this._lanes.push(this._currentLane);
    this._currentLane = undefined;
  }

  const capabilityRegistry: Record<string, string[]> = {};
  for (const lb of this._lanes) {
    const l = lb._build();
    for (const cap of l.capabilities) {
      (capabilityRegistry[cap] ??= []).push(l.id);
    }
  }

  return {
    name:            this._name,
    description:     this._description,
    budgetUSD:       this._budgetUSD,
    modelRouterFile: this._modelRouterFile ?? 'model-router.json',
    lanes:           this._lanes.map((lb) => lb._build()),
    globalBarriers:  [...this._barriers],
    capabilityRegistry,
  };
}
