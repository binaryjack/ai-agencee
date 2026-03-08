import * as crypto from 'crypto'
import type { Jwk } from './jwk.types.js'

export async function importEcKey(jwk: Jwk): Promise<crypto.webcrypto.CryptoKey> {
  const keyData = {
    kty: 'EC',
    crv: jwk.crv ?? 'P-256',
    x: jwk.x!,
    y: jwk.y!,
    ext: true,
  };
  return crypto.subtle.importKey(
    'jwk',
    keyData,
    { name: 'ECDSA', namedCurve: jwk.crv ?? 'P-256' },
    false,
    ['verify'],
  );
}
