import { _load, get, has, invalidate } from './prototype/methods.js';

export interface IDotenvSecretsProvider {
  new(projectRoot: string, fileNames?: string[]): IDotenvSecretsProvider;
  _projectRoot: string;
  _fileNames:   string[];
  _cache:       Map<string, string> | null;
  _load(): Promise<Map<string, string>>;
  invalidate(): void;
  get(key: string): Promise<string | undefined>;
  has(key: string): Promise<boolean>;
}

export const DotenvSecretsProvider = function(
  this:        IDotenvSecretsProvider,
  projectRoot: string,
  fileNames:   string[] = ['.env', '.env.local'],
) {
  this._projectRoot = projectRoot;
  this._fileNames   = fileNames;
  this._cache       = null;
} as unknown as IDotenvSecretsProvider;

// Attach prototype methods after DotenvSecretsProvider is defined (avoids circular-import race)
Object.assign((DotenvSecretsProvider as unknown as { prototype: object }).prototype, { get, has, invalidate, _load });
