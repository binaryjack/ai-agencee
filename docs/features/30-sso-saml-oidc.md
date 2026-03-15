# Feature 30: SSO / SAML 2.0 / OIDC (IP-02)

> **Status**: ✅ Production-ready  
> **Category**: Enterprise — IP Series  
> **ID**: IP-02  
> **Package**: `_private/cloud-api` + `_private/ai-agencee-cloud`

---

## Overview

Enterprise single-sign-on via SAML 2.0 and OpenID Connect. Users authenticate through their corporate identity provider (Okta, Azure Active Directory, Google Workspace) and receive the same short-lived access + refresh JWT pair as password-authenticated users. No separate password management is required for SSO users.

---

## Supported Identity Providers

| Provider | Protocol | Notes |
|----------|----------|-------|
| Okta | SAML 2.0 + OIDC | Both SP-initiated and IdP-initiated |
| Azure Active Directory | SAML 2.0 + OIDC | PKCE enforced |
| Google Workspace | OIDC | Authorization Code Flow |
| Generic SAML 2.0 IdP | SAML 2.0 | Any IdP that supports SAML metadata XML |
| Generic OIDC IdP | OIDC | Any provider with a `/.well-known/openid-configuration` endpoint |

---

## Key Components

| Component | Location | Role |
|-----------|----------|------|
| SAML plugin | `cloud-api/src/plugins/saml.ts` | `passport-saml` integration; POST `/auth/sso/saml/init` + `/acs` |
| OIDC plugin | `cloud-api/src/plugins/oidc.ts` | Authorization Code + PKCE; POST `/auth/oidc/init` + `/callback` |
| `sso_providers` table | `005_sso.sql` | Stores IdP entity ID, metadata XML, attribute mappings per tenant |
| SSO settings page | `ai-agencee-cloud/src/pages/settings/SsoPage.tsx` | `/settings/sso` — provisioning, attribute mapping, test connection |
| JIT provisioning | `cloud-api/src/lib/sso-provisioner.ts` | Creates user record on first SSO login from attributes |

---

## Authentication Flow

```
1. User clicks "Sign in with SSO"
2. Cloud API redirects to IdP (SAML AuthnRequest or OIDC /authorize)
3. IdP authenticates user, posts assertion back to /acs or /callback
4. Cloud API validates assertion signature / PKCE code exchange
5. JIT: upsert user record from attributes (email, name, groups)
6. Issue access_token (15min) + refresh_token (7d) — same as password auth
7. Redirect to /dashboard
```

---

## Attribute Mapping

Configure mappings in `/settings/sso`:

| SAML Attribute | OIDC Claim | Platform Field |
|----------------|-----------|----------------|
| `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` | `email` | `user.email` |
| `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name` | `name` | `user.name` |
| `http://schemas.microsoft.com/ws/2008/06/identity/claims/groups` | `groups` | `user.roles[]` |

---

## Migration from Password Auth

Existing password accounts are automatically linked when an SSO assertion arrives with a matching `email`. No duplicate accounts are created.
