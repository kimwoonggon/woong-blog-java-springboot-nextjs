# Plans

> **Stop-and-fix rule**: validation 실패 시 다음 마일스톤으로 넘어가지 않는다.

## [ ] M1: Database/schema contract review and persistence guards

Lock the current backend persistence contract before broadening tests. This milestone validates entity shape, `DbContext` mapping, constraints, JSON fields, seed assumptions, and DB-level round trips so later tests build on a stable model.

Dependencies: none
Estimated loops: 1-2

### Allowed Files
- `backend/src/Portfolio.Api/Infrastructure/Persistence/`
- `backend/src/Portfolio.Api/Domain/Entities/`
- `backend/tests/Portfolio.Api.Tests/`
- `scripts/`
- `README.md`
- `ARCHITECTURE.md`

### Acceptance Criteria
- [ ] Tests or scripted checks exist for uniqueness constraints, singleton site settings behavior, JSON field persistence, and representative seeded-content assumptions.
- [ ] At least one test or script verifies schema/persistence behavior for `pages`, `works`, `blogs`, `site_settings`, and `assets`.
- [ ] The schema review explicitly records any mismatch between entity assumptions and test/seed expectations.
- [ ] Test files exist and cover DB constraint rejection and DB-backed round-trip behavior.

### Validation Commands
```bash
docker run --pull=never --rm -v "$PWD/backend:/src" -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet test tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj && docker compose up -d db && ./scripts/db-load-smoke.sh && docker compose exec -T db psql -U portfolio -d portfolio -c '\dt' && docker compose down
```

## [ ] M2: C# backend logic and auth/upload/application-path hardening

Broaden backend logic coverage around authentication/session state, admin endpoints, public query handlers, uploads, validators, and failure cases so silent backend regressions are caught before browser-level issues appear.

Dependencies: M1
Estimated loops: 1-2

### Allowed Files
- `backend/src/Portfolio.Api/Controllers/`
- `backend/src/Portfolio.Api/Application/`
- `backend/src/Portfolio.Api/Infrastructure/Auth/`
- `backend/tests/Portfolio.Api.Tests/`
- `scripts/`

### Acceptance Criteria
- [ ] Auth/session tests cover login launch, session inspection, logout, invalid session rejection, and at least one non-admin rejection path.
- [ ] Upload tests cover success, delete, invalid input, and at least one persistence/readback assertion.
- [ ] Public query handler or endpoint coverage exists for all main public content surfaces: home, pages, works, blogs, and resume.
- [ ] Admin mutation coverage exists for pages, site settings, works, and blogs, including failure/status-code assertions.
- [ ] Test files exist and cover silent-failure-sensitive paths where the API could return success but shape incorrect data.

### Validation Commands
```bash
docker compose up -d db backend frontend nginx && docker run --pull=never --rm -v "$PWD/backend:/src" -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet test tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj && curl -fsS http://localhost/api/health
```

## [ ] M3: Backend load, runtime resilience, and compose-path verification

Add a bounded local load/resilience pass that tests the supported compose runtime rather than isolated process assumptions. The goal is not production benchmarking; it is to catch obvious throughput, boot-order, and repeated-request failures after refactoring.

Dependencies: M1, M2
Estimated loops: 1-2

### Allowed Files
- `scripts/`
- `docker-compose.yml`
- `nginx/default.conf`
- `backend/src/Portfolio.Api/`
- `backend/tests/Portfolio.Api.Tests/`
- `README.md`
- `ARCHITECTURE.md`

### Acceptance Criteria
- [ ] `scripts/backend-http-smoke.sh` exists and documents/requests a bounded repeated-request path for the compose runtime.
- [ ] A locally safe load/resilience script or test path exists for repeated backend/API requests under the compose stack.
- [ ] The load/resilience path defines explicit bounds (duration, request count, target endpoints) so it is safe for dev machines.
- [ ] Boot-order/runtime checks cover `frontend`, `backend`, `db`, and `nginx` interaction, not just isolated containers.
- [ ] At least one verification artifact proves repeated read/write or repeated authenticated access does not obviously degrade into 5xx/timeout behavior.
- [ ] Test or script files exist and cover the supported compose runtime instead of frontend-only assumptions.

### Validation Commands
```bash
docker compose up -d --build && curl -fsS http://localhost/api/health && ./scripts/db-load-smoke.sh && ./scripts/backend-http-smoke.sh && docker compose ps
```

## [ ] M4: Frontend page breadth and admin/public functional sweep

Expand frontend unit and Playwright coverage so the refactored stack is validated from the user perspective across public pages, admin pages, detail pages, and upload/download behaviors.

Dependencies: M2, M3
Estimated loops: 2-3

### Allowed Files
- `tests/`
- `src/test/`
- `src/app/(public)/`
- `src/app/admin/`
- `src/components/admin/`
- `src/lib/api/`
- `playwright.config.ts`
- `README.md`

### Acceptance Criteria
- [ ] Browser coverage explicitly includes public home, works index/detail, blog index/detail, introduction, contact, and resume.
- [ ] Browser coverage explicitly includes admin dashboard, pages, works, blog, login redirect, and at least one edit/create path per major content type.
- [ ] Unit tests cover at least one frontend API helper or error-state path for each major frontend slice touched by the quality sweep.
- [ ] Upload/download regressions remain first-class: image upload, image failure, resume upload/delete/download, and media-backed page render.
- [ ] Test files exist and cover at least one frontend failure state that could otherwise look like success from the browser.

### Validation Commands
```bash
npm run test -- --run && npm run lint && npm run typecheck && npm run build && docker compose up -d --build && npm run test:e2e:stack
```

## [ ] M5: End-to-end C# -> DB -> frontend broad verification and reporting

Close the loop by proving that the major content surfaces survive a real end-to-end path: browser/admin input -> backend validation -> DB persistence -> public/frontend readback. Record the evidence and operating guidance so the sweep can be repeated later.

Dependencies: M1, M2, M3, M4
Estimated loops: 1-2

### Allowed Files
- `tests/`
- `src/test/`
- `backend/tests/Portfolio.Api.Tests/`
- `scripts/`
- `README.md`
- `ARCHITECTURE.md`
- `docs/`

### Acceptance Criteria
- [ ] There is an explicit verification matrix covering `pages`, `site settings`, `works`, `blogs`, `resume`, and media paths from write through public/admin readback.
- [ ] At least one end-to-end verification path proves authenticated admin mutation -> backend write -> PostgreSQL persistence -> frontend/public readback for each major content family.
- [ ] Runtime health, DB smoke, backend tests, frontend tests, and browser tests are all part of the final proof chain.
- [ ] Documentation records how to run the broad sweep and what evidence counts as green.
- [ ] M3's `scripts/backend-http-smoke.sh` artifact is reused as part of the final proof chain rather than assumed implicitly.
- [ ] Test or documentation files exist and cover the final reporting/verification matrix.

### Validation Commands
```bash
npm run test -- --run && npm run lint && npm run typecheck && npm run build && docker run --pull=never --rm -v "$PWD/backend:/src" -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet test tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj && docker compose up -d --build && ./scripts/db-load-smoke.sh && ./scripts/backend-http-smoke.sh && curl -fsS http://localhost/api/health && npm run test:e2e:stack && docker compose ps
```
