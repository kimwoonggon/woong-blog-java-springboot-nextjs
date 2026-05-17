# Plans

> **Stop-and-fix rule**: validation 실패 시 다음 마일스톤으로 넘어가지 않는다.

## [ ] M0: Finalize and checkpoint duplicate slug collision hardening
The duplicate-title slug fix is already present in the current dirty worktree; first formalize it as the checkpointed starting state before the broader quality pass continues.

Dependencies: none  
Estimated loops: 1

### Allowed Files
- `backend/src/Portfolio.Api/Controllers/AdminBlogsController.cs`
- `backend/src/Portfolio.Api/Controllers/AdminWorksController.cs`
- `backend/tests/Portfolio.Api.Tests/AdminContentEndpointsTests.cs`

### Acceptance Criteria
- [ ] The current controller/test changes for duplicate-title slug suffixing are either committed or explicitly checkpointed before broader work begins.
- [ ] Creating two blog posts with the same title succeeds and the second gets a distinct slug.
- [ ] Creating two works with the same title succeeds and the second gets a distinct slug.
- [ ] Tests exist and cover both duplicate-title create scenarios.

### Validation Commands
```bash
docker run --rm -v "$PWD/backend:/src" -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet test tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj && git status --short
```

## [ ] M1: Baseline integrated architecture and verification inventory
Map the real execution path, inventory current tests/coverage surfaces, and lock the current weak points before making improvements.

Dependencies: none  
Estimated loops: 1

### Allowed Files
- `docs/ralph/architecture-innovation-test-quality/prompt.md`
- `docs/ralph/architecture-innovation-test-quality/plans.md`
- `docs/ralph/architecture-innovation-test-quality/implement.md`
- `docs/ralph/architecture-innovation-test-quality/documentation.md`
- `.omx/plans/prd-architecture-innovation-test-quality.md`
- `.omx/plans/test-spec-architecture-innovation-test-quality.md`

### Acceptance Criteria
- [ ] The current browser -> nginx -> backend -> db flow is documented from inspected code.
- [ ] Existing test layers (xUnit, Vitest, Playwright, smoke scripts) are inventoried from `architecture-innovation.md`, `package.json`, `vitest.config.ts`, `playwright.config.ts`, `PortfolioDbContext.cs`, nginx confs, and compose files.
- [ ] Coverage/type/nullability/DB/nginx/load-test weak points are listed with evidence.

### Validation Commands
```bash
test -f docs/ralph/architecture-innovation-test-quality/plans.md && test -f .omx/plans/test-spec-architecture-innovation-test-quality.md
```

## [ ] M2: Integrated regression and browser/server flow hardening
Add or improve tests that verify end-to-end persistence, auth/session/cookie behavior, error handling, and nginx-backed API routing across the live stack.

Dependencies: M1  
Estimated loops: 2-3

### Allowed Files
- `tests/*`
- `src/test/*`
- `backend/tests/Portfolio.Api.Tests/*`
- `scripts/backend-http-smoke.sh`
- `scripts/db-load-smoke.sh`
- `playwright.config.ts`
- `vitest.config.ts`
- `package.json`
- `docs/ralph/architecture-innovation-test-quality/documentation.md`

### Acceptance Criteria
- [ ] Browser-level tests cover at least one full create/readback flow through nginx/backend/db.
- [ ] Error-path handling is verified for at least one backend failure and one invalid request path.
- [ ] Auth/session/logout flows remain verified after the improvements.
- [ ] Test files exist and clearly cover the integrated scenarios they claim to verify.

### Validation Commands
```bash
npm run typecheck && npx vitest run --pool=threads && docker run --rm -v "$PWD/backend:/src" -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet test tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj && docker compose up -d --build frontend backend nginx && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test --workers=1
```

## [ ] M3: Coverage-focused test strengthening
Use the existing test layers to close meaningful coverage gaps in frontend utilities, backend branching logic, validation paths, and data-shaping code, and add an explicit frontend coverage command/tool where needed.

