# Verification Matrix — Post-Refactor Quality Hardening

_Last updated: 2026-03-24T10:35:00+09:00_

This matrix is the reporting artifact for the broad quality sweep. It maps each major surface to:
- the user-visible flow,
- the backend/API proof,
- the DB/schema proof,
- the frontend/public readback proof,
- the automation layer that should carry it.

| Surface | Primary user/system flow | Backend/API proof | DB/schema proof | Frontend/public readback proof | Main automation layer |
|---|---|---|---|---|---|
| Auth/session | login → session → admin gate → logout | `AuthController`, `AuthRecorder`, `/api/auth/session` | auth session/profile persistence and revocation checks | `/login`, `/admin`, redirect behavior | backend xUnit + Playwright |
| Site settings | admin updates owner/tagline/socials | `/api/admin/site-settings` success/failure paths | singleton row, nullable/update semantics | home/footer/title readback | backend xUnit + Playwright |
| Static pages | admin updates intro/contact/home content | `/api/admin/pages` validation + persistence | `Pages` JSON/content persistence | `/introduction`, `/contact`, `/` readback | backend xUnit + Playwright |
| Works | admin create/edit/publish work | `/api/admin/works` + public work queries | slug uniqueness, `jsonb`, tags, media asset IDs | `/works`, `/works/[slug]` | backend xUnit + Playwright |
| Blogs | admin create/edit/publish post | `/api/admin/blogs` + public blog queries | slug uniqueness, publish state, content shaping | `/blog`, `/blog/[slug]` | backend xUnit + Playwright |
| Resume/media | upload/delete asset + link to settings | `/api/uploads`, `/api/admin/site-settings` | `Assets` metadata + linked references | `/resume`, media-backed pages | backend xUnit + Playwright |
| Public read model | public pages hit compose/nginx/runtime path | `/api/public/*` query handlers and endpoints | representative seeded/round-trip reads | home/introduction/works/blog/resume | backend xUnit + HTTP smoke + Playwright |
| Compose runtime | nginx → backend/frontend/db live together | `/api/health`, `/api/public/*`, `/api/auth/session` | DB smoke + bounded HTTP repeatability | `/`, `/admin`, key pages | `db-load-smoke.sh` + `backend-http-smoke.sh` |

## Canonical proof chain

```bash
npm run test -- --run && npm run lint && npm run typecheck && npm run build && docker run --pull=never --rm -v "$PWD/backend:/src" -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet test tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj && docker compose up -d --build && ./scripts/db-load-smoke.sh && ./scripts/backend-http-smoke.sh && curl -fsS http://localhost/api/health && npm run test:e2e:stack && docker compose ps
```

## Reporting notes

- `db-load-smoke.sh` proves low-level DB insert/update/reject/cleanup behavior.
- `backend-http-smoke.sh` proves bounded repeated HTTP behavior against the compose runtime.
- Playwright proves browser-visible admin/public behavior.
- Backend xUnit proves controller/query/validator/auth logic without browser noise.
- Final Ralph execution should cite pass/fail evidence per surface, not just command exit codes.
