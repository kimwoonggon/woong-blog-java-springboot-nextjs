# Headed E2E Stabilization Audit - 2026-05-18

## Summary

The Docker-backed full Playwright exhaustive suite was run in headed mode on Windows screen 2. The first visible run completed with 598 passed, 9 skipped, and 5 failed. The failures were traced to headed-only test fragility and local launch constraints, not production application regressions.

The stabilization changed only Playwright configuration and E2E specs:

- Added optional local headed launch controls in `playwright.config.ts`:
  - `PLAYWRIGHT_WINDOW_POSITION`
  - `PLAYWRIGHT_WINDOW_SIZE`
  - `PLAYWRIGHT_SLOW_MO_MS`
  - `PLAYWRIGHT_CHROMIUM_ARGS`
- Made `tests/admin-ai-batch-jobs.spec.ts` deterministic by modeling whether the mocked batch job is visible and by mocking `clear-completed`.
- Removed a response race in `tests/admin-blog-image-validation.spec.ts` by registering the failed upload response wait before `setFiles`.
- Aligned `tests/public-inline-editors-unsaved-warning.spec.ts` with the existing public blog inline return-to-list behavior.
- Made two viewport math assertions use actual `document.documentElement.clientWidth` so headed Chrome scrollbar width is handled while keeping the same layout contract.

## Intentionally Not Changed

- No production frontend component behavior was changed.
- No backend code, Docker compose files, or CI workflows were changed.
- No GitHub push, PR, or main promotion was performed for these local headed-test stabilization changes.
- Existing unrelated dirty files were left untouched.

## Goal Verification

Goal: run the full Docker-backed Playwright exhaustive suite in a visible headed browser on Windows screen 2.

Result: complete. The final visible run used screen 2 position `3840,249` and passed:

```text
603 passed, 9 skipped
Latency budget failures: 0
Latency warnings: 88
Runtime: 19.4m
```

## Validations

- `xrandr --listmonitors`: confirmed screen 2 as `XWAYLAND1 1080x1920+3840+249`.
- `npm run test:e2e:readiness`: passed before headed execution.
- First full headed run on screen 2: completed with 598 passed, 9 skipped, 5 failed.
- Targeted headed rerun after stabilization:
  - Command covered the five failed spec files.
  - Result: 15 passed.
- Full headed exhaustive rerun on screen 2:
  - `PLAYWRIGHT_WINDOW_POSITION=3840,249 PLAYWRIGHT_SLOW_MO_MS=80 npm run test:e2e:exhaustive -- --headed`
  - Result: 603 passed, 9 skipped, 0 latency budget failures.
- `npm run typecheck`: passed.
- Targeted ESLint on changed config/spec files: passed.
- `git diff --check` on changed files: passed.

## Risks And Follow-Ups

- The changes are currently local and unpushed. If they should become the repository baseline, they need the normal dev/main CI promotion path.
- `PLAYWRIGHT_CHROMIUM_ARGS` is intentionally generic for local headed diagnostics; keep usage documented in command invocations and avoid committing machine-specific values.
- The final headed run generated additional Playwright artifacts under `test-results/playwright`.

## Recommendation

Keep the test stabilization changes. They make the exhaustive suite deterministic in both CI/headless and local headed screen-observation modes without changing application behavior. If these changes are to be shared, commit them on `dev`, wait for dev CI, then promote to `main` through the established main CI gate.
