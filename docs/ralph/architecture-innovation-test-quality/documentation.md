# Documentation

_Last updated: 2026-03-26T03:40:00Z_

**Current milestone**: M6.1

## How to Run
1. Start the integrated stack when browser/nginx verification is needed:
   - `docker compose up -d --build frontend backend nginx`
2. Run frontend unit tests with Vitest.
3. Run the focused M3 frontend coverage suite when validating helper/editor branch coverage:
   - `npm run test:coverage:m3`
4. Run the verified full-suite frontend coverage sweep:
   - `npm run test:coverage`
5. Run backend tests with the .NET SDK container.
6. Run Playwright against the live stack.

## How to Demo
1. Open the app through nginx.
2. Exercise one authenticated and one unauthenticated flow.
3. Create/update/read back a record through the UI and verify persistence.
4. Demonstrate one invalid/failure path.
5. Summarize load-test and schema-review findings.

## Decisions Log
| Timestamp | Milestone | Decision | Reasoning |
|-----------|-----------|----------|-----------|
| 2026-03-25T00:00:00Z | M0 | Duplicate slug hardening must land first | The current DB constraint failure blocks normal content creation and should be removed before the wider quality pass |
| 2026-03-25T00:00:00Z | M1 | Treat this as a quality-verification pass, not a feature pass | The source task prioritizes validation, coverage, types, nullability, DB review, and load/runtime stability |
| 2026-03-25T00:00:00Z | M1 | Reuse existing xUnit/Vitest/Playwright layers before introducing new test frameworks | Lowest-risk path to broader coverage and integration confidence |
| 2026-03-25T00:00:00Z | M1 | Keep load testing lightweight and realistic | The repo currently has no dedicated load-test harness and should avoid over-engineered benchmarking in the first pass |
| 2026-03-25T20:48:00Z | M3 | Treat helper/editor coverage as a named focused suite | The broad full-frontend coverage run mixes in many exploratory UI modules, while the M3 target is to harden the high-risk utility, API-client, and editor paths with a reproducible command |
| 2026-03-25T20:52:00Z | M3 | Make `test:coverage` threadless for stable full-suite coverage | Removing the threaded coverage run avoids the earlier temp-file race and gives a reproducible all-files coverage command |
| 2026-03-25T21:12:00Z | M3 | Keep both coverage entry points | `test:coverage` is now the verified full-suite gate, while `test:coverage:m3` remains the focused helper/editor pressure test |
| 2026-03-25T21:35:00Z | M4 | Fix request-boundary typing before deeper UI typing cleanup | The highest-value TypeScript risk was unsafe `FormData` extraction and repeated `JSON.parse` assertions in admin actions |
| 2026-03-25T21:35:00Z | M4 | Treat nullable semantics bugs as higher priority than cosmetic nullable cleanup | `ResumeAssetId` omission vs explicit null was a real backend contract bug, so the request model/controller were tightened before lower-value nullable refactors |
| 2026-03-25T22:20:00Z | M5 | Move admin read orchestration out of controllers first | Public reads already use MediatR, so the highest-value architecture slice was aligning admin read endpoints with the same application-layer pattern before considering broader write-path changes |
| 2026-03-25T22:45:00Z | M5 | Finish the CQRS alignment by moving admin write orchestration into command handlers | Once the read side was thinned, the highest-value follow-up was removing controller-owned mutation orchestration for pages, site settings, blogs, and works |
| 2026-03-25T23:10:00Z | M5 | Move admin validation into the MediatR pipeline | After CQRS handler alignment, the remaining controller responsibility was manual validation, so command validators plus a global FluentValidation exception filter completed the pipeline-based flow |
| 2026-03-26T00:20:00Z | M5 | Tighten the admin application/persistence boundary with service ports | After handler alignment, the next safe step was to stop injecting `PortfolioDbContext` into admin handlers directly and route them through application-facing admin services implemented in infrastructure |
| 2026-03-26T00:35:00Z | M6 | Align nginx upload-body limits with the backend request-size policy | The backend already allows 25 MB uploads, so nginx needed an explicit `client_max_body_size 25m` to avoid becoming the hidden bottleneck |
| 2026-03-26T01:10:00Z | M5 | Apply the same application/persistence boundary to public queries | After the admin slice was separated, public query handlers were the remaining place where the application layer still depended directly on EF Core |
| 2026-03-26T01:25:00Z | M6 | Stabilize local-admin Playwright login flow for regression coverage | Several browser regressions relied on the dev login shortcut, so the suite now uses a shared helper that performs the shortcut navigation and then opens the target page directly |
| 2026-03-26T03:35:00Z | M5.6 | Split Playwright into authenticated and runtime-auth lanes | Authenticated specs now share one seeded storage-state fixture, while login/logout/auth-security stay on a runtime-auth lane so suite-wide auth transitions stay deterministic |
| 2026-03-26T03:35:00Z | M5.7 | Narrow auth rate limiting to the actual challenge endpoints | SSR pages legitimately call `/api/auth/session` during normal navigation, so production-safe rate limiting must protect login entry points without treating session introspection like a brute-force surface |

