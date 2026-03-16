import type { ICompositeSecretsProvider } from '../composite-secrets-provider.js';

export async function has(this: ICompositeSecretsProvider, key: string): Promise<boolean> {
  for (const provider of this._providers) {
    if (await provider.has(key)) return true;
  }
  return false;
}
