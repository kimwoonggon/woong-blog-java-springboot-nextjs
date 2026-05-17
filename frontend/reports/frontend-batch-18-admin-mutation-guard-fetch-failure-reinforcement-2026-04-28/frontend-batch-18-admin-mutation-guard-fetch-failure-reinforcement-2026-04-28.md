# Frontend Batch 18 - Admin Mutation Guard and Fetch Failure Reinforcement

Date: 2026-04-28

## Summary

Batch 18 reinforced admin blog/work list mutation controls so malformed rows without usable ids cannot be selected for bulk delete or sent to single delete actions.

Existing admin fetch failure and failed delete row-preservation tests already covered the other requested surfaces, so this batch added the missing id guard coverage and kept production changes focused to admin list components.

## Tests Added Or Reinforced

- `src/test/admin-bulk-table.test.tsx`
  - Blog rows with missing ids disable select-all, row selection, and row delete controls.
  - Work rows with missing ids disable select-all, row selection, and row delete controls.
  - Clicking disabled missing-id delete controls does not open a confirmation dialog or call delete APIs.
  - Existing failed-delete tests continue to verify row preservation and error feedback.
- Existing `src/test/admin-page-success-states.test.tsx`
  - Admin blog/works list fetch failures render safe failure panels without raw backend details.

## Production Files Changed

- `src/components/admin/AdminBlogTableClient.tsx`
  - Blog table selection now includes only normalized usable ids.
  - Missing-id blog rows disable row selection and delete controls.
  - Delete requests filter out unusable ids before opening mutation confirmation.
- `src/components/admin/AdminWorksTableClient.tsx`
  - Work table selection now includes only normalized usable ids.
  - Missing-id work rows disable row selection and delete controls.
  - Delete requests filter out unusable ids before opening mutation confirmation.

## Intentionally Not Changed

- Backend behavior and API contracts.
- Admin fetch/data source behavior and mutation helper network contracts.
- Public pages, public error-boundary UI, pagination/search UI, AI, WorkVideo upload, media validation, and dark mode.
- Browser/E2E coverage, because the changed behavior is deterministic through Vitest component rendering.

## Behavior Bugs Found

- Admin blog rows with missing ids still exposed enabled select-all/selection controls.
- Admin work rows with missing ids still exposed enabled select-all/selection controls.
- Missing-id rows could reach mutation affordances even though no valid row id could be submitted safely.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx skills find react admin mutation testing error state` | Passed | Results included mutation-testing/admin-react skills; no new skill was installed. |
| `npm test -- --run src/test/admin-bulk-table.test.tsx` | Failed before fixes, then passed | Final focused Batch 18 slice passed with 1 file and 25 tests. |
| `npm test -- --run` | Passed | Final run passed with 75 files and 509 tests. Known Pact V3 warnings and jsdom navigation warning appeared. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Remaining Admin Mutation Gaps

- Missing-id edit links now route to the list page, but there is no explicit disabled edit affordance.
- Admin mutation helper unit tests still focus on API behavior indirectly through component tests.
- Admin dashboard collection cards remain read-only links and have no mutation controls to guard.
- Admin fetch failure coverage exists for blog/works list pages, but dashboard partial failure messaging could be expanded separately.

## Next Recommended Batch

Proceed to `Frontend Batch 19 - Admin Dashboard Partial Failure and Navigation Reinforcement`.

Recommended scope: frontend-only Vitest server/component tests for admin dashboard partial content failures, dashboard collection link fallbacks, and admin navigation route safety where deterministic. Avoid AI, WorkVideo upload, media validation, dark mode, pagination/search UI broadening, and browser-only tests unless a true browser-only behavior appears.