## Coverage Notes

### M3 focused frontend coverage

**Before** (`api-base`, `auth-login-url`, `auth-csrf`, `responsive-page-size`, `server-api`, `public-api-clients`, `public-api-contracts`):

- Statements: 84.37%
- Lines: 85.81%
- Functions: 91.42%
- Branches: 76.59%

**After** (`npm run test:coverage:m3`):

- Statements: 98.75%
- Lines: 98.67%
- Functions: 98.76%
- Branches: 96.42%

### Full-suite frontend coverage

**Before** (`npm run test:coverage` before the final compression pass):

- Statements: 84.37%
- Lines: 85.81%
- Functions: 91.42%
- Branches: 76.59%

**After** (`npm run test:coverage`):

- Statements: 99.24%
- Lines: 99.40%
- Functions: 99.25%
- Branches: 96.02%

### Files strengthened in the focused suite

- `src/lib/api/base.ts`
- `src/lib/api/auth.ts`
- `src/lib/api/server.ts`
- `src/lib/api/blogs.ts`
- `src/lib/api/works.ts`
- `src/lib/api/pages.ts`
- `src/lib/api/site-settings.ts`
- `src/components/admin/PageEditor.tsx`
- `src/components/admin/HomePageEditor.tsx`
- `src/components/admin/ResumeEditor.tsx`
- `src/components/admin/SiteSettingsEditor.tsx`
- `src/components/admin/AdminDashboardCollections.tsx`
- `src/app/admin/pages/page.tsx`
- `src/app/admin/blog/page.tsx`
- shared UI primitives used by the tested admin surfaces

## M4 typing / nullable notes

### TypeScript improvements

- Added `src/lib/admin/form-data.ts` to replace unsafe `formData.get(...) as string` patterns in:
  - `src/app/admin/blog/actions.ts`
  - `src/app/admin/works/actions.ts`
- Added `src/lib/content/page-content.ts` to centralize page-content parsing/guards used by:
  - `src/app/admin/pages/page.tsx`
  - `src/components/admin/PageEditor.tsx`
  - `src/app/(public)/page.tsx`
  - `src/app/(public)/introduction/page.tsx`
  - `src/app/(public)/contact/page.tsx`
- Added regression tests for the new typed helpers:
  - `src/test/admin-form-data.test.ts`
  - `src/test/page-content.test.ts`
- Finished the deferred M4 cleanup items:
  - replaced `error as Error` in `src/components/admin/AIFixDialog.tsx`
  - replaced the remaining `error as Error` casts in `src/components/admin/ResumeEditor.tsx`
  - removed the explicit `any` index signature from `src/components/admin/tiptap/CommandList.tsx`
  - tightened suggestion-item typing in `src/components/admin/tiptap/Commands.ts`
  - removed the non-null asserted Three.js mesh ref in `src/components/content/ThreeJsScene.tsx`
  - expanded named API response types in `src/lib/api/admin-dashboard.ts`, `src/lib/api/home.ts`, `src/lib/api/server.ts`, and `src/lib/api/site-settings.ts`

