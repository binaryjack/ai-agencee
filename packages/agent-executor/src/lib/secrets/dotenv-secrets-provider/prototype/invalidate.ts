import type { IDotenvSecretsProvider } from '../dotenv-secrets-provider.js';

export function invalidate(this: IDotenvSecretsProvider): void {
  this._cache = null;
}
