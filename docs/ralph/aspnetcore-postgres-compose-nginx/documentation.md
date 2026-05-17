# Documentation

_Last updated: 2026-03-24T09:35:00+09:00_

**Current milestone**: M9

## How to Run
1. Prepare environment variables for:
   - Next.js frontend (React + TypeScript)
   - ASP.NET Core (.NET 10) backend
   - local PostgreSQL connection
   - OAuth/OIDC client settings used by ASP.NET Core auth
   - any storage/backend asset settings still needed in the current implementation slice
2. Start the integrated stack:
   - `docker compose up --build`
3. Access through Nginx:
   - Public/admin frontend: `http://localhost/`
   - ASP.NET Core auth endpoints: `http://localhost/api/auth/*`
   - ASP.NET Core application APIs: `http://localhost/api/*`
   - Local media path: `http://localhost/media/*`
   - Health check: `http://localhost/api/health`
4. Admin login UI remains available at `/login`, but the actual auth flow is handled by ASP.NET Core.

## How to Demo
1. Open `http://localhost/` and confirm the public home page loads through Nginx.
2. Visit `/works`, `/blog`, `/introduction`, `/contact`, and `/resume` and confirm content is served correctly.
3. Open `/login` and sign in through the ASP.NET Core-owned auth flow.
4. Confirm admin-only access still redirects non-admins away from `/admin`.
5. In admin, edit one page, one work, and one blog entry and save successfully.
6. Verify the public site reflects published content from the local PostgreSQL-backed backend.
7. Open the improved admin preview flow and inspect an unpublished or draft item without requiring it to be public.
8. Run admin-focused extreme-input tests and DB smoke/load checks before calling the stack healthy.

## Request Flow

### Public page render
1. Browser requests a page from Next.js through Nginx.
2. Next.js renders the page and calls ASP.NET Core for content data.
3. ASP.NET Core applies business rules and queries PostgreSQL.
4. ASP.NET Core returns DTOs to Next.js.
5. Next.js renders the response for the browser.

### Admin authenticated request
1. Browser opens the Next.js admin UI.
2. If authentication is required, the UI sends the user into ASP.NET Core auth endpoints.
3. ASP.NET Core completes auth, issues an HttpOnly session cookie, and redirects back.
4. Subsequent admin API requests go from Next.js/browser to ASP.NET Core.
5. ASP.NET Core validates the session, checks admin authorization, and reads/writes PostgreSQL.

### Content mutation
1. Admin edits content in the Next.js UI.
2. The frontend submits to ASP.NET Core API endpoints.
3. ASP.NET Core validates input, enforces authorization, and persists to PostgreSQL.
4. ASP.NET Core returns success/error state.
5. Next.js refreshes or re-renders the affected page state.

## Locked Product/User Scenarios

### Scenario A — Public visitor browsing unchanged portfolio
1. A visitor opens the public site through Nginx.
2. The visitor navigates Home, Works, Blog, Introduction, Contact, and Resume.
3. The system renders the same route structure and visual UI as today.
4. The system fetches published content through the ASP.NET Core backend from local PostgreSQL.
5. If backend or DB is unavailable, the frontend surfaces a safe failure state instead of silently rendering stale or empty content.

### Scenario B — Admin authenticates and manages content
1. An admin opens `/login` and starts sign-in from the Next.js login screen.
2. ASP.NET Core completes the OAuth/OIDC callback, issues the session cookie, and routes the admin into `/admin`.
3. The admin can browse dashboard, pages, works, and blog screens with the same visible information architecture initially.
4. When the admin saves edits, the frontend calls the ASP.NET Core backend, which authorizes the request and persists data to local PostgreSQL.
5. If the token is invalid or the user is not admin, the system rejects the request and keeps unauthorized content hidden.

### Scenario C — Admin previews draft content without publishing it
1. An admin edits a work, blog, or page draft.
2. The system shows an in-context preview inside the admin workspace.
3. The preview reflects unpublished changes without exposing them on public published-only routes.
4. If preview data cannot be loaded, the admin sees a clear error state instead of assuming the draft is correct.

### Scenario D — Developer runs full local stack
1. A developer runs `docker compose up --build`.
2. Nginx fronts the frontend and backend in one local entrypoint.
3. PostgreSQL is provisioned locally for application data.
4. Seed/mock table data is loaded so the app can be exercised immediately.
5. Health checks and tests confirm the stack is operational before feature work proceeds.