Dependencies: M1, M2  
Estimated loops: 2

### Allowed Files
- `src/test/*`
- `tests/*`
- `backend/tests/Portfolio.Api.Tests/*`
- `package.json`
- `package-lock.json`
- `vitest.config.ts`
- `src/test/*`
- `backend/tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj`
- `docs/ralph/architecture-innovation-test-quality/documentation.md`

### Acceptance Criteria
- [ ] Coverage gaps are documented as before/after, not just claimed.
- [ ] A concrete frontend coverage command/tool exists and runs successfully.
- [ ] Newly added tests target real branches/behaviors rather than trivial render smoke only.
- [ ] Remaining hard-to-cover areas are documented with concrete reasons.

### Validation Commands
```bash
npx vitest run --coverage --pool=threads && docker run --rm -v "$PWD/backend:/src" -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet test tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj --collect:"XPlat Code Coverage"
```

## [ ] M4: TypeScript typing and C# nullable quality pass
Strengthen TypeScript request/response/form/component typing and safely reduce weak nullable patterns in the backend where evidence supports it.

Dependencies: M1  
Estimated loops: 2

### Allowed Files
- `src/app/**`
- `src/components/**`
- `src/hooks/**`
- `src/lib/**`
- `src/test/**`
- `backend/src/Portfolio.Api/**`
- `backend/tests/Portfolio.Api.Tests/*`
- `docs/ralph/architecture-innovation-test-quality/documentation.md`

### Acceptance Criteria
- [ ] `any` / unsafe assertions / weak API shapes are reduced with concrete typed replacements.
- [ ] Nullable changes are justified by inspected usage and schema/model meaning.
- [ ] No compile errors or nullability regressions are introduced.
- [ ] Test files exist for at least one previously weakly-typed or nullable-sensitive path.

### Validation Commands
```bash
npm run lint && npm run typecheck && docker run --rm -v "$PWD/backend:/src" -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet test tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj
```

## [ ] M5: EF Core / DB structure review and safe corrective fixes
Inspect entity definitions, Fluent API, indexes, nullability, and persistence contracts; make only evidence-based schema/model fixes.

Dependencies: M1  
Estimated loops: 1-2

### Allowed Files
- `backend/src/Portfolio.Api/Domain/**`
- `backend/src/Portfolio.Api/Infrastructure/Persistence/**`
- `backend/src/Portfolio.Api/Application/**`
- `backend/tests/Portfolio.Api.Tests/*`
- `docs/ralph/architecture-innovation-test-quality/documentation.md`

### Acceptance Criteria
- [ ] DB/entity nullability, keys, unique constraints, and indexes are reviewed against current domain usage.
- [ ] Any schema/model fix is backed by a concrete mismatch, not preference.
- [ ] Persistence contract tests exist or are extended where a fix touches schema behavior.

### Validation Commands
```bash
docker run --rm -v "$PWD/backend:/src" -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet test tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj
```

## [x] M5.6: Playwright auth fixture redesign and full-suite e2e stabilization
Redesign Playwright authentication so authenticated browser tests use one deterministic fixture strategy, then make the full external-server suite green.

Dependencies: M2, M5  
Estimated loops: 2-4

### Allowed Files
- `playwright.config.ts`
- `tests/helpers/*`
- `tests/*.spec.ts`
- `docs/ralph/architecture-innovation-test-quality/documentation.md`

### Acceptance Criteria
- [x] A single documented auth fixture strategy exists for authenticated Playwright specs.
- [x] Authenticated specs no longer mix multiple bootstrap methods.
- [x] Login/logout/auth-security specs remain on an explicit runtime-auth lane when they need real transitions.
- [x] Full Playwright suite passes end-to-end against the live stack.
- [x] A migration-completeness check exists or is documented (for example, grep-based confirmation that legacy shortcut usage is removed from the authenticated lane).

