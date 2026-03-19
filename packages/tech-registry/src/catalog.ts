import * as fs from 'fs'
import * as path from 'path'
import type { TechPackCatalog } from './pack.types'

const CATALOG_PATH = path.join(__dirname, '..', 'index.json')

export const catalog = (): TechPackCatalog => {
  const raw = fs.readFileSync(CATALOG_PATH, 'utf-8')
  return JSON.parse(raw) as TechPackCatalog
}
