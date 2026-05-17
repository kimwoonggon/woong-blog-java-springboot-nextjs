# Frontend Batch 39 - Pact Warning and Contract Test Stability Reinforcement

Date: 2026-04-28

## Summary

Batch 39 removed the remaining Pact V3 upgrade warnings and stabilized the Pact consumer test when run with neighboring helper tests. The Pact suite now writes a V4 pact file and uses the existing `INTERNAL_API_ORIGIN` public API override instead of file-parallel-sensitive module mocks.

The full Vitest command was further constrained to `--maxWorkers=2` after `--maxWorkers=4` still produced worker startup timeouts under repeated WSL load. No production behavior changed.

## Tests Added Or Reinforced

- `src/test/pact/public-api-consumer.pact.test.ts`
  - Writes Pact specification V4 metadata.
  - Uses env-based API origin injection instead of `vi.doMock` for server API helpers.
  - Remains stable when run with neighboring API/auth/helper tests.

## Production Files Changed

- None.

## Test Infrastructure Files Changed

- `src/test/pact/public-api-consumer.pact.test.ts`
- `tests/contracts/pacts/WoongBlog Frontend-WoongBlog API.json`
- `package.json`
- `docs/e2e-readiness.md`

## Behavior Bugs Found

- None in production.
- Test-infrastructure issue found: Pact test module mocking could race with neighboring test files under file parallelism and cause missing expected Pact requests.
- Full-suite stability issue found: `maxWorkers=4` was still too high for repeated full runs in this WSL environment; `maxWorkers=2` completed successfully.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx skills find pact contract testing vitest warnings` | Passed | Results were general API contract testing skills; no new skill was installed. |
| `npm test -- --run src/test/pact/public-api-consumer.pact.test.ts` | Passed | Initial diagnostic reproduced V3 warnings. Final runs passed with 1 file and 6 tests and no Pact warning. |
| `npm test -- --run src/test/api-base.test.ts src/test/api-client-no-cookie.test.ts src/test/auth-csrf.test.ts src/test/auth-login-url.test.ts src/test/azure-backup-lib.test.ts src/test/blog-content.test.ts src/test/blog-detail-related.test.tsx src/test/blog-notion-workspace.test.tsx src/test/e2e-latency-budget.test.ts src/test/pact/public-api-consumer.pact.test.ts` | Failed once, then passed | Failed before env-based injection due file-parallel module mock race. Final run passed with 10 files and 61 tests. |
| `npm test -- --run --no-file-parallelism <same 10 files>` | Passed | Confirmed the prior failure was file-parallel-sensitive. |
| `npm test -- --run src/test/pact/public-api-consumer.pact.test.ts src/test/auth-csrf.test.ts` | Passed | `maxWorkers=2` focused stability check passed with 2 files and 17 tests. |
| `npm test -- --run` | Failed once, then passed | `maxWorkers=4` failed with worker startup timeouts. Final `maxWorkers=2` run passed with 81 files and 559 tests. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Remaining Gaps

- Full Vitest is stable but slow with `maxWorkers=2`, taking roughly 24 minutes in this environment.
- Full Playwright e2e still needs Docker Desktop WSL integration or an already running local stack.
- Pact provider verification was not run because this batch stayed frontend/test-infrastructure scoped.

## Next Recommended Batch

Proceed to `Frontend Batch 40 - Full Vitest Runtime Partitioning Reinforcement`.

Recommended scope: frontend test infrastructure only. Split unit/component, Pact, and heavy editor/jsdom suites into documented deterministic npm scripts so routine validation can remain faster while still preserving a full all-in run. Do not change production behavior, API contracts, backend code, AI behavior, media validation, dark mode, or Playwright unless a partitioned command requires browser-level validation.
