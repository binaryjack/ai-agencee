import type { IStaticSecretsProvider } from '../static-secrets-provider.js';

export async function get(
  this: IStaticSecretsProvider,
  key:  string,
): Promise<string | undefined> {
  return this._secrets.get(key);
}
