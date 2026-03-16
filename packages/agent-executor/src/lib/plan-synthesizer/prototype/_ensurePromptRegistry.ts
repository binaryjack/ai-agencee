import type { IPromptRegistry } from '../../prompt-registry/index.js';
import { PromptRegistry } from '../../prompt-registry/index.js';
import type { IPlanSynthesizer } from '../plan-synthesizer.js';

export async function _ensurePromptRegistry(this: IPlanSynthesizer): Promise<IPromptRegistry> {
  if (!this._promptRegistry) {
    this._promptRegistry = new PromptRegistry(this._promptsDir);
    await this._promptRegistry.loadAll();
  }
  return this._promptRegistry;
}
