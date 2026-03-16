import type { IDotenvSecretsProvider } from '../dotenv-secrets-provider.js'

export async function get(
  this: IDotenvSecretsProvider,
  key:  string,
): Promise<string | undefined> {
  return (await this._load()).get(key);
}
