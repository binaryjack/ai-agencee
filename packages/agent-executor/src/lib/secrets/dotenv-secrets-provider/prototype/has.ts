import type { IDotenvSecretsProvider } from '../dotenv-secrets-provider.js';

export async function has(this: IDotenvSecretsProvider, key: string): Promise<boolean> {
  return (await this._load()).has(key);
}
