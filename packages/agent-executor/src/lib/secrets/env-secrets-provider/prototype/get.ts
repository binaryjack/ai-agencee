import type { IEnvSecretsProvider } from '../env-secrets-provider.js';

export async function get(this: IEnvSecretsProvider, key: string): Promise<string | undefined> {
  return process.env[key];
}
