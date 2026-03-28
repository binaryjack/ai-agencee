/**
 * Factory for KotlinParser
 */

import { KotlinParser } from './kotlin-parser'
import type { KotlinParserInstance } from './kotlin-parser.types'

export const createKotlinParser = function(): KotlinParserInstance {
  return new (KotlinParser as any)()
}