## Decisions Log
| Timestamp | Milestone | Decision | Reasoning |
|-----------|-----------|----------|-----------|
| 2026-03-23T08:10:00+09:00 | M1 | Keep login UI simple in Next.js but move real auth handling to ASP.NET Core | Frontend can show the login prompt, but authentication authority should live in the backend BFF layer. |
| 2026-03-23T08:10:00+09:00 | M1 | Frontend is explicitly Next.js on top of React + TypeScript | User clarified the frontend stack and wants SEO handled through Next.js rather than an ambiguous frontend posture. |
| 2026-03-23T08:10:00+09:00 | M2 | Backend stack uses ASP.NET Core MVC + EF Core + MediatR + FluentValidation | User explicitly requested a faithful MVC backend with these libraries as the application foundation. |
| 2026-03-23T08:10:00+09:00 | M1 | Validation must include unit, integration, and Playwright regression tests (headless by default; headed/manual only when explicitly required) | User explicitly requires layered automated verification, including browser regression checks. |
| 2026-03-23T08:10:00+09:00 | M1 | Route `/api/auth/*` and `/api/*` to ASP.NET Core, and `/media/*` to local assets | Consolidates auth and application authority in the backend while keeping the frontend focused on UI delivery. |
| 2026-03-23T08:10:00+09:00 | M2 | Start directly on PostgreSQL with seed/mock table data | User prefers immediate PostgreSQL-backed development rather than a transitional DB phase. |
| 2026-03-23T08:10:00+09:00 | M3 | Use ASP.NET Core BFF auth with HttpOnly session cookies | Keeps auth responsibility in the backend and avoids token-heavy frontend ownership. |
| 2026-03-23T08:10:00+09:00 | M3 | Use local volume-backed storage for uploaded media | Removes ambiguity about storage direction and keeps the stack self-hosted except for auth. |
| 2026-03-23T08:10:00+09:00 | M1 | TDD is mandatory for implementation | User explicitly requested test-code-first, TDD-based delivery. |
| 2026-03-23T08:10:00+09:00 | M6 | Improve admin UX with shared workspace shell + in-context preview, not public-site redesign | Current pain is the hard admin/public split and weak preview, not the public brand. |

## UI Improvement Proposal (admin vs non-admin split)

### Observed issues
- Public and admin currently operate as two almost separate products because their shells and workflows fully diverge.
- `/admin/pages` bundles site identity, home, static pages, and resume management into one long scroll surface.
- Editors for Home/Page/Work/Blog repeat the same frame concepts (save, status, timestamps, content area) without a shared workspace shell.
- Public routes render published content only, so “View Public” is not a sufficient preview model for drafts.

### Proposed improvements
1. **Shared admin workspace shell**
   - Keep the existing visual brand.
   - Add consistent editor chrome: breadcrumb/context, save, preview, publish status, last updated.
2. **Group `/admin/pages` into domains**
   - Site Identity
   - Home
   - Pages
   - Resume / Assets
3. **Unify content index patterns**
   - Works and Blog should share one content-management table/list pattern.
4. **Add in-admin preview**
   - Split view or side-by-side preview for drafts.
   - Public “View” remains secondary for already-published items.
5. **Do not redesign the public site**
   - Limit UI work to workflow coherence and preview ergonomics.

## Known Issues
- Current app is tightly coupled to Supabase server/browser clients across public pages, admin pages, server actions, and uploads; cutover requires staged replacement rather than a single swap.
- Current public pages are published-only, so draft preview cannot rely on the existing public route behavior.
- Existing upload/media flow is still coupled to Supabase storage URLs and will need explicit replacement with `/media/*` local asset resolution during cutover.
- Current login page still assumes frontend-owned Supabase auth and will need to become a thin launcher for ASP.NET Core auth endpoints.
- Current repo does not yet expose a frontend test runner script, so M1 must establish the TDD harness before later frontend milestones can validate with `npm run test`.
- Current repo does not yet expose Playwright regression setup, so browser-level regression coverage including backend-frontend-db integrated stack verification must be added before milestones can fully satisfy the new verification bar.

