# Baseline Review — Architecture Innovation Quality Pass

## Integrated runtime flow
1. Browser hits nginx first.
2. nginx forwards `/api/*` and `/media/*` to ASP.NET Core and serves all other routes through Next.js.
3. Next.js server components call backend APIs through `src/lib/api/server.ts` and render public/admin flows server-side.
4. ASP.NET Core handles auth, admin/public APIs, uploads, persistence, and session checks.
5. EF Core uses `PortfolioDbContext` to access PostgreSQL tables for profiles, sessions, blogs, works, pages, settings, assets, and page views.

## Current test layers
### Frontend unit/component
- Vitest + jsdom via `src/test/**`
- Coverage script/tooling is **not yet explicitly wired** in `package.json`

### Browser/integration
- Playwright via `tests/**`
- Current suites already cover:
  - auth/browser security basics
  - admin dashboard
  - public pagination/detail flows
  - editor flows

### Backend
- xUnit via `backend/tests/Portfolio.Api.Tests/**`
- Coverlet collector already exists in the test project for backend coverage collection

## Current coverage / quality gaps
1. No explicit frontend coverage command in `package.json`
2. Quality pass still needs a single consolidated integration evidence report rather than scattered green test runs
3. TypeScript weak spots remain around `unknown` payloads and flexible API object shapes, e.g.:
   - `src/lib/api/works.ts`
   - `src/components/admin/WorkEditor.tsx`
   - `src/components/admin/PageEditor.tsx`
   - AI route handlers with broad `unknown` catches
4. C# nullable review is still pending as a structured pass; `<Nullable>enable</Nullable>` is on, but justification/cleanup is not yet documented
5. EF Core review is still pending as an explicit findings report, though the current model already enforces useful unique indexes on slugs and session keys
6. Load/performance testing is not yet present as a repeatable scripted path beyond lightweight smoke scripts

## DB / EF Core observations
- `PortfolioDbContext` defines unique indexes on:
  - `Pages.Slug`
  - `Works.Slug`
  - `Blogs.Slug`
  - `AuthSessions.SessionKey`
  - `(Profiles.Provider, Profiles.ProviderSubject)`
- Schema is domain-aligned for the current app, but an explicit index/nullability adequacy review remains to be written
- Current runtime still depends on slug uniqueness for public detail routing

## nginx/runtime observations
- Base nginx config correctly forwards host/forwarded headers for `/api/*`, `/media/*`, and app traffic
- Local HTTPS config exists separately with 80->443 redirect and local cert mounting
- A broader runtime verification pass should still document timeout/body-size/header assumptions and any environment drift between HTTP and HTTPS configs

## Recommended next milestones
- M1: commit the plan artifacts and baseline report as the evidence base
- M2: unify the integrated regression story (browser/server/db readback + error-path evidence)
- M3: add explicit frontend coverage command/tooling and close meaningful unit gaps
- M4/M5: nullable + EF Core review with only evidence-backed fixes
- M6: bounded load checks and nginx/runtime conclusions
