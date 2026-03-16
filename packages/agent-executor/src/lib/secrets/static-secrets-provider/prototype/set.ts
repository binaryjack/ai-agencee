import type { IStaticSecretsProvider } from '../static-secrets-provider.js'

export function set(
  this:  IStaticSecretsProvider,
  key:   string,
  value: string,
): IStaticSecretsProvider {
  this._secrets.set(key, value);
  return this;
}
