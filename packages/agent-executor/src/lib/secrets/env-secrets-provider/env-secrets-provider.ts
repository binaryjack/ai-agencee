import { get, has } from './prototype/methods.js';

export interface IEnvSecretsProvider {
  new(): IEnvSecretsProvider;
  get(key: string): Promise<string | undefined>;
  has(key: string): Promise<boolean>;
}

export const EnvSecretsProvider = function(this: IEnvSecretsProvider) {
  // no state
} as unknown as IEnvSecretsProvider;

// Attach prototype methods after EnvSecretsProvider is defined (avoids circular-import race)
Object.assign((EnvSecretsProvider as Function).prototype, { get, has });