### Additional M4 helper verification

- `src/test/error-message.test.ts`

### C# nullable / contract improvements

- `UpdateSiteSettingsRequest` now preserves the distinction between:
  - omitted `resumeAssetId`
  - explicit `resumeAssetId: null`
  - explicit `resumeAssetId: <guid>`
- `AdminSiteSettingsController` now updates `ResumeAssetId` only when the field is actually present in the payload
- `UpdatePageRequestValidator` now enforces `NotEmpty()` for `Title` and `ContentJson`
- `UploadsController` no longer uses a null-forgiving `Path.GetDirectoryName(...)!`
- `PersistenceContractTests` no longer rely on null-forgiving entity-type locals

### M4 verification

- `npm run lint`
- `npm run typecheck`
- `npx vitest run --pool=threads`
- `npm run build`
- `docker run --rm -v "$PWD/backend:/src" -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet test tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj`

All passed during the M4 pass.

## M5 admin read-path architecture notes

### Scope

- Kept controller write endpoints in place
- Moved **admin read use cases** into MediatR application handlers so controllers mostly translate HTTP concerns and delegate business/data orchestration

### Added admin read handlers

- `Application/Admin/GetDashboardSummary/*`
- `Application/Admin/GetAdminPages/*`
- `Application/Admin/GetAdminSiteSettings/*`
- `Application/Admin/GetAdminBlogs/*`
- `Application/Admin/GetAdminBlogById/*`
- `Application/Admin/GetAdminWorks/*`
- `Application/Admin/GetAdminWorkById/*`
- shared read-side support:
  - `Application/Admin/Support/AdminContentJson.cs`

### Controller impact

- `AdminDashboardController` now delegates `GET` to MediatR
- `AdminPagesController` now delegates `GET` to MediatR
- `AdminSiteSettingsController` now delegates `GET` to MediatR
- `AdminBlogsController` now delegates `GET` and `GET by id` to MediatR
- `AdminWorksController` now delegates `GET` and `GET by id` to MediatR

### Verification

- `npm run lint`
- `npm run typecheck`
- `npx vitest run --pool=threads`
- `npm run build`
- `docker run --rm -v "$PWD/backend:/src" -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet test tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj`

All passed for the M5 refactor pass.

## M5 write-path CQRS notes

### Scope

- Continued the M5 architecture pass by moving the remaining controller-heavy **admin write endpoints** to MediatR command handlers
- Controllers now keep:
  - HTTP binding
  - request validation / status-code translation
- Command handlers now own:
  - persistence mutation
  - slug generation
  - excerpt generation
  - update/delete orchestration

### Added admin write handlers

- `Application/Admin/UpdatePage/*`
- `Application/Admin/UpdateSiteSettings/*`
- `Application/Admin/CreateBlog/*`
- `Application/Admin/UpdateBlog/*`
- `Application/Admin/DeleteBlog/*`
- `Application/Admin/CreateWork/*`
- `Application/Admin/UpdateWork/*`
- `Application/Admin/DeleteWork/*`
- shared write-side support:
  - `Application/Admin/Support/AdminContentText.cs`
  - `Application/Admin/Support/AdminMutationResult.cs`

### Controller impact

- `AdminPagesController` now delegates `PUT`
- `AdminSiteSettingsController` now delegates `PUT`
- `AdminBlogsController` now delegates `POST`, `PUT`, `DELETE`
- `AdminWorksController` now delegates `POST`, `PUT`, `DELETE`

### Net effect

- Public **read** paths already used MediatR
- Admin **read** paths now use MediatR
- Admin **write** paths now also use MediatR command handlers

This leaves the API much more cleanly aligned with a CQRS-style split where controllers primarily translate HTTP concerns and the application layer owns use-case execution.

