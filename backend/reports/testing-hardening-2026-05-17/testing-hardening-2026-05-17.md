# Java Spring Boot Testing Hardening Audit - 2026-05-17

## Objective

Prepare the Spring Boot backend with strong JUnit 5, Mockito, AssertJ, MockMvc, architecture, component, contract, integration, and unit test coverage; enforce JaCoCo coverage at 99% or higher; add backend load-test parity with the prior C# implementation; adjust Java/JVM diagnostics and frontend wording where .NET-specific assumptions no longer fit; run the full backend test suite at least once; and wire the release flow through `dev`, staging image validation, and `main` runtime CI.

## Changed

- Added and expanded backend tests across unit, web/MockMvc, component, architecture, contract, and integration categories.
- Added a JaCoCo `coverage-check` Maven profile with 99% instruction and line coverage thresholds.
- Hardened `scripts/run-backend-coverage.sh` to run full coverage with threshold enforcement, count executed tests, and print instruction/line coverage.
- Hardened backend suite scripts so tagged suites fail if they execute zero tests and print actual Surefire execution counts on success.
- Added a CI-visible backend test inventory script and report that lists total backend test classes, declared test methods, suite-tag counts, and every backend test class.
- Added a `Backend test inventory` job to both `CI Dev` and `CI Main Runtime`, and included the new script in the main-runtime promotion allowlist.
- Tagged the previously untagged load-test diagnostics tests and Spring context test so suite CI cannot miss them.
- Added a required backend coverage job to both `CI Dev` and `CI Main Runtime`.
- Added Pact fixtures to the main runtime promotion allowlist so promoted runtime PRs can run full backend coverage and the dedicated Pact contract job.
- Added Spring Boot real backend load-test endpoints for start/status/metrics/stop, with k6 execution, fake deterministic runs, active-run control, per-run report artifacts, and metrics parsing.
- Added JVM runtime diagnostics with heap, non-heap, thread, uptime, and garbage collector details while preserving frontend-compatible legacy process/gc/threadPool/database fields.
- Updated load-test configuration for `base-url`, `report-root`, and `k6-bin`; ignored generated `reports/loadtest/` artifacts.
- Updated the frontend load-test dashboard visible text/types to use backend runtime and JDBC wording instead of ASP.NET Core, ThreadPool, DbContext, or Npgsql-specific labels.
- Added focused diagnostics/load-test tests for controller endpoints, service lifecycle/error handling, k6 script/process launch, JVM DB diagnostics, and load-test dashboard parsing.
- Stabilized load-test terminal status publication so CI cannot observe `status = failed` before the corresponding `error` payload is visible.
- Fixed one tested null-published-date branch in `ContentService.context(...)` by replacing `Map.of(...)` with a null-capable `LinkedHashMap`.

## Intentionally Not Changed

- Branch coverage is measured but not gated. The enforced JaCoCo gate is instruction and line coverage at 99%.
- No separate staging branch workflow was added. Staging remains the existing `Publish GHCR Dev` workflow, which builds staging images and smokes `docker-compose.staging.yml` after successful `CI Dev`.
- `main` is not pushed directly from the local checkout. The repository's documented route is `dev` CI, `release/main-promote` PR, `CI Main Runtime`, then auto-merge to `main`.
- No unrelated frontend behavior was changed. Frontend changes are limited to load-test dashboard diagnostic compatibility and Java-neutral visible wording.

## Prompt-To-Artifact Checklist

| Requirement | Evidence |
|---|---|
| JUnit 5, Mockito, AssertJ, MockMvc backend testing | `backend/pom.xml`; tests under `backend/src/test/java/com/woongblog/**`; MockMvc suites in controller/web tests. |
| Architecture tests | `backend/src/test/java/com/woongblog/architecture/CqrsArchitectureTest.java`; `scripts/run-architecture-tests.sh`. |
| Component tests | `backend/src/test/java/com/woongblog/component/AuthConfigurationComponentTest.java`; `scripts/run-component-tests.sh`. |
| Contract tests | `backend/src/test/java/com/woongblog/contract/PactProviderContractTest.java`; `scripts/pact-provider-verify.sh`. |
| Integration tests | `backend/src/test/java/com/woongblog/integration/ApiParityIntegrationTests.java`; `scripts/run-integration-tests.sh`. |
| Unit tests | service/common/application tests under `backend/src/test/java/com/woongblog/**`; `scripts/run-unit-tests.sh`. |
| JaCoCo 99%+ | `coverage/backend/full/report/jacoco.csv`: instruction 99.05%, line 99.17%. |
| CI coverage gate | `.github/workflows/ci-dev.yml`, `.github/workflows/ci-main-runtime.yml`, `scripts/run-backend-coverage.sh full`. |
| Main runtime contract fixtures | `scripts/main-runtime-allowlist.txt` now includes `tests/contracts/pacts` for promoted runtime PR coverage and Pact jobs. |
| Backend load-test parity | `DiagnosticsController`, `RealLoadTestService`, `K6RealLoadTestExecutor`, and `RuntimeDiagnosticsService` provide real/fake runs, k6 launch, run reports, status/metrics/stop, and JVM diagnostics. |
| Java/JVM differences | `RuntimeDiagnosticsService` returns `runtime.platform = "jvm"` and JVM heap/non-heap/thread/GC details; `LoadTestDashboard` labels use backend runtime and JDBC wording. |
| Backend load-test tests | `DiagnosticsControllerTest`, `RealLoadTestServiceTest`, `RuntimeDiagnosticsServiceTest`, `K6RealLoadTestExecutorTest`, and `AppPropertiesTest`. |
| Frontend dashboard tests | `src/test/load-test-dashboard.test.ts`: 29 tests passed after Java-neutral dashboard changes. |
| Backend test inventory | `scripts/list-backend-tests.sh` and `backend/reports/testing-hardening-2026-05-17/backend-test-inventory-2026-05-17.md`: 42 classes, 198 declared methods, 0 untagged classes. |
| Suite runtime counts | `scripts/run-unit-tests.sh`, `scripts/run-component-tests.sh`, `scripts/run-architecture-tests.sh`, `scripts/run-web-tests.sh`, and `scripts/run-integration-tests.sh` now print actual executed test counts from Surefire XML. |
| Full test run at least once | Latest full coverage gate: 215 tests, 0 failures, 0 errors, 0 skipped. |
| 10 minute timeout rule | Final full run completed in 1:13, so no timeout path was triggered. Earlier Testcontainers socket failure was classified as environment failure, not timeout. |
| Testcontainers/Ryuk caution | Docker socket attempt used `TESTCONTAINERS_RYUK_DISABLED=true`; final pass used external PostgreSQL with `-Dtestcontainers.enabled=false`. Remaining container check showed `wb-coverage-db-20260517-agent` still running for evidence DB state. |
| Subagents | Read-only coverage/CI audit subagents reviewed JaCoCo artifacts, Surefire reports, workflows, and release blockers. |
| Backup before modification | `.agent-backups/2026-05-17-testing-hardening/`. |

