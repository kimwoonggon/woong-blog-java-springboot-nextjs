# Documentation

_Last updated: 2026-03-25T00:00:00Z_

**Current milestone**: M1

## How to Run
1. Provide auth/env values via `.env` or deployment secret manager.
2. Start the stack (`docker compose up -d --build`) or local frontend/backend equivalents.
3. Access `/login` and begin the Google sign-in flow.
4. Verify `/api/auth/session` reflects the app session after login.

## How to Demo
1. Anonymous user hits `/login`.
2. Browser redirects to backend auth start.
3. Google social login completes via ASP.NET Core callback.
4. Backend issues app cookie session.
5. Authenticated user accesses admin routes with cookie + authorization checks.
6. State-changing request includes CSRF protection and is accepted/rejected appropriately.

## Decisions Log
| Timestamp | Milestone | Decision | Reasoning |
|-----------|-----------|----------|-----------|
| 2026-03-25T00:00:00Z | M1 | Prefer backend-owned cookie session over browser JWT | Fits current app, reduces browser token exposure, and matches OWASP-aligned browser app guidance |
| 2026-03-25T00:00:00Z | M1 | Google is the first external provider | Explicit requirement and already closest to current flow |
| 2026-03-25T00:00:00Z | M1 | CSRF must be added because cookie auth is used | Required for state-changing requests with browser cookies |

## Known Issues
- Real Google login automation may still require manual/headed verification in addition to automated backend tests.
- IIS sample config may need a companion doc rather than runtime code if nginx remains the shipped proxy.
