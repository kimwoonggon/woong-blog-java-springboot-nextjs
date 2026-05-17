# Java Spring Boot Testing Hardening Audit - 2026-05-17

## Objective

Prepare the Spring Boot backend with strong JUnit 5, Mockito, AssertJ, MockMvc, architecture, component, contract, integration, and unit test coverage; enforce JaCoCo coverage at 99% or higher; run the full backend test suite at least once; and wire the release flow through `dev`, staging image validation, and `main` runtime CI.

## Changed

- Added and expanded backend tests across unit, web/MockMvc, component, architecture, contract, and integration categories.
- Added a JaCoCo `coverage-check` Maven profile with 99% instruction and line coverage thresholds.
- Hardened `scripts/run-backend-coverage.sh` to run full coverage with threshold enforcement, count executed tests, and print instruction/line coverage.
- Hardened backend suite scripts so tagged suites fail if they execute zero tests.
- Added a required backend coverage job to both `CI Dev` and `CI Main Runtime`.
- Added Pact fixtures to the main runtime promotion allowlist so promoted runtime PRs can run full backend coverage and the dedicated Pact contract job.
- Fixed one tested null-published-date branch in `ContentService.context(...)` by replacing `Map.of(...)` with a null-capable `LinkedHashMap`.

## Intentionally Not Changed

- Branch coverage is measured but not gated. The enforced JaCoCo gate is instruction and line coverage at 99%.
- No separate staging branch workflow was added. Staging remains the existing `Publish GHCR Dev` workflow, which builds staging images and smokes `docker-compose.staging.yml` after successful `CI Dev`.
- `main` is not pushed directly from the local checkout. The repository's documented route is `dev` CI, `release/main-promote` PR, `CI Main Runtime`, then auto-merge to `main`.
- Frontend source behavior was not changed by this testing-hardening slice.

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
| Full test run at least once | `backend/reports/testing-hardening-2026-05-17/full-backend-coverage-final-2026-05-17.log`: 194 tests, 0 failures, 0 errors, 0 skipped. |
| 10 minute timeout rule | Final full run completed in 1:13, so no timeout path was triggered. Earlier Testcontainers socket failure was classified as environment failure, not timeout. |
| Testcontainers/Ryuk caution | Docker socket attempt used `TESTCONTAINERS_RYUK_DISABLED=true`; final pass used external PostgreSQL with `-Dtestcontainers.enabled=false`. Remaining container check showed `wb-coverage-db-20260517-agent` still running for evidence DB state. |
| Subagents | Read-only coverage/CI audit subagents reviewed JaCoCo artifacts, Surefire reports, workflows, and release blockers. |
| Backup before modification | `.agent-backups/2026-05-17-testing-hardening/`. |

## Validation

- `bash -n scripts/run-backend-coverage.sh scripts/run-unit-tests.sh scripts/run-component-tests.sh scripts/run-architecture-tests.sh scripts/run-web-tests.sh scripts/run-integration-tests.sh` passed.
- `git diff --check` passed.
- Docker Java 21 full backend coverage gate passed against fresh PostgreSQL database `portfolio_cov_slice_20260517_04`.
- Surefire report total: 194 tests, 0 failures, 0 errors, 0 skipped.
- JaCoCo totals from `coverage/backend/full/report/jacoco.csv`: instruction 9976/10072 (99.05%), line 1784/1799 (99.17%), branch 423/496 (85.28%).
- `docker ps` after verification showed the external coverage database container `wb-coverage-db-20260517-agent` running.
- Remote `CI Dev` run `25989003521` passed, including backend coverage.
- Remote `Publish GHCR Dev` run `25989128710` passed for staging image publication.
- Manual promotion PR #1 exposed a main-runtime allowlist gap for Pact fixtures; `scripts/main-runtime-allowlist.txt` was updated so regenerated promotion branches include `tests/contracts/pacts`.

## Risks And Follow-Up

- Branch coverage is 85.28% and not enforced. If the project wants branch coverage at 99%, that should be a separate explicit hardening pass because it requires many additional edge-case tests.
- Automatic promotion currently fails before checkout when `PROMOTION_TOKEN` is absent. Manual `release/main-promote` PR promotion is being used for this run.
- Regenerated promotion PR `CI Main Runtime`, `main` merge, and main publish gates must still be observed after the Pact allowlist fix.
- The external coverage PostgreSQL container should be removed after no further local evidence inspection is needed.

## Recommendation

Proceed with the Pact allowlist fix, regenerate the `release/main-promote` branch, then verify `CI Main Runtime`, merge to `main`, and observe main push/publish gates before considering the release flow complete.
