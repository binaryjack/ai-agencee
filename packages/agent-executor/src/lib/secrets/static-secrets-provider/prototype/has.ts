import type { IStaticSecretsProvider } from '../static-secrets-provider.js';

export async function has(this: IStaticSecretsProvider, key: string): Promise<boolean> {
  return this._secrets.has(key);
}
