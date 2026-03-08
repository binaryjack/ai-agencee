import { DEFAULT_CACHE_TTL_MS } from './default-cache-ttl.js'
import type { Jwk } from './jwk.types.js'
import { jwksCache } from './jwks-cache.js'
import type { JwksDocument } from './jwks-document.types.js'
import { OidcError } from './oidc-error.js'

export async function fetchJwks(issuer: string, ttlMs: number = DEFAULT_CACHE_TTL_MS): Promise<Jwk[]> {
  const cached = jwksCache.get(issuer);
  if (cached && Date.now() - cached.fetchedAt < ttlMs) {
    return cached.keys;
  }

  let jwksUri: string;
  try {
    const discoveryUrl = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
    const discoveryRes = await fetch(discoveryUrl);
    if (!discoveryRes.ok) {
      throw new Error(`OIDC discovery failed: ${discoveryRes.status} ${discoveryUrl}`);
    }
    const discovery = (await discoveryRes.json()) as { jwks_uri?: string };
    if (!discovery.jwks_uri) {
      throw new Error(`No jwks_uri in OIDC discovery document for issuer: ${issuer}`);
    }
    jwksUri = discovery.jwks_uri;
  } catch (err) {
    throw new OidcError(`Failed to discover JWKS for issuer "${issuer}": ${String(err)}`);
  }

  const jwksRes = await fetch(jwksUri);
  if (!jwksRes.ok) {
    throw new OidcError(`JWKS fetch failed: ${jwksRes.status} ${jwksUri}`);
  }
  const jwksDoc = (await jwksRes.json()) as JwksDocument;
  const keys = jwksDoc.keys ?? [];

  jwksCache.set(issuer, { keys, fetchedAt: Date.now() });
  return keys;
}