### Validation Commands
```bash
docker compose up -d --build frontend backend nginx && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test --workers=1
```

## [x] M5.7: Spec cleanup / de-flake sweep
After fixture redesign, remove remaining selector and synchronization fragility so suite-wide sequential runs stay green.

Dependencies: M5.6  
Estimated loops: 1-2

### Allowed Files
- `tests/*.spec.ts`
- `tests/helpers/*`
- `playwright.config.ts`
- `docs/ralph/architecture-innovation-test-quality/documentation.md`

### Acceptance Criteria
- [x] Upload specs use response synchronization consistently (`Promise.all` or equivalent).
- [x] Admin page/editor tests use scoped locators instead of broad page-wide selectors where ambiguity caused failures.
- [x] No remaining suite-only failures are caused by auth/bootstrap or request/response races.
- [x] Flake-sensitive specs are grouped and documented if any residual instability remains.

### Validation Commands
```bash
PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test --workers=1
```

## [x] M6: Lightweight load/performance + nginx/runtime verification
Run realistic bounded load scenarios and validate nginx/runtime behavior, then document bottlenecks and safe follow-ups after the full e2e suite is stable.

Dependencies: M2, M5, M5.6, M5.7  
Estimated loops: 1

Status note: plain-HTTP runtime evidence was first gathered against `http://localhost` through `nginx/default.conf`, and the follow-up HTTPS reverse-proxy sign-off is now covered by completed milestone `M6.1`.

### Allowed Files
- `nginx/*.conf`
- `docker-compose*.yml`
- `scripts/*`
- `tests/*`
- `docs/ralph/architecture-innovation-test-quality/documentation.md`
- `README.md`
- `DEPLOYMENT.md`

### Acceptance Criteria
- [x] At least one read path, one write path, and one auth/session path are load-checked.
- [x] Average/peak latency, failure rate, and likely bottleneck location are documented.
- [x] nginx routing/header/body-size assumptions are reviewed against actual app behavior.
- [x] Follow-up recommendations are documented and separated from completed work.

### Validation Commands
```bash
docker compose up -d --build frontend backend nginx && ./scripts/db-load-smoke.sh && ./scripts/backend-http-smoke.sh && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/auth-security-browser.spec.ts --workers=1
```


## [x] M6.1: Local HTTPS reverse-proxy and self-signed TLS behavior verification
Validate the actual HTTPS browser-facing path so secure cookies, forwarded proto handling, OAuth callback assumptions, and nginx TLS termination are proven on `https://localhost`, while explicitly treating certificate trust-store validation as a separate concern from self-signed local TLS behavior.

Dependencies: M6  
Estimated loops: 1-2

### Allowed Files
- `nginx/*.conf`
- `docker-compose*.yml`
- `scripts/*`
- `tests/*`
- `playwright.config.ts`
- `docs/ralph/architecture-innovation-test-quality/documentation.md`
- `README.md`
- `DEPLOYMENT.md`

### Acceptance Criteria
- [x] The local HTTPS stack boots through `nginx/local-https.conf` and `docker-compose.https.yml`.
- [x] Browser-facing verification is run against `https://localhost`, not only `http://localhost`.
- [x] Secure-cookie / forwarded-proto / callback-path assumptions are checked with concrete evidence.
- [x] At least one browser auth-path check and one backend health/session check are recorded on HTTPS.
- [x] Documentation clearly distinguishes completed HTTP evidence, completed HTTPS behavior evidence, and any still-open trust-store limitations.

### Validation Commands
```bash
./scripts/setup-local-https.sh && NGINX_DEFAULT_CONF=./nginx/local-https.conf docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build && curl -kI https://localhost/api/health && curl -k https://localhost/api/auth/session && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=https://localhost npx playwright test tests/auth-login.spec.ts tests/public-admin-affordances.spec.ts --workers=1
```
