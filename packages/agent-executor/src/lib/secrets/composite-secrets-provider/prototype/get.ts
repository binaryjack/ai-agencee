import type { ICompositeSecretsProvider } from '../composite-secrets-provider.js';

export async function get(
  this: ICompositeSecretsProvider,
  key:  string,
): Promise<string | undefined> {
  for (const provider of this._providers) {
    const value = await provider.get(key);
    if (value !== undefined) return value;
  }
  return undefined;
}
