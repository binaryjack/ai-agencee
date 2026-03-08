import * as crypto from 'crypto'
import { base64urlDecode } from './base64url-decode.js'
import { decodeJsonPart } from './decode-json-part.js'
import { fetchJwks } from './fetch-jwks.js'
import { importEcKey } from './import-ec-key.js'
import { importRsaKey } from './import-rsa-key.js'
import { jwksCache } from './jwks-cache.js'
import type { JwtHeader } from './jwt-header.types.js'
import type { JwtPayload } from './jwt-payload.types.js'
import { OidcError } from './oidc-error.js'

export async function verifyJwt(
  token: string,
  issuer: string,
  audience: string | undefined,
  ttlMs: number,
): Promise<JwtPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new OidcError('Malformed JWT: expected 3 parts');
  }
  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  const header = decodeJsonPart<JwtHeader>(headerB64);
  const payload = decodeJsonPart<JwtPayload>(payloadB64);

  const now = Math.floor(Date.now() / 1_000);
  if (payload.exp !== undefined && payload.exp < now) {
    throw new OidcError('JWT has expired');
  }
  if (payload.iss && payload.iss !== issuer) {
    throw new OidcError(`JWT issuer mismatch: got "${payload.iss}", expected "${issuer}"`);
  }
  if (audience) {
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(audience)) {
      throw new OidcError(`JWT audience mismatch: "${audience}" not in [${aud.join(', ')}]`);
    }
  }

  let jwks = await fetchJwks(issuer, ttlMs);
  let jwk = header.kid ? jwks.find((k) => k.kid === header.kid) : jwks[0];

  if (!jwk) {
    jwksCache.delete(issuer);
    jwks = await fetchJwks(issuer, ttlMs);
    jwk = header.kid ? jwks.find((k) => k.kid === header.kid) : jwks[0];
  }
  if (!jwk) {
    throw new OidcError(`No JWK found for kid "${header.kid}"`);
  }

  let cryptoKey: crypto.webcrypto.CryptoKey;
  let algorithm: AlgorithmIdentifier | EcdsaParams;

  if (header.alg === 'RS256' || (!header.alg && jwk.kty === 'RSA')) {
    cryptoKey = await importRsaKey(jwk);
    algorithm = { name: 'RSASSA-PKCS1-v1_5' };
  } else if (header.alg === 'ES256' || (!header.alg && jwk.kty === 'EC')) {
    cryptoKey = await importEcKey(jwk);
    algorithm = { name: 'ECDSA', hash: 'SHA-256' };
  } else {
    throw new OidcError(`Unsupported JWT algorithm: ${header.alg}`);
  }

  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64urlDecode(signatureB64);

  const valid = await crypto.subtle.verify(algorithm, cryptoKey, signature, signingInput);
  if (!valid) {
    throw new OidcError('JWT signature verification failed');
  }

  return payload;
}
