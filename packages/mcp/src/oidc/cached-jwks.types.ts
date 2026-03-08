import type { Jwk } from './jwk.types.js'

export interface CachedJwks {
  keys: Jwk[];
  fetchedAt: number;
}
