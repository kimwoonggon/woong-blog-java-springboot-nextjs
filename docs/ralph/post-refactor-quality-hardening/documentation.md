# Documentation

_Last updated: 2026-03-24T10:45:00+09:00_

**Current milestone**: M1

## How to Run
1. Start the supported full stack:
   - `docker compose up -d --build`
2. Check backend health:
   - `curl -fsS http://localhost/api/health`
3. Run the frontend checks:
   - `npm run test -- --run && npm run lint && npm run typecheck && npm run build`
4. Run backend tests:
   - `docker run --pull=never --rm -v "$PWD/backend:/src" -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet test tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj`
5. Run DB/runtime smoke:
   - `./scripts/db-load-smoke.sh`
6. Run bounded backend HTTP smoke:
   - `./scripts/backend-http-smoke.sh`
7. Run browser stack regression:
   - `npm run test:e2e:stack`
8. Review the reporting matrix:
   - `docs/ralph/post-refactor-quality-hardening/verification-matrix.md`

## How to Demo
1. Boot the full stack and confirm `/api/health` is green.
2. Visit `/login`, `/admin`, and confirm admin gating works.
3. In admin, modify representative content (page/site-settings/work/blog or upload flow).
4. Verify the backend accepted the change and the DB-backed UI reads it back.
5. Visit the public page that consumes that content and confirm readback.
6. Run the broad verification chain and record pass/fail evidence.

## Decisions Log
| Timestamp | Milestone | Decision | Reasoning |
|-----------|-----------|----------|-----------|
| 2026-03-24T10:15:00+09:00 | M1 | Keep the quality sweep compose-first | Auth/admin/upload verification must match the real runtime path, not frontend-only assumptions. |
| 2026-03-24T10:15:00+09:00 | M1 | Treat DB/schema review as a first milestone, not an implicit backend detail | Later logic/e2e proofs are weaker if persistence assumptions are unverified. |
| 2026-03-24T10:15:00+09:00 | M3 | Use bounded local load/resilience checks instead of heavyweight tooling first | The goal is fast regression detection on developer machines, not full production benchmarking. |
| 2026-03-24T10:15:00+09:00 | M4 | Keep upload/download and failure-path tests as first-class breadth requirements | Refactors often regress media and edge-case paths before obvious happy paths. |

## Known Issues
- `tests/manual-auth.spec.ts` is still a manual/skip path for real external-provider login.
- Backend test restore currently emits `NU1903` for `Newtonsoft.Json 9.0.1`.
- `backend-http-smoke.sh` is intentionally a **bounded local compose-runtime smoke** path, not a production-grade load benchmark.
