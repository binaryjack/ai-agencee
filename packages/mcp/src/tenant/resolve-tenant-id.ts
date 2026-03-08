import * as http from 'http'
import type { OidcPrincipal } from '../oidc/oidc-principal.types.js'

export function resolveTenantId(req: http.IncomingMessage): string {
  // 1. OIDC JWT claim
  const principal = (req as unknown as Record<string, unknown>)['oidcPrincipal'] as OidcPrincipal | undefined;
  if (principal) {
    const tenantId = (principal.payload as Record<string, unknown>)['tenantId'] as string | undefined;
    if (tenantId) return tenantId;
    if (principal.sub) return principal.sub;
  }

  // 2. X-Tenant-Id header (static API key workflows)
  const headerVal = req.headers['x-tenant-id'];
  if (headerVal) return Array.isArray(headerVal) ? headerVal[0]! : headerVal;

  // 3. Environment variable
  if (process.env['AIKIT_TENANT_ID']) return process.env['AIKIT_TENANT_ID'];

  // 4. Default
  return 'default';
}
