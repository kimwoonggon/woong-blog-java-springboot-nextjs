# Plans

> **Stop-and-fix rule**: validation 실패 시 다음 마일스톤으로 넘어가지 않는다.

## [ ] M1: Delivery + TDD skeleton — Next.js frontend, ASP.NET Core (.NET 10) backend, Compose, and test harness

Create the explicit frontend/backend/runtime skeleton first: Next.js as the React + TypeScript delivery layer, ASP.NET Core MVC on .NET 10 as the API layer, and TDD-ready test projects on both sides. Lock the topology and test harness first so later data and UI work lands on a stable base.

Dependencies: none
Estimated loops: 1-2

### Allowed Files
- `backend/`
- `backend/tests/`
- `docker-compose.yml`
- `nginx/`
- `Dockerfile`
- `.dockerignore`
- `.env.example`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vitest.config.ts`
- `vitest.setup.ts`
- `playwright.config.ts`
- `src/test/`
- `tests/`
- `src/lib/api/`
- `next.config.ts`
- `README.md`

### Acceptance Criteria
- [ ] Next.js frontend is explicitly treated as the React + TypeScript application surface for public/admin UI.
- [ ] ASP.NET Core (.NET 10) backend project exists with at least `/api/health` and environment-based configuration.
- [ ] Docker Compose can describe `frontend`, `backend`, `db`, and `nginx` services together.
- [ ] Headless browser regression is the default verification mode unless a task explicitly requires manual/headed intervention.
- [ ] Nginx routes `/api/auth/*` and `/api/*` to ASP.NET Core, `/media/*` to the backend/local asset path, and all other application traffic to the Next.js frontend.
- [ ] Frontend test harness exists and can run automated tests in CI/local.
- [ ] Browser-level regression test harness exists and is ready for Playwright coverage.
- [ ] Backend test project exists and covers backend startup/health behavior.
- [ ] Test files exist and cover at least one frontend unit assertion, one backend integration assertion, and the Nginx→backend health route assumption.

### Validation Commands
```bash
docker compose config && npm run test -- --run && npm run lint && npm run build && dotnet test backend/tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj && npm run test:e2e && ./scripts/db-load-smoke.sh
```

## [ ] M2: Canonical PostgreSQL schema + seed/mock data baseline

Introduce the PostgreSQL schema and backend persistence layer as the primary application data source immediately. Seed/mock records are acceptable and expected so the new stack can boot and be exercised before historical data migration is complete.

Dependencies: M1
Estimated loops: 1-2

### Allowed Files
- `backend/`
- `backend/tests/`
- `docker-compose.yml`
- `infra/postgres/`
- `supabase/schema.sql`
- `.env.example`
- `README.md`

### Acceptance Criteria
- [ ] Local PostgreSQL schema supports `profiles`, `assets`, `site_settings`, `pages`, `works`, `blogs`, and `page_views` fields required by the current UI and API routes.
- [ ] Backend persistence is implemented through EF Core and exposed through MVC controllers + MediatR handlers with FluentValidation in the request pipeline.
- [ ] Unicode slug-compatible fields and publish-state fields currently used by the frontend are preserved.
- [ ] A repeatable bootstrap path exists for local PostgreSQL (schema creation + seed/mock data strategy).
- [ ] Table-based mock/seed data is sufficient to render and exercise the main public/admin paths.
- [ ] The backend can read/write the local schema using automated tests.
- [ ] Test files cover at least one public content query, one admin-role lookup against local PostgreSQL, and one browser-visible seeded content regression path.
- [ ] DB correctness/error-path checks exist for admin-heavy write paths, including insert/update failure cases and at least one load smoke.

### Validation Commands
```bash
docker compose up -d db && dotnet test backend/tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj && ./scripts/db-load-smoke.sh && docker compose down && npm run test:e2e
```

## [ ] M3: ASP.NET Core BFF auth and API contract

Move authentication and application APIs behind ASP.NET Core. The backend owns login start, OAuth/OIDC callback handling, session issuance, logout, and authorization checks, while the Next.js frontend keeps only the login UI surface and normal page rendering responsibilities.

Dependencies: M2
Estimated loops: 1-2

### Allowed Files
- `backend/`
- `backend/tests/`
- `.env.example`
- `README.md`
- `nginx/`
- `src/app/login/page.tsx`
- `src/app/api/auth/callback/route.ts`
- `src/lib/api/`
- `tests/`
- `playwright.config.ts`

### Acceptance Criteria
- [ ] ASP.NET Core exposes auth endpoints for login start, callback completion, session inspection, and logout.
- [ ] ASP.NET Core issues and reads HttpOnly session cookies for authenticated requests.
- [ ] Admin-only backend endpoints authorize against the local `profiles.role` value.
- [ ] Admin login works end-to-end in a real browser session.
- [ ] Public read endpoints exist for site settings, pages, works, blogs, and resume metadata needed by the current frontend.
- [ ] Admin CRUD endpoints exist for pages, site settings, works, blogs, and uploads metadata.
- [ ] Upload/media behavior is served from a local volume-backed asset path with metadata stored in PostgreSQL.
- [ ] Test files cover login/callback/session behavior, admin authorization, one mutation path, and a Playwright regression for auth-gated navigation.
- [ ] Null-derived auth/data failures produce explicit user-visible error or redirect states instead of silent empty renders.

### Validation Commands
```bash
docker compose up -d db && dotnet test backend/tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj && docker compose down && npm run test:e2e
```

## [ ] M4: Frontend read-path adoption against backend contracts

Replace direct Supabase database reads in Next.js pages/layouts with backend API clients while preserving route structure, component hierarchy, and visual behavior. Drive this from seeded PostgreSQL-backed contracts rather than waiting for migrated production data.

Dependencies: M3
Estimated loops: 2-3

### Allowed Files
- `src/app/layout.tsx`
- `src/app/(public)/`
- `src/app/admin/`
- `src/lib/api/`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/client.ts`
- `src/lib/utils.ts`
- `package.json`
- `vitest.config.ts`
- `vitest.setup.ts`
- `src/test/`
- `playwright.config.ts`
- `tests/`
- `backend/`
- `backend/tests/`
- `README.md`

### Acceptance Criteria
- [ ] Public pages fetch through the backend contract instead of querying Supabase tables directly.
- [ ] Admin dashboard/list/detail pages fetch through the backend contract instead of querying Supabase tables directly.
- [ ] Public SEO-sensitive routes have an explicit SSR/metadata strategy review, and CSR-only behavior is limited to cases that do not hurt discoverability.
- [ ] Admin/public image-bearing routes are reviewed so backend contracts cover every media dependency the UI expects.
- [ ] Public/admin layouts, component copy, and visible UI structure remain effectively unchanged.
- [ ] Existing login/logout/callback flow remains available.
- [ ] All primary menus are visible and navigable in Playwright across public and admin surfaces.
- [ ] Test files exist and cover at least one public DTO contract, one admin DTO contract, and one Playwright regression for public seeded browsing.

### Validation Commands
```bash
npm run test -- --run && npm run lint && npm run build && dotnet test backend/tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj && npm run test:e2e
```

## [ ] M5: Frontend mutation cutover and legacy direct DB path removal

Move create/update/delete and upload mutation flows from direct Supabase access to backend APIs. Remove or deprecate direct DB mutation paths so the backend becomes the single write surface.

Dependencies: M4
Estimated loops: 2-3

### Allowed Files
- `src/app/admin/blog/actions.ts`
- `src/app/admin/works/actions.ts`
- `src/app/admin/pages/actions.ts`
- `src/app/api/admin/`
- `src/app/api/uploads/route.ts`
- `src/app/api/auth/callback/route.ts`
- `src/app/login/page.tsx`
- `src/components/admin/HomePageEditor.tsx`
- `src/components/admin/SiteSettingsEditor.tsx`
- `src/components/admin/ResumeEditor.tsx`
- `src/components/admin/PageEditor.tsx`
- `src/components/admin/WorkEditor.tsx`
- `src/components/admin/BlogEditor.tsx`
- `src/lib/api/`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/client.ts`
- `package.json`
- `vitest.config.ts`
- `vitest.setup.ts`
- `src/test/`
- `playwright.config.ts`
- `tests/`
- `backend/`
- `backend/tests/`
- `docker-compose.yml`
- `nginx/`
- `README.md`

### Acceptance Criteria
- [ ] Admin save/delete/upload flows call backend APIs rather than writing application data directly through Supabase table access.
- [ ] Login/logout/session flows are driven by ASP.NET Core auth endpoints and continue to work from the Next.js UI.
- [ ] Legacy direct database mutation paths are removed, bypassed, or clearly compatibility-wrapped behind the new backend contract.
- [ ] Media/upload behavior remains working for Home, Resume, Works, and Blog flows.
- [ ] Home/profile image upload has browser coverage for both successful upload and explicit failure handling.
- [ ] Work/blog image flows (thumbnail/cover/inline media where supported) are explicitly migrated and tested rather than deferred implicitly.
- [ ] Resume PDF upload and public PDF download both have browser regression coverage.
- [ ] An admin can create or publish a post from the UI.
- [ ] A published post can be retrieved from the public UI after publishing.
- [ ] Test files cover one end-to-end content mutation path, one upload/asset metadata path, and one Playwright regression for content persistence from UI perspective.
- [ ] Backend-frontend-db integrated verification proves content written in admin is retrievable through public UI against the real stack.
- [ ] Admin edit/create forms are regression-tested with extreme strings, Korean text, punctuation-heavy input, empty values, and validation failures.

### Validation Commands
```bash
docker compose up -d --build && npm run test -- --run && npm run lint && npm run build && dotnet test backend/tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj && npm run test:e2e && curl -fsS http://localhost/api/health >/dev/null && docker compose down
```

## [ ] M6: Admin workspace consolidation and draft preview improvements

Reduce the current “two products” feeling by adding a shared admin workspace pattern while keeping the public brand intact. Improve internal preview so unpublished drafts can be evaluated in context.

Dependencies: M5
Estimated loops: 2-3

### Allowed Files
- `src/app/admin/`
- `src/components/admin/`
- `src/components/content/`
- `src/components/layout/`
- `src/components/ui/`
- `src/lib/api/`
- `package.json`
- `vitest.config.ts`
- `vitest.setup.ts`
- `src/test/`
- `playwright.config.ts`
- `tests/`
- `backend/`
- `backend/tests/`
- `README.md`

### Acceptance Criteria
- [ ] `/admin/pages` is reorganized into explicit groups such as Site Identity, Home, Pages, and Resume/Assets instead of one undifferentiated scroll surface.
- [ ] Works/Blog/Page/Home editors share a recognizable editor shell for title/meta/status/actions.
- [ ] Admin users can preview unpublished or in-progress content in context without relying only on public published routes.
- [ ] Works and Blog index screens converge on one shared content-management pattern.
- [ ] The visual brand of the public site remains intact; this is a workflow improvement, not a redesign.
- [ ] Test files cover draft preview authorization or preview-data retrieval behavior and a Playwright regression for the improved admin workflow.

### Validation Commands
```bash
npm run test -- --run && npm run lint && npm run build && dotnet test backend/tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj && npm run test:e2e
```

## [ ] M7: Admin hardening, nullability reduction, SEO audit, and backend-frontend-db stress verification

Close the remaining quality gap by treating admin reliability as the primary hardening target. Expand automated coverage around extreme inputs, explicit error handling, DB failure/load checks, and Next.js SSR/CSR/metadata decisions. Reduce avoidable nullable usage in C# request/application surfaces where partial-update semantics do not require it.

Dependencies: M6
Estimated loops: 2-4

### Allowed Files
- `backend/`
- `backend/tests/`
- `src/app/admin/`
- `src/app/(public)/`
- `src/components/admin/`
- `src/lib/api/`
- `src/test/`
- `tests/`
- `playwright.config.ts`
- `vitest.config.ts`
- `vitest.setup.ts`
- `scripts/`
- `README.md`

### Acceptance Criteria
- [ ] Admin dashboard, list, create, edit, publish, upload, and delete flows are covered by fresh browser regressions.
- [ ] Extreme admin input values (special characters, Korean text, empty strings, malformed JSON, invalid upload types) are tested and produce explicit user-visible outcomes.
- [ ] Extreme tests expand beyond text fields to file uploads, download actions, repeated save cycles, and backend-forced failure states.
- [ ] DB smoke/load verification covers successful writes, rejected invalid writes, update paths, cleanup, and integrated backend-frontend-db round-trips.
- [ ] Extreme tests include upload/download flows for images and PDFs, repeated save cycles, and backend-forced failure states.
- [ ] C# request/application surfaces reduce avoidable nullable usage; remaining nullable cases are intentional and documented.
- [ ] Null or missing data paths produce explicit UI/API errors instead of silent fallback where silent fallback could mislead the user.
- [ ] Public SEO-sensitive routes have a reviewed SSR/metadata-first strategy and documented CSR exceptions.

### Validation Commands
```bash
npm run test -- --run && npm run lint && npm run build && npm run typecheck && dotnet test backend/tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj && ./scripts/db-load-smoke.sh && npm run test:e2e
```

## [ ] M8: ASP.NET Core image-size optimization

Reduce the backend container footprint without breaking runtime behavior. Evaluate trimming, publish settings, base-image choice, asset/runtime separation, and whether tests/build artifacts are leaking into runtime layers.

Dependencies: M7
Estimated loops: 1-2

### Allowed Files
- `backend/Dockerfile`
- `backend/src/Portfolio.Api/Portfolio.Api.csproj`
- `docker-compose.yml`
- `.dockerignore`
- `README.md`
- `docs/ralph/aspnetcore-postgres-compose-nginx/`

### Acceptance Criteria
- [ ] Current backend image size is measured and documented.
- [ ] At least one safe size-reduction strategy is implemented or rejected with evidence.
- [ ] Runtime image excludes unnecessary build/test artifacts.
- [ ] Compose/runtime verification still passes after the size optimization pass.

### Validation Commands
```bash
DOCKER_API_VERSION=1.44 docker compose build backend && docker images | grep woong-blog-backend && dotnet test backend/tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj
```

## [ ] M9: Media coverage, OO review, and auth/security extensibility

Finish the planning/verification gap around media-heavy UX and long-term maintainability. This milestone ensures every frontend image/PDF path is intentionally covered, the backend design is reviewed for object-oriented/layering health, and future auth/security growth paths are documented before the migration is called done.

Dependencies: M8
Estimated loops: 1-2

### Allowed Files
- `docs/ralph/aspnetcore-postgres-compose-nginx/`
- `.omx/plans/`
- `backend/src/Portfolio.Api/**`
- `backend/tests/Portfolio.Api.Tests/**`
- `src/app/admin/`
- `src/app/(public)/`
- `src/components/admin/`
- `src/lib/api/`
- `tests/`
- `src/test/`

### Acceptance Criteria
- [ ] Profile/home image upload, work image flows, and blog image flows are explicitly mapped to backend/media contracts and regression tests.
- [ ] Resume PDF upload/download remains explicitly covered as a first-class regression path.
- [ ] Backend code is reviewed for controller thinness, request/handler separation, DTO/entity boundaries, and SOLID pressure points with concrete recommendations or fixes.
- [ ] Backend-frontend-db integrated tests prove media and content round-trip correctly through the real stack.
- [ ] Future auth/security extension points are documented: additional providers, stronger authorization, richer audit logs, stricter session handling, and secret/config management.

### Validation Commands
```bash
npm run test -- --run && npm run build && npm run typecheck && dotnet test backend/tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj && ./scripts/db-load-smoke.sh && npm run test:e2e:stack
```
