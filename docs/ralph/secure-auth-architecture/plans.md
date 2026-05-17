# Plans

> **Stop-and-fix rule**: validation 실패 시 다음 마일스톤으로 넘어가지 않는다.

## [ ] M1: Current-state auth review + secure target design
Document the existing auth flow, enumerate concrete risks/missing controls, and lock the secure cookie-session target architecture before editing runtime code.

Dependencies: none  
Estimated loops: 1

### Allowed Files
- `docs/ralph/secure-auth-architecture/auth-review.md`
- `docs/ralph/secure-auth-architecture/prompt.md`
- `docs/ralph/secure-auth-architecture/plans.md`
- `docs/ralph/secure-auth-architecture/implement.md`
- `docs/ralph/secure-auth-architecture/documentation.md`
- `.omx/plans/prd-secure-auth-architecture.md`
- `.omx/plans/test-spec-secure-auth-architecture.md`

### Acceptance Criteria
- [ ] Current auth flow, current risks, missing controls, and target architecture are documented.
- [ ] Planned file-change surface is listed before implementation begins.
- [ ] SECURITY.md / proxy / CSRF / cookie / logging / rate-limit requirements are explicitly covered in the plan.

### Validation Commands
```bash
test -f docs/ralph/secure-auth-architecture/auth-review.md && test -f docs/ralph/secure-auth-architecture/plans.md
```

## [ ] M2: Backend auth/session hardening
Harden ASP.NET Core authentication, external Google login, proxy handling, cookie/session settings, security middleware, and logging without unnecessarily breaking existing routes.

Dependencies: M1  
Estimated loops: 2-3

### Allowed Files
- `backend/src/Portfolio.Api/Program.cs`
- `backend/src/Portfolio.Api/Controllers/AuthController.cs`
- `backend/src/Portfolio.Api/Infrastructure/Auth/AuthOptions.cs`
- `backend/src/Portfolio.Api/Infrastructure/Auth/AuthRecorder.cs`
- `backend/src/Portfolio.Api/Controllers/AdminBlogsController.cs`
- `backend/src/Portfolio.Api/Controllers/AdminWorksController.cs`
- `backend/src/Portfolio.Api/Controllers/AdminPagesController.cs`
- `backend/src/Portfolio.Api/Controllers/AdminDashboardController.cs`
- `backend/src/Portfolio.Api/Controllers/AdminSiteSettingsController.cs`
- `backend/src/Portfolio.Api/Controllers/UploadsController.cs`
- `backend/src/Portfolio.Api/appsettings.json`
- `backend/src/Portfolio.Api/appsettings.Development.json`
- `backend/tests/Portfolio.Api.Tests/AuthEndpointsTests.cs`
- `backend/tests/Portfolio.Api.Tests/AuthRecorderTests.cs`
- `backend/tests/Portfolio.Api.Tests/CustomWebApplicationFactory.cs`
- `backend/tests/Portfolio.Api.Tests/*`
- `backend/src/Portfolio.Api/Infrastructure/`

### Acceptance Criteria
- [ ] Google login remains backend-owned and issues the app’s own secure cookie session.
- [ ] Cookie settings are `HttpOnly`, `Secure`, `SameSite=Lax` by default, with env-driven overrides only where documented.
- [ ] Forwarded header handling includes trusted proxies/networks and forwarded host support.
- [ ] HTTPS redirection, HSTS, security headers, and auth endpoint rate limiting are configured.
- [ ] Login success/failure, logout, and denied-access logging are in place.
- [ ] GET-based logout semantics are removed or safely migrated, and frontend callers are updated accordingly.
- [ ] Endpoint authorization is reviewed and tightened for admin-only surfaces.
- [ ] Tests exist and cover session/auth basics plus denied-access/security behavior.

### Validation Commands
```bash
docker run --pull=never --rm -v "$PWD/backend:/src" -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet test tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj
```