## Additional Quality Gates
- Admin surfaces receive deeper verification than public read-only pages.
- DB verification must include correctness, invalid-write rejection, and basic load smoke.
- Null or missing data should produce explicit errors/empty-state messaging rather than silent misrepresentation.
- Public SEO-sensitive routes should prefer SSR/metadata-first delivery; CSR-only logic should be justified in the SSR/CSR audit.

## SSR / CSR / SEO Audit Focus
- Public routes (`/`, `/works`, `/works/[slug]`, `/blog`, `/blog/[slug]`, `/introduction`, `/contact`, `/resume`) should remain server-rendered or metadata-backed where they affect discoverability.
- Admin routes can remain heavily interactive/CSR-driven, but admin data fetches should still fail loudly and predictably.
- Metadata/title generation should depend on backend data contracts rather than stale frontend-only constants.

## Headless Verification Mode
- Default browser verification now runs headless for automated regression speed and stability.
- Use headed/manual mode only when a flow explicitly requires human interaction (for example real Google sign-in).
- Integrated stack verification should run against the real `frontend + backend + db + nginx` path via `npm run test:e2e:stack`.

## Docker Footprint Audit
- Measure the current ASP.NET Core runtime image size before optimization.
- Review publish options, base image choice, and runtime-layer contents to remove unnecessary weight.
- Re-verify backend/frontend/db integration after any image-size optimization.

### Current findings
- Current backend runtime image measures **190MB** (`docker images | grep '^woong-blog-backend:'` on 2026-03-24).
- `backend/Dockerfile` now uses an Alpine multi-stage flow: `mcr.microsoft.com/dotnet/sdk:10.0-alpine` for build and `mcr.microsoft.com/dotnet/aspnet:10.0-alpine` for runtime.
- The runtime image copies only `/app/publish` from the build stage, so source, test projects, and SDK tooling are excluded from the final runtime layer.
- `docker-compose.yml` keeps PostgreSQL internal to the compose network instead of publishing `5432` to the host by default. This avoids local port collisions during Ralph verification and reduces unnecessary host exposure while keeping `docker compose exec db ...`-based smoke checks intact.

## Upload / Download Verification Focus
- Home/profile image upload must be verified from the admin UI through to public rendering.
- Resume PDF flow must be verified in both directions: admin upload and public download.
- Failure paths for uploads (invalid file type, backend rejection) must surface explicit UI feedback.
- These upload/download checks are part of the default regression bar, not optional extras.

## Media Migration Audit
- Inventory every frontend media dependency: profile/home image, work thumbnails/icons/inline media, blog covers/inline media, and resume PDF.
- Verify each one has a backend contract, storage path, and browser regression rather than assuming the flow is covered by another upload test.
- Prefer explicit failure messages when a media dependency is missing instead of silent placeholder success.

### Current contract coverage
- **Home/profile image**
  - Admin upload path: `src/components/admin/HomePageEditor.tsx` → `POST /api/uploads` with `bucket=public-assets`
  - Public render path: home DTO/read path via backend-backed home fetch
  - Regression: `tests/admin-home-image-upload.spec.ts`, `tests/admin-home-image-validation.spec.ts`
- **Work thumbnail/icon**
  - Domain contract already existed on `Work.ThumbnailAssetId` / `Work.IconAssetId` (`backend/src/Portfolio.Api/Domain/Entities/Work.cs`)
  - Public read path resolves both asset URLs in `GetWorksQueryHandler` and `GetWorkBySlugQueryHandler`
  - Admin write/read path now persists and rehydrates both asset IDs in `backend/src/Portfolio.Api/Controllers/AdminWorksController.cs`
  - Admin upload UI now lives in `src/components/admin/WorkEditor.tsx`
  - Regression: `backend/tests/Portfolio.Api.Tests/AdminContentEndpointsTests.cs` (`CreateAndReadWork_PersistsUploadedThumbnailAndIcon`) and `tests/admin-work-image-upload.spec.ts`
- **Blog media**
  - Admin inline image upload path uses the shared uploads API from the editor surface (`src/components/admin/TiptapEditor.tsx`)
  - Browser regression: `tests/admin-blog-image-upload.spec.ts`, `tests/admin-blog-image-validation.spec.ts`
- **Resume PDF**
  - Admin upload path: `src/components/admin/ResumeEditor.tsx`
  - Public download/readback regression: `tests/admin-resume-upload.spec.ts`, `tests/admin-resume-validation.spec.ts`, `tests/resume.spec.ts`

