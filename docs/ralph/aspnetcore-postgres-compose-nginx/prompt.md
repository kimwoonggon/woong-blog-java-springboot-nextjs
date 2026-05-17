# React/TypeScript + Next.js frontend with ASP.NET Core (.NET 10) and PostgreSQL

## Goals
- Make the frontend architecture explicit: React + TypeScript as the UI base, delivered through Next.js so SEO-sensitive pages can keep SSR/metadata benefits.
- Move application data access to an ASP.NET Core (.NET 10) backend backed by PostgreSQL from the start, rather than treating PostgreSQL as a later migration target.
- Allow the new backend/data layer to start from table-based mock or seed data so delivery can begin before full data migration/import is complete.
- Keep the current public UI, admin UI, routes, and overall visual system intact while the data/backend architecture changes underneath.
- Keep the current login experience simple on the web frontend, but move the actual authentication flow, callback handling, session issuance, and authorization enforcement into ASP.NET Core.
- Run frontend, backend, and database together via Docker Compose and front them with Nginx routing.
- Make TDD the default implementation path: test scaffolding first, failing tests first, then production code.
- Produce a grounded improvement plan for the current admin/non-admin UX split without requiring a visual rebrand.
- Expand upload planning beyond profile images so blog/work media flows are explicitly migrated and tested.
- Review the ASP.NET Core backend for object-oriented design quality (layering, responsibilities, SOLID-style pressure points) as part of the migration hardening work.
- Preserve room for future authentication/security extensions (provider growth, stronger authorization, auditability, session hardening) without re-architecting the app later.
- Maximize Next.js SEO outcomes by auditing which routes should stay SSR/metadata-first and which behaviors can remain CSR-only without hurting discoverability.
- Reduce avoidable nullable usage in C# request/response/application surfaces and show explicit user-facing error states when data is missing or null-derived failures occur.
- Heavily prioritize admin reliability through extreme-input, regression, integration, unit, E2E, and DB correctness/load coverage.
- Add a concrete plan to reduce ASP.NET Core Docker image size and runtime footprint.

## Non-Goals
- Rebranding or redesigning the public site.
- Building a token-heavy SPA auth flow where the browser owns long-lived API credentials.
- Rewriting the Tiptap editor, AI assist workflows, or content model semantics.
- Converting the app into a microservice system.
- Waiting for a full historical data import before the new PostgreSQL-backed app can run.

## Hard Constraints
- Frontend must remain React + TypeScript based and use Next.js for SEO-sensitive/public delivery.
- Backend runtime must be ASP.NET Core.
- Backend target runtime is .NET 10.
- Backend application pattern must follow ASP.NET Core MVC with EF Core for persistence, MediatR for application request handling, and FluentValidation for validation.
- Primary application database must migrate to local PostgreSQL running in Docker Compose.
- The new PostgreSQL-backed app may start from table-based mock/seed data; this is acceptable and planned.
- Frontend, backend, and database must be runnable together behind Nginx.
- Nginx routing contract is fixed as: `/api/auth/*` → ASP.NET Core auth/BFF endpoints, `/api/*` → ASP.NET Core application APIs, `/media/*` → ASP.NET Core/local asset path, everything else → Next.js.
- Authentication must be backend-owned: ASP.NET Core handles OAuth/OIDC, callback processing, session issuance, and authorization checks.
- The browser-facing auth model should prefer HttpOnly cookie/session semantics over frontend-managed bearer-token ownership.
- Existing UI and route structure must remain usable during and after cutover.
- The existing content entities and fields currently used by the UI must remain supported: `profiles`, `assets`, `site_settings`, `pages`, `works`, `blogs`, and `page_views`.
- Image/media support must account for profile/home images, work thumbnails/icons/inline media, and blog covers/inline media where the UI expects them.
- Current public pages only render published content, so draft preview must be solved inside admin rather than by exposing draft public routes.
- Korean/Unicode slug behavior currently used by works/blog creation must remain supported.
- TDD is mandatory: implementation work must establish and use automated tests rather than treating tests as cleanup.
- Verification must include unit tests, integration tests, and browser-level regression coverage with Playwright for critical user flows.
- Verification must also include DB correctness/error-path/load smoke coverage, especially for PostgreSQL write paths used by admin flows.
- Admin surfaces are the highest-risk area and must receive deeper validation than public read-only pages.
- New or changed user-facing flows should prefer explicit error presentation over silent null fallbacks.

