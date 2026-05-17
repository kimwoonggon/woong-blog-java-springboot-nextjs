# Frontend Batch 38 - JSDOM Navigation Warning Isolation

Date: 2026-04-28

## Summary

Batch 38 isolated and removed the jsdom `Not implemented: navigation to another Document` warning from the Vitest suite. The warning came from `src/test/auth-csrf.test.ts`, where the logout failure test accidentally supplied a missing authenticated-session payload and triggered the real auth redirect path instead of the intended logout failure path.

No production behavior changed.

## Tests Added Or Reinforced

- `src/test/auth-csrf.test.ts`
  - Corrected the logout failure fixture to pass authenticated session bootstrap first.
  - Added assertions that the failing logout request is actually reached.
  - Prevented accidental jsdom document navigation during the test.

## Production Files Changed

- None.

## Behavior Bugs Found

- None in production.
- Test bug found: the logout failure test was asserting a logout error but actually relied on an earlier session-expired redirect path. The test now exercises the intended logout failure behavior directly.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx skills find jsdom navigation vitest location testing` | Passed | Results were general Vitest/frontend testing skills; no new skill was installed. |
| `npm test -- --run src/test/auth-csrf.test.ts` | Failed once, then passed | RED exposed an incomplete 500 response mock; final run passed with 1 file and 11 tests and no navigation warning. |
| `npm test -- --run src/test/api-base.test.ts src/test/api-client-no-cookie.test.ts src/test/auth-csrf.test.ts src/test/auth-login-url.test.ts` | Passed | Rechecked the 4-file isolated warning group with no navigation warning. |
| `npm test -- --run src/test/api-base.test.ts src/test/api-client-no-cookie.test.ts src/test/auth-csrf.test.ts src/test/auth-login-url.test.ts src/test/azure-backup-lib.test.ts src/test/blog-content.test.ts src/test/blog-detail-related.test.tsx src/test/blog-notion-workspace.test.tsx src/test/e2e-latency-budget.test.ts` | Passed | Rechecked the 9-file warning group with no navigation warning. |
| `npm test -- --run` | Passed | Final run passed with 81 files and 559 tests. The jsdom navigation warning did not recur. Known Pact V3 warnings still appeared. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Remaining Gaps

- Pact V3 upgrade warnings remain noisy but are not jsdom navigation warnings.
- Full Playwright e2e still needs Docker Desktop WSL integration or an already running local stack.
- Full Vitest remains slow because Batch 37 intentionally bounded worker count for stability.

## Next Recommended Batch

Proceed to `Frontend Batch 39 - Pact Warning and Contract Test Stability Reinforcement`.

Recommended scope: frontend test infrastructure and contract-test hygiene only. Investigate whether Pact V3 upgrade warnings can be removed by updating pact metadata/fixture generation or test setup without changing public API behavior. Also verify the Pact suite remains deterministic when run with neighboring helper tests. Do not broaden into API contract redesign, backend changes, AI behavior, media validation, dark mode, or Playwright unless a contract test requires browser-only verification.