## M5 validation-pipeline completion notes

### Scope

- Removed manual controller-side validator usage for admin write endpoints
- Added command validators for MediatR write commands
- Added a global `ValidationExceptionFilter` so pipeline validation failures return `400 ValidationProblemDetails`

### Validation pipeline changes

- New global filter:
  - `Infrastructure/Validation/ValidationExceptionFilter.cs`
- Controllers no longer manually call `ValidateAsync(...)` for:
  - pages update
  - blog create/update
  - work create/update
- Validation now lives beside commands:
  - `Application/Admin/CreateBlog/CreateBlogCommandValidator.cs`
  - `Application/Admin/UpdateBlog/UpdateBlogCommandValidator.cs`
  - `Application/Admin/CreateWork/CreateWorkCommandValidator.cs`
  - `Application/Admin/UpdateWork/UpdateWorkCommandValidator.cs`
  - `Application/Admin/UpdatePage/UpdatePageCommandValidator.cs`
  - `Application/Admin/UpdateSiteSettings/UpdateSiteSettingsCommandValidator.cs`

### Cleanup

- Removed the now-obsolete controller-request validators:
  - `Controllers/Models/SaveBlogRequestValidator.cs`
  - `Controllers/Models/SaveWorkRequestValidator.cs`
  - `Controllers/Models/UpdatePageRequestValidator.cs`
- `RequestValidatorTests` now assert command-validator behavior instead of request DTO validator behavior

### Verification

- `npm run lint`
- `npm run typecheck`
- `npx vitest run --pool=threads`
- `npm run build`
- `docker run --rm -v "$PWD/backend:/src" -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet test tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj`

All passed for the validation-pipeline completion pass.

## M5 service/boundary tightening notes

### Scope

- Kept the MediatR read/write handler structure from the earlier M5 passes
- Replaced direct `PortfolioDbContext` usage inside admin handlers with **application-facing service ports**
- Implemented those ports in infrastructure so the application layer no longer depends directly on EF Core for the admin slice

### Added application-facing ports

- `Application/Admin/Abstractions/IAdminDashboardService.cs`
- `Application/Admin/Abstractions/IAdminPageService.cs`
- `Application/Admin/Abstractions/IAdminSiteSettingsService.cs`
- `Application/Admin/Abstractions/IAdminBlogService.cs`
- `Application/Admin/Abstractions/IAdminWorkService.cs`

### Added infrastructure implementations

- `Infrastructure/Persistence/Admin/AdminDashboardService.cs`
- `Infrastructure/Persistence/Admin/AdminPageService.cs`
- `Infrastructure/Persistence/Admin/AdminSiteSettingsService.cs`
- `Infrastructure/Persistence/Admin/AdminBlogService.cs`
- `Infrastructure/Persistence/Admin/AdminWorkService.cs`

### Supporting type cleanup

- Added `Application/Admin/Support/AdminActionResult.cs`
- Continued using named mutation result types to avoid opaque boolean/anonymous return values

### Net effect

- Controllers -> MediatR commands/queries
- Handlers -> admin service ports
- Infrastructure services -> `PortfolioDbContext`

That is a materially stricter application/persistence boundary for the admin CQRS slice.

## Public query boundary tightening notes

### Scope

- Applied the same separation pattern to the public query side
- Public query handlers no longer depend directly on `PortfolioDbContext`
- Instead they depend on application-facing public service ports, with infrastructure implementations performing EF Core access

### Added public service ports

- `Application/Public/Abstractions/IPublicHomeService.cs`
- `Application/Public/Abstractions/IPublicPageService.cs`
- `Application/Public/Abstractions/IPublicSiteService.cs`
- `Application/Public/Abstractions/IPublicBlogService.cs`
- `Application/Public/Abstractions/IPublicWorkService.cs`

### Added infrastructure implementations

