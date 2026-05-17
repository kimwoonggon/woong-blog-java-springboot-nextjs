# Integration And Component Test Parity Audit - 2026-05-17

## Summary

This task counted the ASP.NET Core backend tests on `kimwoonggon/woong-blog-aspcore-nextjs` branch `dev`, saved the full method inventory, and expanded the Spring Boot backend test suites in the high-risk areas that were underrepresented: integration and component tests.

The ASP.NET Core source inventory is persisted at:

- `backend/reports/aspcore-backend-test-inventory-2026-05-17/aspcore-backend-test-inventory-2026-05-17.md`
- `backend/reports/aspcore-backend-test-inventory-2026-05-17/aspcore-backend-test-inventory-2026-05-17.json`

## Counts

| Backend | Total | Unit | Web | Integration | Component | Architecture | Contract |
|---|---:|---:|---:|---:|---:|---:|---:|
| ASP.NET Core `dev` source | 41 classes / 390 methods | 7 / 27 | n/a | 17 / 199 | 13 / 126 | 3 / 37 | 1 / 1 |
| Spring Boot before parity work | 42 classes / 198 methods | 30 / 141 | 7 / 34 | 2 / 16 | 1 / 1 | 1 / 5 | 1 / 1 |
| Spring Boot after parity work | 53 classes / 292 methods | 10 / 41 | 7 / 34 | 13 / 107 | 28 / 138 | 1 / 5 | 1 / 1 |

Runtime executions are higher than static methods for parameterized tests:

- Unit: 51 executed
- Web: 36 executed
- Component: 145 executed
- Integration: 107 executed
- Architecture: 5 executed
- Contract: 1 executed

## Changed

- Added Spring Boot integration tests:
  - `AdminAiDeepIntegrationTests`
  - `AdminContentDeepIntegrationTests`
  - `AdminMutationParityIntegrationTests`
  - `AuthSecurityDeepIntegrationTests`
  - `DiagnosticsLoadTestIntegrationTests`
  - `PersistenceBootstrapIntegrationTests`
  - `PublicContentDeepIntegrationTests`
  - `PublicEndpointParityIntegrationTests`
  - `StartupCompositionDeepIntegrationTests`
  - `UploadsDeepIntegrationTests`
  - `WorkVideoDeepIntegrationTests`
  - shared `IntegrationTestSupport`
- Re-tagged service/store/filter/controller-slice tests that exercise real components from `unit` into `component`, while keeping `web` tags on controller slice tests.
- Added TDD-driven production fixes exposed by parity tests:
  - upload rejects unsupported image MIME types before persistence
  - work-video upload URL rejects invalid file metadata before version checks
  - missing work video version lookups return `Work not found.` instead of leaking `EmptyResultDataAccessException`
- Added component coverage for the JDBC work-video store empty-result path and media/work-video validation paths.

## Not Changed

- No frontend code was changed.
- No Docker, nginx, GitHub Actions, or environment configuration was changed.
- The Spring Boot backend still does not have a literal one-method-for-one-method copy of all 199 ASP.NET Core integration tests. This pass closes the largest CI-visible gap and covers the highest-risk API/DB/security/media/load-test behaviors first.
- The existing Spring Boot architecture count remains lower than ASP.NET Core architecture tests; this task targeted the user's integration/component concern.

## Validation

- `docker run --rm -v ... maven:3.9.9-eclipse-temurin-21 ./mvnw -q -DskipTests test-compile`: passed.
- `bash scripts/list-backend-tests.sh`: passed, reported total `53/292`.
- `docker run ... bash scripts/run-component-tests.sh`: passed, `Backend component tests executed: 145`.
- `docker run ... bash scripts/run-integration-tests.sh -Dtestcontainers.enabled=false ...`: passed against fresh `postgres:16-alpine`, `Backend integration tests executed: 107`.
- `docker run ... bash scripts/run-unit-tests.sh`: passed, `Backend unit tests executed: 51`.
- `docker run ... bash scripts/run-web-tests.sh`: passed, `Backend web tests executed: 36`.
- `docker run ... bash scripts/run-architecture-tests.sh`: passed, `Backend architecture tests executed: 5`.
- `docker run ... ./mvnw -q -Dgroups=contract -Dtestcontainers.enabled=false ... test`: passed against fresh external Postgres.

## Risks And Follow-ups

- Contract tests should run with isolated provider-state data. A contract run immediately after the mutable integration suite failed because integration-created rows changed the first-page list shape expected by the pact.
- Integration count is much improved but still below ASP.NET Core's `17/199`; a later pass should target the remaining ASP.NET Core parity areas methodically, especially long-running AI batch edge cases, HLS/transcoder cleanup flows, startup options validation, and architecture boundary tests.
- Testcontainers inside a Maven Docker container still needs either Docker socket access or the external Postgres override used here.

## Recommendation

Use the updated Spring Boot suite counts as the new CI baseline: `integration 13/107` and `component 28/138`. Keep contract tests DB-isolated, and plan a second parity pass for the remaining ASP.NET Core integration/architecture methods if exact historical parity is required.
