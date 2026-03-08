import * as crypto from 'crypto'
import type { Jwk } from './jwk.types.js'

export async function importRsaKey(jwk: Jwk): Promise<crypto.webcrypto.CryptoKey> {
  const keyData = {
    kty: 'RSA',
    n: jwk.n!,
    e: jwk.e!,
    alg: jwk.alg ?? 'RS256',
    use: 'sig',
    ext: true,
  };
  return crypto.subtle.importKey(
    'jwk',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}
