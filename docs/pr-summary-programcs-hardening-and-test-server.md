# PR Summary: Program.cs Hardening and Test-Server Verification

## What Changed
- Reduced backend startup fragility by adding startup-time options validation for auth, AI, proxy, and security configuration.
- Kept `Program.cs` as a thin composition root while moving policy-bearing startup logic into subsystem-owned files.
- Added backend startup regression coverage for root redirect and invalid option failure paths.
- Hardened frontend/admin lint compliance by removing effect-driven synchronous state resets and unused imports.
- Added explicit test-server/browser coverage for the compose/nginx runtime path and same-origin auth/session behavior.

## Backend
- `Program.cs` now validates bound options on startup before applying the runtime pipeline.
- Added validators for:
  - `AuthOptions`
  - `AiOptions`
  - `ProxyOptions`
  - `SecurityOptions`
- Added startup helpers and tests to prove:
  - valid testing config still boots
  - invalid rate limit, proxy CIDR, AI provider, and production auth config fail fast
  - root redirect behavior remains intact

## Frontend / Browser
- Added same-origin runtime tests for the external test-server lane.
- Extended API-base helper coverage for localhost test-server behavior.
- Fixed lint violations in admin collection/table components by moving query/page resets into event handlers and derived state.

## Verification
- Backend:
  - `docker run --pull=missing --rm -v "$PWD/backend:/src" -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet test tests/WoongBlog.Api.Tests/WoongBlog.Api.Tests.csproj`
- Frontend:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test -- --run src/test/admin-bulk-table.test.tsx src/test/admin-dashboard-collections.test.tsx src/test/api-base.test.ts src/test/server-api.test.ts`
- Browser:
  - `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/test-server-runtime.spec.ts tests/auth-security-browser.spec.ts --project=chromium-runtime-auth --workers=1`
  - `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=https://localhost npx playwright test tests/auth-login.spec.ts --project=chromium-public --workers=1`
  - `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=https://localhost npx playwright test tests/auth-security-browser.spec.ts tests/test-server-runtime.spec.ts --project=chromium-runtime-auth --workers=1`

## Notes
- Repository-global lint now passes by ignoring external/generated `.codex/**` and `.agents/**` paths rather than editing vendored content.
- Unrelated workspace changes such as `skills-lock.json`, `.agents/skills/*`, and `instructions/*` were intentionally left out of this change set.
