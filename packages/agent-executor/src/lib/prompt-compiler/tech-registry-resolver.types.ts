export interface TechPack {
  name: string
  version: string
  description: string
  frameworks?: string[]
  rules: string
}

export interface ITechRegistryResolver {
  resolve(name: string, projectRoot: string): Promise<TechPack>
  catalog(projectRoot: string): Promise<CatalogEntry[]>
}

export interface CatalogEntry {
  name:        string
  version:     string
  description: string
  source:      'local' | 'package'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class PackNotFoundError extends Error {
  constructor(public readonly packName: string, projectRoot: string) {
    super(`Tech pack '${packName}' not found locally (.agencee/config/technologies/${packName}.pack.md) or in @ai-agencee/tech-registry`)
    this.name = 'PackNotFoundError'
    // @ts-expect-error assigned after super to avoid useDefineForClassFields shadowing
    this.projectRoot = projectRoot
  }
}

// Augment type so callers can read projectRoot
export interface PackNotFoundError {
  readonly projectRoot: string
}

