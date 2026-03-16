import type { IByokSecretsProvider } from '../byok-secrets-provider.types.js'

export async function has(this: IByokSecretsProvider, key: string): Promise<boolean> {
  return this._secrets.has(key);
}
