export interface JwtPayload {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  email?: string;
  groups?: string[];
  roles?: string[];
}