## Validation

- `bash -n scripts/list-backend-tests.sh scripts/run-backend-coverage.sh scripts/run-unit-tests.sh scripts/run-component-tests.sh scripts/run-architecture-tests.sh scripts/run-web-tests.sh scripts/run-integration-tests.sh scripts/promote-main-runtime.sh` passed.
- `bash ./scripts/list-backend-tests.sh` passed and reported 42 backend test classes, 198 declared backend test methods, and 0 untagged classes.
- Docker Java 21 targeted unit-suite run through `scripts/run-unit-tests.sh -Dtest=K6RealLoadTestExecutorTest,RealLoadTestServiceTest,RuntimeDiagnosticsServiceTest` passed and printed `Backend unit tests executed: 19`.
- `git diff --check` passed.
- Docker Java 21 focused diagnostics/load-test suite passed: `-Dtest=DiagnosticsControllerTest,RuntimeDiagnosticsServiceTest,RealLoadTestServiceTest,K6RealLoadTestExecutorTest,AppPropertiesTest test`.
- Docker Java 21 full backend coverage gate passed against fresh PostgreSQL database `portfolio_cov_loadtest_cleanup_20260517`.
- Docker Java 21 full backend coverage gate passed after the load-test status race fix against fresh PostgreSQL database `portfolio_cov_loadtest_ci_race_20260517`.
- Surefire report total: 215 tests, 0 failures, 0 errors, 0 skipped.
- JaCoCo totals from `coverage/backend/full/report/jacoco.csv`: instruction 99.07%, line 99.20%.
- `npm test -- src/test/load-test-dashboard.test.ts --run` passed: 29 tests.
- `npm run typecheck` passed.
- `docker ps` after verification showed the external coverage database container `wb-coverage-db-20260517-agent` running.
- Remote `CI Dev` run `25989003521` passed, including backend coverage.
- Remote `Publish GHCR Dev` run `25989128710` passed for staging image publication.
- Remote `CI Dev` run `25989376008` passed after the Pact fixture allowlist fix.
- Manual promotion PR #1 exposed a main-runtime allowlist gap for Pact fixtures; `scripts/main-runtime-allowlist.txt` was updated so regenerated promotion branches include `tests/contracts/pacts`.
- Remote `CI Dev` run `25990351362` exposed a load-test status publication race in the coverage job; the terminal status/error write ordering was fixed locally and targeted/full backend validations passed afterward.

## Risks And Follow-Up

- Branch coverage is measured and not enforced. If the project wants branch coverage at 99%, that should be a separate explicit hardening pass because it requires many additional edge-case tests.
- Automatic promotion currently fails before checkout when `PROMOTION_TOKEN` is absent. Manual `release/main-promote` PR promotion is being used for this run.
- After the load-test parity commit, `dev` CI, staging image publish, regenerated promotion PR `CI Main Runtime`, `main` merge, and main publish gates must still be observed.
- The backend test inventory is static and counts parameterized test methods once; the suite scripts and coverage gate remain the source of actual Surefire runtime counts.
- k6 must be installed in the runtime environment for real backend load-test runs. The fake runner is intentionally retained for deterministic tests.
- The external coverage PostgreSQL container should be removed after no further local evidence inspection is needed.

## Recommendation

Commit and push the load-test race fix plus backend test inventory/count visibility slice to `dev`, verify `CI Dev` and `Publish GHCR Dev`, regenerate the `release/main-promote` branch, then verify `CI Main Runtime`, merge to `main`, and observe main push/publish gates before considering the release flow complete.