### Remaining nuance
- Public work list/detail routes currently render the thumbnail contract explicitly; icon coverage is preserved in the backend/public DTO contract and admin readback, but public UI usage remains available for future design expansion rather than mandatory visible rendering today.

## Backend OO / Security Extensibility Audit
- Review controller responsibilities, handler boundaries, DTO/entity separation, and coupling between web, application, and persistence layers.
- Record where SOLID-style pressure exists and whether it needs a code fix, test guard, or documented follow-up.
- Document future auth/security extension points: additional IdPs, role/permission growth, audit/event logging, secret rotation, stricter session controls, and secure media access if needed later.

### Architecture review
- **Strongest current boundary**
  - Public read paths are the cleanest layer boundary in the codebase. `Program.cs` wires MediatR + FluentValidation pipeline behavior, and `backend/src/Portfolio.Api/Application/Public/**` maps persistence entities into explicit DTOs before returning them to the web layer.
  - This keeps public query behavior relatively thin and testable, especially for works/blogs/pages/home/resume read models.
- **Primary pressure point**
  - Admin mutation controllers still talk directly to `PortfolioDbContext` and each controller repeats content-specific responsibilities such as slug generation, excerpt generation, JSON parsing/extraction, and timestamp updates.
  - The duplication is most visible across `backend/src/Portfolio.Api/Controllers/AdminBlogsController.cs`, `backend/src/Portfolio.Api/Controllers/AdminWorksController.cs`, and `backend/src/Portfolio.Api/Controllers/AdminPagesController.cs`.
  - Recommendation: move admin writes to command handlers (or a dedicated application service layer) and centralize repeated content transformation logic behind one shared content-mapping utility/service.
- **DTO/entity boundary status**
  - Public application handlers return explicit DTO types (`HomeDto`, `WorkCardDto`, `WorkDetailDto`, etc.), which is a healthy contract boundary.
  - Several admin controllers still return anonymous objects directly from the web layer; that is acceptable for speed, but weaker for long-term API versioning and test clarity.
- **SOLID-style follow-up**
  - `AuthRecorder` is doing coherent auth/session/audit work and is a good candidate to remain the session authority.
  - The next OO cleanup should focus on separating “HTTP concerns” from “content write rules” in admin controllers rather than adding more abstractions to the already-clean read side.

### Auth / security extension points
- **Additional providers**
  - `AuthOptions` already exposes authority/client/scopes/callback settings, so the OIDC entry point is configurable.
  - Current login recording is still Google-shaped in `AuthRecorder` (`Provider = "google"`), so multi-provider support should extract provider identity from configuration/claims instead of hard-coding it in the recorder.
- **Authorization growth**
  - Current authorization is role-claim based (`AdminOnly`) and session validation cross-checks the persisted profile role before trusting the cookie session.
  - This gives a clean stepping stone for future permission sets: add fine-grained claims/permissions at the session/profile layer without rewriting the cookie/session model.
- **Audit logging**
  - `AuthAuditLog` / `AuthSession` persistence already records login success, failure, logout, and revocation-oriented events.
  - Next extension: standardize event vocabulary and add richer correlation metadata so security review and admin forensics can query sessions more effectively.
- **Session hardening**
  - Cookie validation already enforces absolute expiration, sliding expiration, revocation, and role consistency in `AuthRecorder.ValidateSessionAsync`.
  - Next extension: add stronger revocation triggers (for example privilege changes or security-sensitive profile changes), plus optional secure-media authorization if uploads later need to move beyond publicly served assets.
- **Secret/config management**
  - OIDC settings already flow through `AuthOptions`, which is the correct seam for environment-backed secrets.
- Keep production credentials and provider configuration outside committed defaults; prefer environment/secret-store injection and rotate client secrets independently of code deploys.

## Latest Verification Snapshot
- `npm run test -- --run` → **17 passed**
- `npm run lint` → **pass**
- `npm run typecheck` → **pass**
- `npm run build` → **success**
- `docker run --pull=never --rm -v "$PWD/backend:/src" -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet test tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj` → **51 passed** (`NU1903` warning on `Newtonsoft.Json 9.0.1` still present upstream)
- `./scripts/db-load-smoke.sh` → **PASS**
- `npm run test:e2e:stack` → **30 passed, 1 skipped (`manual-auth`)**
- `curl -fsS http://localhost/api/health` → **OK**