- `Infrastructure/Persistence/Public/PublicHomeService.cs`
- `Infrastructure/Persistence/Public/PublicPageService.cs`
- `Infrastructure/Persistence/Public/PublicSiteService.cs`
- `Infrastructure/Persistence/Public/PublicBlogService.cs`
- `Infrastructure/Persistence/Public/PublicWorkService.cs`

### Net effect

- Public handlers -> public service ports
- Admin handlers -> admin service ports
- Infrastructure services -> `PortfolioDbContext`

At this point both public and admin application handlers are separated from EF Core persistence concerns in a consistent way.

## M6 runtime verification notes

### Commands run

- `docker compose up -d --build frontend backend nginx`
- targeted browser regression sweep:
  - `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/admin-blog-edit.spec.ts tests/admin-home-image-validation.spec.ts tests/admin-pages-validation.spec.ts tests/admin-resume-upload.spec.ts tests/admin-work-validation.spec.ts tests/public-admin-affordances.spec.ts tests/resume.spec.ts --workers=1`
- `./scripts/db-load-smoke.sh`
- `BASE_URL=http://localhost ./scripts/backend-http-smoke.sh`
- `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/auth-security-browser.spec.ts --workers=1`

### Measured timings

- Public read (`GET /api/public/home`, 10 samples)
  - avg: **4.26 ms**
  - max: **5.60 ms**
  - failure rate: **0%**
- Auth/session (`GET /api/auth/session`, 5 samples)
  - avg: **4.87 ms**
  - max: **5.13 ms**
  - failure rate: **0%**
- Admin write (`PUT /api/admin/site-settings`, 5 samples with CSRF)
  - avg: **10.85 ms**
  - max: **14.61 ms**
  - failure rate: **0%**

### Runtime findings

- targeted Playwright regression sweep passed:
  - **10 passed**
- DB smoke passed for create/update/constraint-failure checks
- HTTP smoke passed for public and admin read loops
- Browser auth-security verification passed
- No observed failures under the bounded smoke load

### Safe runtime fix applied

- `nginx/default.conf` now sets:
  - `client_max_body_size 25m;`

This keeps nginx aligned with the backend upload size limit and avoids a hidden proxy-side cap for media uploads.

## Known Issues
- The broad full-suite coverage gate is now above the requested 95% threshold, but a few individual branch-heavy files still sit below 100% (`PageEditor`, `ResumeEditor`, `WorkEditor`, `auth.ts`).
- `test:coverage:m3` remains the faster focused gate for helper/editor hardening, while `test:coverage` is the verified whole-frontend regression snapshot.

## M5.6 / M5.7 Playwright auth-lane notes

### Fixture split

- `playwright.config.ts` now runs three explicit lanes:
  - `chromium-public`
  - `chromium-authenticated`
  - `chromium-runtime-auth`
- `chromium-authenticated` uses one shared seeded storage state:
  - `test-results/playwright/admin-storage-state.json`
- `tests/helpers/global-setup.ts` now refreshes that state before the suite by:
  - waiting for `/login`
  - calling `/api/auth/test-login`
  - verifying `/api/auth/session`
  - writing the storage-state artifact
- Login/logout/auth-transition specs stay on the runtime-auth lane and continue using explicit browser login steps.

### Migration-completeness check

- Authenticated-lane specs should use storage state and should not keep legacy shortcut bootstraps.
- Useful repo check:
  - `rg -n "loginAsLocalAdmin|test-login|Continue as Local Admin" tests --glob '*.spec.ts'`
- Expected result after the split:
  - runtime-auth specs still match
  - authenticated specs do not

### De-flake fixes

- `tests/admin-input-exceptions.spec.ts` now forces the backend failure only for the `POST /api/admin/blogs` submit path, instead of poisoning unrelated blog requests during page load.
- `tests/admin-redirect.spec.ts` is no longer captured by the authenticated lane.
- `backend/src/Portfolio.Api/Controllers/AuthController.cs` now limits only the login entry points (`/api/auth/login`, `/api/auth/test-login`) instead of every auth endpoint.

### Why the production-grade rate-limit scope change was needed

