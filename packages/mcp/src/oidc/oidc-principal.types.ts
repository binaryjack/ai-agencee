import type { JwtPayload } from './jwt-payload.types.js'

export interface OidcPrincipal {
  sub: string;
  email?: string;
  /** Azure AD / Okta groups claim */
  groups?: string[];
  /** Azure AD / Okta roles claim */
  roles?: string[];
  /** Raw decoded payload for custom claim extraction */
  payload: JwtPayload;
}
