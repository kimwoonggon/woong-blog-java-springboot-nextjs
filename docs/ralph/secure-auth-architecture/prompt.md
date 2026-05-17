# Secure Cookie-Based Social Authentication

## Goals
- Design and implement a secure browser authentication architecture using Google social login first.
- Keep authentication backend-owned via ASP.NET Core and issue the app's own secure session cookie.
- Add OWASP-aligned hardening for proxy handling, cookie/session security, CSRF protection, HTTPS, rate limiting, logging, and authorization review.
- Preserve current routes and UX where reasonably possible.

## Non-Goals
- Do not introduce browser-exposed JWT storage unless a later explicit requirement demands stateless/mobile/third-party API access.
- Do not redesign unrelated content/editor/admin UX flows.
- Do not change public route structure unless required for auth correctness or CSRF integration.

## Hard Constraints
- Browser-facing traffic must be HTTPS in production.
- Reverse proxy must forward `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host` correctly.
- ASP.NET Core must trust configured proxies and reconstruct scheme/host safely behind nginx/IIS.
- Use Google social login via ASP.NET Core external authentication.
- App session cookie must be `HttpOnly`, `Secure`, `SameSite=Lax` by default.
- No localStorage/sessionStorage auth-token storage without documented justification.
- Add CSRF protection for state-changing requests.
- Add HSTS, HTTPS redirection, security headers, auth endpoint rate limiting, and audit/security logging.
- Review backend authorization for broken access control.
- Support shared Data Protection key persistence for multi-instance deployment.
- Secrets must come from env vars or a secret manager only.

## Deliverables
- [ ] Current-state auth/security markdown review
- [ ] Hardened ASP.NET Core auth/session architecture using Google external login + app session cookie
- [ ] Anti-forgery/CSRF protection for cookie-authenticated state-changing requests
- [ ] Forwarded-header / trusted-proxy handling and sample edge config
- [ ] Updated env template and deployment/integration notes
- [ ] SECURITY.md explaining cookie-session rationale, future JWT criteria, and deployment checklist
- [ ] Tests covering auth/session/CSRF basics

## Done When
- [ ] Current auth flow, risks, missing controls, and recommended target architecture are documented in markdown.
- [ ] Google login flows through ASP.NET Core and results in the app’s own secure session cookie.
- [ ] State-changing cookie-authenticated requests are protected against CSRF.
- [ ] HTTPS, HSTS, security headers, proxy handling, and rate limiting are configured/documented.
- [ ] Backend endpoint authorization is reviewed and tightened where needed.
- [ ] Multi-instance Data Protection guidance/config is in place.
- [ ] Secrets are removed from hardcoded config and sourced from env/secret manager.
- [ ] Existing routes still function unless a documented security reason requires a change.
- [ ] Tests pass for auth/session/CSRF baseline behavior.
