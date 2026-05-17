# Spring Boot Migration Final Parity Audit - 2026-05-17

## Scope

This audit covers the final local parity pass for replacing the ASP.NET Core backend with the Java 21 Spring Boot backend while preserving the existing Next.js frontend, Docker/nginx topology, API behavior, and browser workflows.

## Changed

- Replaced the backend runtime with Spring Boot 3.5.x, Java 21, Maven, Spring MVC, Flyway, PostgreSQL JDBC persistence, Spring Security session auth, OAuth2 login handoff, CSRF validation, security headers, health checks, media handling, diagnostics, and admin/public API endpoints.
- Preserved the existing frontend API contracts for public content, admin content, auth, site settings, media uploads, work videos, AI fix flows, batch AI flows, and Docker/nginx routing.
- Added CQRS-style application handlers for AI and media/work-video flows without adding a mediator library.
- Updated Docker, nginx, compose, runtime scripts, environment examples, and GitHub Actions from ASP.NET Core/.NET to Spring Boot/Maven while keeping the repository git-flow shape.
- Added and expanded backend parity tests, architecture tests, SQL contract tests, frontend Vitest coverage, and Playwright browser coverage for the migration gaps found during validation.
- Fixed final parity gaps found by exhaustive Docker-dev Playwright runs: loopback CORS, local test-login hardening, public detail context, admin detail mappers, work-video upload/confirm separation, WorkVideos `CreatedAt`, HLS preview generation, work-video reorder conflicts, content-image thumbnail fallback, admin page/list behavior, footer social key compatibility, stale public settings fetches, page-editor legacy title saves, pagination stability, and uploaded-video thumbnail persistence waits.

## Intentionally Not Changed

- The Next.js app remains the existing App Router frontend; only migration-related contract, stability, and test adjustments were made.
- Historical docs under older migration/evidence folders remain historical records and were not rewritten except where current tests required restored evidence artifacts.
- Google OAuth2 still requires real production client ID/secret/redirect configuration outside the repository.
- AI provider behavior remains a deterministic compatibility implementation for local/runtime parity, not a full external long-running provider pipeline.
- Local Docker data volumes, temporary validation containers, and generated Playwright artifacts are not part of the product code changes.

## Goal Verification

- The Spring Boot backend exposes the migrated `/api/*` and `/media/*` behavior behind the existing Docker/nginx topology.
- The frontend builds and runs against `INTERNAL_API_ORIGIN=http://backend:8080`.
- Local Docker-dev validation used `http://127.0.0.1:13000` through nginx, matching the required dev-branch validation path.
- Behavior gaps discovered during exhaustive Playwright runs were fixed with focused tests first where feasible, then verified with targeted backend/frontend/browser runs before the final gates.
- The final local state is ready to publish to `dev` for GitHub Actions verification, then promote to `main` after `dev` CI passes.

## Validations Performed

- Backend full suite: Docker Java 21 Maven run passed with `./mvnw -q clean -Dtestcontainers.enabled=false test` against clean Postgres `wb-final-test-db-20260517`.
- Frontend lint: `npm run lint` passed with 5 existing warnings.
- Frontend typecheck: `npm run typecheck` passed.
- Frontend production build: `npm run build` passed.
- Frontend unit suite: `npm test -- --run` passed with 95 files and 659 tests.
- Docker-dev stack: backend, frontend, db, and nginx ran with loopback-bound ports; backend and nginx health checks returned 200.
- Playwright readiness: Docker-dev readiness suite passed against `http://127.0.0.1:13000`.
- Playwright exhaustive: `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:13000 npm run test:e2e:exhaustive` passed with 603 passed and 9 skipped.
- Focused browser reruns passed for runtime auth, public detail, public work inline edit, admin work auto-thumbnail, admin work-video edit, residual overflow/admin/home/footer/video/accessibility/visual slices, page-editor/page-save/pagination slices, and existing-work uploaded-video thumbnail persistence.
- Targeted backend parity reruns passed for AI validation, admin blog/work detail mappers, test-login policy, public detail context, WorkVideos `CreatedAt`, content-image thumbnail fallback, work-video reorder, admin page/list behavior, HLS metadata, and site-settings GitHub key compatibility.
- CI script checks: shell syntax checks passed for backend CI helper scripts, and backend web-test coverage was added to the Java CI workflow shape.

## Risks And Yellow Flags

- GitHub-hosted CI was still pending at the moment this audit artifact was generated because the repository branch did not yet exist remotely.
- The final Docker-dev stack used alternate local ports because default ports were occupied: backend `18080`, nginx HTTP `13000`, nginx HTTPS `13001`.
- Temporary validation containers/networks may remain on the local Docker host if not manually cleaned.
- The exhaustive Playwright suite has 9 intentional skips; these should remain visible in future runs.
- Production OAuth and secret configuration must be supplied outside the repository before real Google login can be used.

## Recommendation

Commit this migration state, push it to `dev`, verify GitHub CI on the pushed commit, then promote the same verified commit to `main` and verify `main` CI.
