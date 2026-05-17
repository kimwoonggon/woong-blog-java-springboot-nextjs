# Current Authentication & Security Review

## Scope
- Frontend: Next.js (`src/app`, `src/lib/api`)
- Backend: ASP.NET Core (`backend/src/Portfolio.Api`)
- Edge/proxy: nginx (`nginx/default.conf`)

## Current Auth Flow
1. `/login` renders a Google sign-in button that redirects the browser to the backend auth start endpoint via `getLoginUrl('/admin')` (`src/app/login/page.tsx`, `src/lib/api/auth.ts`).
2. `GET /api/auth/login` validates the local return URL and triggers ASP.NET Core OpenID Connect challenge (`backend/src/Portfolio.Api/Controllers/AuthController.cs`).
3. ASP.NET Core is configured with cookie auth + OpenID Connect against Google authority `https://accounts.google.com`; on token validation it records a profile/session/audit log and adds app claims into the cookie principal (`backend/src/Portfolio.Api/Program.cs`, `backend/src/Portfolio.Api/Infrastructure/Auth/AuthRecorder.cs`).
4. The application issues its own auth cookie (`HttpOnly`, `SameSite=Lax`, `SecurePolicy` driven by config, sliding expiration) and does **not** save upstream tokens to the browser (`SaveTokens = false`) (`backend/src/Portfolio.Api/Program.cs`).
5. Next.js server components forward cookies to `/api/auth/session` and use that session response to render public/admin UI affordances (`src/lib/api/server.ts`, `src/app/(public)/layout.tsx`).
6. A development/testing-only `/api/auth/test-login` shortcut can mint a seeded local admin cookie (`backend/src/Portfolio.Api/Controllers/AuthController.cs`).

## Existing Strengths
- The browser-facing app already prefers a backend-owned cookie session over frontend-managed bearer tokens.
- The auth cookie is already `HttpOnly` and `SameSite=Lax` by default.
- Upstream OIDC tokens are not exposed to the browser (`SaveTokens = false`).
- Auth audit entities exist (`AuthAuditLog`, `AuthSession`) and login success/failure/logout are recorded.
- Data Protection keys are already persisted to disk, which is a workable base for multi-instance/shared-key-ring deployment.

## Current Risks
1. **Hardcoded secret in repo**: `appsettings.Development.json` currently contains a real-looking Google client secret. This violates the “secrets from env/secret manager only” requirement.
2. **Proxy trust is incomplete**: forwarded headers only include `X-Forwarded-For` and `X-Forwarded-Proto`; `X-Forwarded-Host` is not configured, and trusted proxy/network boundaries are not declared.
3. **No HTTPS/HSTS pipeline hardening**: the backend does not currently call `UseHttpsRedirection()` or `UseHsts()`.
4. **No CSRF protection**: cookie-authenticated state-changing endpoints (`POST/PUT/DELETE`) do not appear to enforce anti-forgery tokens.
5. **Logout via GET**: `GET /api/auth/logout` exists, which weakens CSRF posture for logout semantics.
6. **No auth rate limiting**: login/callback/session/auth endpoints are not rate-limited.
7. **No security response headers baseline**: CSP / frame / content-type / referrer / permissions headers are not centrally enforced.
8. **Authorization review gap**: admin controllers use `[Authorize(Policy = "AdminOnly")]`, but a fresh endpoint-by-endpoint review is still needed for broken access control hardening.
9. **Proxy sample is too light for production**: nginx forwards the common headers but does not yet show hardened HTTPS, HSTS, host preservation, or Web app security headers.

## Missing Security Controls
- Trusted-proxy configuration (`KnownProxies` / `KnownNetworks` + forwarded host handling)
- HTTPS redirection and HSTS
- Security headers middleware/policy
- Anti-forgery token issuance/validation for cookie-authenticated mutations
- Auth endpoint rate limiting
- Denied-access / authorization-failure audit logging
- Explicit secure deployment checklist and Next.js integration guidance
- Secret-manager/env-only configuration cleanup

## Recommended Architecture
### Authentication model
- Keep **ASP.NET Core as the BFF/auth owner**.
- Use **Google external authentication** only at the backend.
- After successful external login, issue the app’s own **secure session cookie**:
  - `HttpOnly`
  - `Secure`
  - `SameSite=Lax` by default
- Do **not** expose JWTs to the browser unless mobile/stateless third-party API access becomes a real requirement later.

### Browser/session design
- Browser only holds the app session cookie.
- Next.js reads session state via server-side fetches to backend session endpoints.
- State-changing requests carry both the auth cookie and an anti-forgery token/header.

### Proxy / deployment design
- Browser-facing traffic terminates at HTTPS on nginx/IIS.
- Reverse proxy forwards and preserves:
  - `X-Forwarded-For`
  - `X-Forwarded-Proto`
  - `X-Forwarded-Host`
- ASP.NET Core trusts only configured proxies/networks and reconstructs scheme/host correctly.

### Hardening baseline
- `UseForwardedHeaders()` with trusted proxy constraints
- `UseHttpsRedirection()`
- `UseHsts()` in non-development
- Security headers middleware (at minimum: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`/`frame-ancestors`, baseline CSP, Permissions-Policy)
- Rate limiting on `/api/auth/*`
- Audit logging for login success/failure, logout, denied access
- Endpoint authorization review for admin and upload APIs
- Shared Data Protection key ring for multi-instance deployment
- All auth secrets from environment variables / secret manager only

## Planned File Change Surface (before editing)
### Backend likely touchpoints
- `backend/src/Portfolio.Api/Program.cs`
- `backend/src/Portfolio.Api/Controllers/AuthController.cs`
- `backend/src/Portfolio.Api/Infrastructure/Auth/AuthOptions.cs`
- `backend/src/Portfolio.Api/Infrastructure/Auth/AuthRecorder.cs`
- possible new middleware/options files under `backend/src/Portfolio.Api/Infrastructure/`
- backend auth / CSRF / proxy tests under `backend/tests/Portfolio.Api.Tests/`

### Frontend likely touchpoints
- `src/lib/api/auth.ts`
- `src/lib/api/server.ts`
- `src/app/login/page.tsx`
- possibly new helper for CSRF token bootstrap/use
- integration notes docs only if frontend code changes stay small

### Infra/docs likely touchpoints
- `nginx/default.conf`
- `.env.example`
- `README.md` and/or `DEPLOYMENT.md`
- new `SECURITY.md`
- IIS sample config doc if added