## [ ] M3: CSRF + Next.js/browser integration
Add anti-forgery support and document how the Next.js frontend should use the cookie session safely for state-changing requests.

Dependencies: M2  
Estimated loops: 1-2

### Allowed Files
- `backend/src/Portfolio.Api/Program.cs`
- `backend/src/Portfolio.Api/Controllers/AuthController.cs`
- `src/lib/api/auth.ts`
- `src/lib/api/server.ts`
- `src/app/login/page.tsx`
- `src/app/(public)/layout.tsx`
- `src/app/admin/layout.tsx`
- `src/app/admin/blog/actions.ts`
- `src/app/admin/works/actions.ts`
- `src/app/admin/pages/page.tsx`
- `src/components/admin/HomePageEditor.tsx`
- `src/components/admin/PageEditor.tsx`
- `src/components/admin/SiteSettingsEditor.tsx`
- `src/components/admin/WorkEditor.tsx`
- `src/components/admin/BlogEditor.tsx`
- `src/components/admin/ResumeEditor.tsx`
- `src/components/admin/TiptapEditor.tsx`
- `src/components/admin/SignOutButton.tsx`
- `src/components/layout/Navbar.tsx`
- `src/lib/api/*`
- `backend/tests/Portfolio.Api.Tests/*`
- `src/test/*`
- `tests/*`

### Acceptance Criteria
- [ ] Cookie-authenticated state-changing requests have CSRF protection across the actual admin/browser mutation surface.
- [ ] No auth tokens are written to localStorage/sessionStorage.
- [ ] Frontend integration notes explain how server/client requests obtain/send anti-forgery state.
- [ ] Tests cover at least one CSRF success path, one CSRF rejection path, and the logout migration path.

### Validation Commands
```bash
npm run typecheck && docker run --pull=never --rm -v "$PWD/backend:/src" -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet test tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/auth-security-browser.spec.ts --workers=1
```

## [ ] M4: Deployment docs, env template, proxy samples, SECURITY.md
Document deployment and provide sample hardened edge configuration and security rationale/checklists.

Dependencies: M2, M3  
Estimated loops: 1

### Allowed Files
- `.env.example`
- `README.md`
- `DEPLOYMENT.md`
- `nginx/default.conf`
- `docs/ralph/secure-auth-architecture/documentation.md`
- `SECURITY.md`
- `docs/**/*.md`

### Acceptance Criteria
- [ ] `.env.example` contains env-driven auth/security settings with no secrets hardcoded.
- [ ] nginx sample config includes secure forwarded-header handling and HTTPS/TLS guidance.
- [ ] SECURITY.md explains why cookie session was chosen, when JWT would be needed later, and the deployment checklist.
- [ ] Next.js integration notes are documented.

### Validation Commands
```bash
test -f SECURITY.md && rg -n "cookie|JWT|CSRF|HSTS|forwarded|Google" SECURITY.md DEPLOYMENT.md README.md .env.example nginx/default.conf
```

## [ ] M5: End-to-end auth/session/security regression
Run the full auth/security validation set and ensure nothing critical regressed.

Dependencies: M2, M3, M4  
Estimated loops: 1

### Allowed Files
- `backend/tests/Portfolio.Api.Tests/*`
- `tests/*`
- `src/test/*`
- `docs/ralph/secure-auth-architecture/documentation.md`

### Acceptance Criteria
- [ ] Backend auth/session tests pass.
- [ ] Frontend typecheck/lint pass.
- [ ] Browser/manual-auth guidance exists for Google sign-in verification where automation cannot complete the real consent flow.
- [ ] Final documentation includes exactly what changed and remaining known gaps.
- [ ] Frontend/browser checks prove CSRF-protected mutation flows and logout behavior still work after hardening.

### Validation Commands
```bash
npm run lint && npm run typecheck && docker run --pull=never --rm -v "$PWD/backend:/src" -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet test tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/auth-security-browser.spec.ts --workers=1
```
