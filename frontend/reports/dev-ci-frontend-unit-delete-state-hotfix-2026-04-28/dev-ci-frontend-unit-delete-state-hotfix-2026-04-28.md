# Dev CI Frontend Unit Delete State Hotfix

Date: 2026-04-28

## Summary

After PR #21 was merged into `dev`, the post-merge CI Dev run failed in the frontend unit test job. The failure was isolated to `src/test/public-detail-admin-actions.test.tsx`, where the delete-failure assertions expected the `삭제` button to be enabled immediately after a rejected async delete mutation.

The production components already restore the button state after the mutation settles. The hotfix updates the test to wait for the observable restored button state instead of racing React state cleanup.

## Tests Reinforced

- `src/test/public-detail-admin-actions.test.tsx`
  - Blog detail delete-failure assertion now waits for the delete button to return to enabled `삭제`.
  - Work detail delete-failure assertion now waits for the delete button to return to enabled `삭제`.

## Production Files Changed

- None.

## Test Files Changed

- `src/test/public-detail-admin-actions.test.tsx`

## Behavior Bugs Found

- No production behavior bug was found.
- Test bug found: the test asserted the post-failure button label/state before the rejected async delete handler had finished clearing its pending state. CI observed the transient disabled `삭제 중...` state.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `gh run view 25057650595 --job 73402401614 --log` | Completed | Identified the failing test and assertion in the post-merge `dev` CI run. |
| `npm test -- --run src/test/public-detail-admin-actions.test.tsx` | Passed | 1 file, 8 tests. |
| `npm test -- --run` | Passed | 81 files, 559 tests. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Risks And Deferred Items

- Full Vitest remains slow in the local WSL environment because the suite is intentionally constrained to `--maxWorkers=2`.
- Browser smoke for the merge commit was skipped by CI because the frontend unit job failed first; it should run again after the hotfix PR lands on `dev`.

## Final Recommendation

Open a hotfix PR from `fix/dev-frontend-unit-delete-state` into `dev`, wait for CI Dev to return green, then allow the staging image publish flow to complete before promoting toward `main`.