- Public and admin SSR pages call `/api/auth/session` as part of normal rendering.
- Treating `/api/auth/session` like a login endpoint caused legitimate page navigation to receive `429` responses under browser regression load.
- `fetchServerSession()` treats non-OK responses as unauthenticated, so the suite could randomly land on:
  - login screens for admin pages
  - public pages without admin affordances
- The limiter now stays at the original ceiling, but it only protects the actual login/bootstrap endpoints instead of every auth read path.


## Current protocol-verification status

- The plain-HTTP runtime path is verified through `nginx/default.conf` on `http://localhost`.
- The local HTTPS reverse-proxy path is also now verified through:
  - `nginx/local-https.conf`
  - `docker-compose.https.yml`
  - `scripts/setup-local-https.sh`
  - `scripts/run-local-https.sh`
- HTTPS-specific evidence now covers:
  - backend health on `https://localhost`
  - anonymous session response on `https://localhost`
  - secure-cookie issuance on `/api/auth/test-login`
  - Google redirect callback path at `https://localhost/api/auth/callback`
  - browser auth affordance checks on `PLAYWRIGHT_BASE_URL=https://localhost`
- Trust-store validation is still environment-specific: this pass proves self-signed local TLS behavior via controlled localhost-only bypasses, not a general CA-trust guarantee for every shell/runtime.

## Remaining Work (post-M6.1)

1. Decide whether `tests/manual-auth.spec.ts` should remain skipped, move to a dedicated manual suite, or be removed.
2. Remove the `Newtonsoft.Json 9.0.1` advisory debt.
3. If full trust-store proof is required, add a separate follow-up for non-bypassed certificate validation in this shell/runtime (today the completed evidence is limited to self-signed local TLS behavior plus browser/proxy/cookie semantics).


## M6.1 local HTTPS self-signed verification notes

### Commands run

- `./scripts/setup-local-https.sh`
- `NGINX_DEFAULT_CONF=./nginx/local-https.conf docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build`
- `curl -ksS -D - -o /dev/null https://localhost/api/health`
- `curl -ks https://localhost/api/auth/session`
- `curl -ksS -D - -o /dev/null "https://localhost/api/auth/test-login?email=admin@example.com&returnUrl=%2Fadmin%2Fdashboard"`
- `curl -ksS -D - -o /dev/null "https://localhost/api/auth/login?returnUrl=%2Fadmin"`
- `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=https://localhost npx playwright test tests/auth-login.spec.ts tests/public-admin-affordances.spec.ts --workers=1`

### HTTPS findings

- `https://localhost/api/health` responded `200 OK` through `nginx/local-https.conf`.
- `https://localhost/api/auth/session` returned `{"authenticated":false}` for an anonymous request over HTTPS.
- `GET /api/auth/test-login` over HTTPS returned `302` and issued `portfolio_auth_dev` with:
  - `secure`
  - `httponly`
  - `samesite=lax`
- `GET /api/auth/login?returnUrl=%2Fadmin` over HTTPS redirected to Google with:
  - `redirect_uri=https://localhost/api/auth/callback`
  - secure nonce/correlation cookies scoped to `/api/auth/callback`
- HTTPS browser verification passed:
  - `auth-login.spec.ts`
  - `public-admin-affordances.spec.ts`
  - **4 passed** total on `PLAYWRIGHT_BASE_URL=https://localhost`

### HTTPS-specific test harness adjustment

- `tests/helpers/global-setup.ts` now writes storage state to `test-results/playwright/admin-storage-state.json` (ignored/generated) and uses Playwright `request.newContext({ ignoreHTTPSErrors: true })` for localhost base URLs when the local stack is served with self-signed TLS.
- `playwright.config.ts` now sets `ignoreHTTPSErrors` automatically for localhost base URLs so `http://localhost` can still survive a redirect into the HTTPS local stack.
- This keeps the self-signed local TLS path testable without weakening runtime cookie/security behavior or rewriting a tracked auth artifact.
