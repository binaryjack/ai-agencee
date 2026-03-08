export interface OidcOptions {
  /** OIDC issuer base URL (default: `AIKIT_OIDC_ISSUER`) */
  issuer?: string;
  /** Expected `aud` claim (default: `AIKIT_OIDC_AUDIENCE` or undefined) */
  audience?: string;
  /** JWKS cache TTL in ms (default: 15 min) */
  jwksCacheTtlMs?: number;
}