## Deliverables
- Next.js frontend plan clarified as the React + TypeScript delivery surface for public/admin pages.
- ASP.NET Core (.NET 10) backend project skeleton and target API boundary.
- ASP.NET Core MVC backend foundation using EF Core + MediatR + FluentValidation.
- PostgreSQL schema + seed/mock data strategy aligned to the current portfolio content model.
- Docker Compose + Nginx topology for local development and integrated routing.
- ASP.NET Core BFF-style auth/session design covering login start, callback, logout, and admin authorization.
- Frontend adoption plan from direct Supabase DB access to backend API access.
- Test strategy covering frontend, backend, contracts, and compose/runtime smoke checks.
- Test strategy covering unit, integration, Playwright-based regression testing, DB load/error validation, and explicit upload/download verification.
- Admin workflow improvement proposal covering shared workspace shell, grouped content IA, and in-context preview.
- SSR/CSR/metadata audit describing how public/admin routes should be rendered for SEO and operational safety.
- Nullability reduction and explicit error-handling plan for backend/frontend data flows.
- Docker image-size optimization plan for the ASP.NET Core service.
- Media-upload migration/test plan covering profile, work, and blog images.
- Backend object-oriented design review with remediation guidance.
- Auth/security extensibility review for future providers, authorization growth, and audit/session hardening.

## Done When
- [ ] `docker compose up --build` can boot Nginx, frontend, backend, and PostgreSQL together.
- [ ] Nginx serves the existing Next.js app on `/`, proxies `/api/auth/*` and `/api/*` to ASP.NET Core, and exposes local assets on `/media/*`.
- [ ] Public visitors can browse the existing site with data served from PostgreSQL-backed ASP.NET Core APIs.
- [ ] Admin users can sign in through an ASP.NET Core-owned auth flow and continue to create/update/delete pages, works, blogs, and uploads.
- [ ] Admin login works end-to-end in the browser.
- [ ] An admin can create or publish a post from the UI.
- [ ] A published post is retrievable from the public UI after publishing.
- [ ] All primary public/admin menus are visible and working.
- [ ] The app can run against seeded/mock PostgreSQL tables before real migrated data is imported.
- [ ] The frontend no longer depends on Supabase as the primary application database path.
- [ ] Frontend and backend test suites exist and are used as part of milestone validation.
- [ ] Unit tests, integration tests, Playwright regression tests, and DB load/correctness checks are all part of milestone validation.
- [ ] A concrete, phased admin UX improvement plan is documented and scoped.
- [ ] Admin routes tolerate extreme input values (special characters, Korean text, empty values, validation failures) with explicit user-visible outcomes.
- [ ] Frontend image upload flows are browser-tested, including success and failure behavior.
- [ ] PDF upload and PDF download flows are both browser-tested.
- [ ] Avoidable `?`/nullable usage in C# request and application surfaces is reduced, and remaining nullable cases are intentional.
- [ ] SEO-sensitive public routes have a documented SSR/metadata strategy and do not accidentally regress to low-SEO CSR-only behavior.
- [ ] Image upload flows for profile/home, work, and blog media are explicitly planned and regression-tested where supported by the UI.
- [ ] Backend object-oriented design review is documented with concrete follow-up recommendations.
- [ ] Future auth/security extension points are documented so stronger authn/authz/session/audit features can be added without major rework.
