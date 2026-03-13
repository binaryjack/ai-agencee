import { DEFAULT_CACHE_TTL_MS } from './default-cache-ttl.js'
import { OidcError } from './oidc-error.js'
import type { OidcMiddleware } from './oidc-middleware.types.js'
import type { OidcOptions } from './oidc-options.types.js'
import type { OidcPrincipal } from './oidc-principal.types.js'
import { verifyJwt } from './verify-jwt.js'

export function createOidcMiddleware(opts: OidcOptions = {}): OidcMiddleware {
  const issuer = opts.issuer ?? process.env['AIKIT_OIDC_ISSUER'];
  const audience = opts.audience ?? process.env['AIKIT_OIDC_AUDIENCE'];
  const ttlMs = opts.jwksCacheTtlMs ?? DEFAULT_CACHE_TTL_MS;

  if (!issuer) {
    let warned = false;
    return async (_req, _res, next) => {
      if (!warned) {
        console.warn(
          '[oidc-auth] AIKIT_OIDC_ISSUER is not set — authentication is disabled. '
          + 'Set AIKIT_OIDC_ISSUER to enable OIDC verification.',
        );
        warned = true;
      }
      next();
    };
  }

  return async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (!headerValue || !headerValue.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or malformed Authorization header' });
      return;
    }

    const token = headerValue.slice(7).trim();
    try {
      const payload = await verifyJwt(token, issuer, audience, ttlMs);

      if (!payload.sub) {
        res.status(401).json({ error: 'JWT missing "sub" claim' });
        return;
      }

      const principal: OidcPrincipal = {
        sub: payload.sub,
        email: payload.email,
        groups: payload.groups,
        roles: payload.roles,
        payload,
      };

      (req as unknown as Record<string, unknown>)['oidcPrincipal'] = principal;
      next();
    } catch (err) {
      if (err instanceof OidcError) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Authentication error' });
        console.error('[oidc-auth] Unexpected error:', err);
      }
    }
  };
}
