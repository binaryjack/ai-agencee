export interface TechPack {
  name:        string
  version:     string
  description: string
  frameworks?: string[]
  rules:       string
}

export interface PackCatalogEntry {
  name:        string
  version:     string
  description: string
}

export interface TechPackCatalog {
  version: string
  packs:   PackCatalogEntry[]
}

export class PackNotFoundError extends Error {
  constructor(public readonly packName: string) {
    super(`Tech pack not found: ${packName}`)
    this.name = 'PackNotFoundError'
  }
}
