# Frontend Batch 5 - AI Failure and Partial Failure UI Reinforcement

Date: 2026-04-27

## Scope

Frontend AI failure and partial-failure UI coverage from the frontend test coverage audit. The work used component mocks and Playwright route mocks only.

## Changed

- Added `AIFixDialog` component tests for runtime config failure, malformed config fallback, empty provider fallback, blog AI 504/500 failures, safe retry, no false success, preserved draft content, and mocked work enrich failure/retry.
- Added `AdminBlogBatchAiPanel` component tests for runtime fallback, mixed succeeded/failed item rendering, failed-item details, partial apply failure, cancel failure, remove failure, and safe retry/removal state.
- Added route-mocked browser coverage for blog AI failure/retry and work enrich failure-to-success in `tests/admin-blog-ai-dialog.spec.ts`.
- Fixed `AdminBlogBatchAiPanel` so partial apply responses with failed items no longer show the full-success toast.
- Fixed `playwright.config.ts` so explicitly requested optional specs are not ignored by the forced core profile.
- Updated `frontend/reports/frontend-test-coverage-audit-2026-04-26/frontend-test-coverage-audit-2026-04-26.md` with the Batch 5 section.

## Not Changed

- No backend behavior was changed.
- No live AI, OpenAI, Azure, Codex, external services, or `PLAYWRIGHT_LIVE_AI` were used.
- WorkVideo tests and public API error-boundary tests were not broadened.
- Dark mode and code block readability changes were not touched.
- Existing unrelated dirty files were left alone.

## Goals Verification

- Runtime-config 500/malformed/empty-provider coverage: complete at component level.
- Blog AI POST 504/500 failure coverage: complete at component level, plus route-mocked browser 504 retry coverage.
- Work enrich mocked happy/failure path: complete through shared component coverage and route-mocked browser coverage.
- Batch mixed succeeded/failed rendering: complete at component level.
- Apply partial failure: complete at component level with production false-success fix.
- Cancel/remove failure: complete at component level.
- Safe retry/error UI without false success: complete for the covered dialog, work enrich, apply, cancel, and remove paths.

## Validation

| Command | Result |
| --- | --- |
| `npm test -- --run src/test/admin-ai-fix-dialog.test.tsx` | Passed: 1 file, 11 tests. |
| `npm test -- --run src/test/admin-blog-batch-ai-panel.test.tsx` | Failed before fix as RED: partial apply did not show the partial-failure toast. |
| `npm test -- --run src/test/admin-blog-batch-ai-panel.test.tsx` | Passed after fix: 1 file, 17 tests. |
| `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e -- tests/admin-blog-ai-dialog.spec.ts tests/admin-ai-batch-jobs.spec.ts tests/admin-ai-batch-cancel.spec.ts` | Passed: 6 tests, 0 latency budget failures. |
| `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e` | Passed: 418 passed, 5 skipped, 0 latency budget failures. |
| `npm test -- --run` | Passed: 65 files, 382 tests. |
| `npm run lint` | Passed: 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed. |
| `npm run build` | Passed. |
| `git diff --check` | Passed. |

## Risks And Yellow Flags

- Browser-level batch partial apply remains component-covered rather than Playwright-covered to avoid broad E2E expansion.
- Work enrich browser coverage targets the new work form; edit-form enrich relies on the same shared `AIFixDialog` behavior.
- The E2E harness fix intentionally allows explicitly requested optional specs, but normal core full-suite behavior still excludes optional specs.

## Recommendation

Proceed to the public API error states batch: public blog/work/page/resume API 500 and error-boundary assertions with deterministic component/server tests and a small route-mocked browser slice where needed.
