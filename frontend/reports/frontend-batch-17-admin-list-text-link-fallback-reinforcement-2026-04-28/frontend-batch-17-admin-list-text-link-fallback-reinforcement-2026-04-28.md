# Frontend Batch 17 - Admin List Text and Link Fallback Reinforcement

Date: 2026-04-28

## Summary

Batch 17 reinforced admin blog/work table and admin dashboard collection rendering when list item text and route fields are empty, nullish, or unsafe-looking.

Vitest component tests were sufficient for this scope. No Playwright tests were added or run because no browser-only routing, history, or visual behavior changed.

## Tests Added Or Reinforced

- `src/test/admin-bulk-table.test.tsx`
  - Admin blog table renders fallback title/tag text for malformed admin blog values.
  - Admin blog public and edit links encode unsafe-looking slugs and avoid `/null` admin edit links.
  - Admin works table renders fallback title/category text for malformed admin work values.
  - Admin work public and edit links encode unsafe-looking slugs and avoid `/null` admin edit links.
  - Admin table output does not leak `undefined` or `null` text for these malformed value cases.
- `src/test/admin-dashboard-collections.test.tsx`
  - Admin dashboard Work and Blog collection cards render fallback title/category/tag text for malformed collection values.
  - Admin dashboard edit links avoid `/null` route segments.
  - Admin dashboard collection output does not leak `undefined` or `null` text for these malformed value cases.

## Production Files Changed

- `src/components/admin/AdminBlogTableClient.tsx`
  - Blog table rendering now normalizes display titles, tag arrays, public slugs, and admin edit ids at the render boundary.
- `src/components/admin/AdminWorksTableClient.tsx`
  - Work table rendering now normalizes display titles, categories, public slugs, admin edit ids, and thumbnail alt text at the render boundary.
- `src/components/admin/AdminDashboardCollections.tsx`
  - Dashboard collection rendering now normalizes card titles, metadata text, tag arrays, and admin edit route ids.

## Intentionally Not Changed

- Backend behavior and API contracts.
- Public pages, public error-boundary UI, pagination/search UI, AI, WorkVideo upload, media validation, and dark mode.
- Admin fetch/data source behavior and mutation payload contracts.
- Browser/E2E coverage, because the changed behavior is deterministic through Vitest component rendering.

## Behavior Bugs Found

- Admin blog table rendering could crash when a malformed item contained `tags: null`.
- Admin table and dashboard list titles could render as empty UI when malformed item titles were nullish.
- Admin table and dashboard edit links could include `/null` when malformed item ids were nullish.
- Admin public view links could include raw unsafe-looking slug text instead of an encoded path segment.
- Work table category and thumbnail alt text could use nullish/raw title values without a user-facing fallback.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx skills find react admin link fallback testing` | Passed | Results included React/admin skills; no new skill was installed because existing component tests already cover the local admin list patterns. |
| `npm test -- --run src/test/admin-bulk-table.test.tsx src/test/admin-dashboard-collections.test.tsx` | Failed before fixes, then passed | Final focused Batch 17 slice passed with 2 files and 28 tests. |
| `npm test -- --run` | Passed | Final run passed with 75 files and 507 tests. Known Pact V3 warnings and jsdom navigation warning appeared. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Remaining Admin List Gaps

- Admin list delete flows still assume malformed ids should not be submitted; disabling or hiding mutation controls for missing ids remains unaudited.
- Admin list fetch failure UI remains outside this batch.
- Admin dashboard collection search behavior with malformed tag/category payloads is covered indirectly, but not as a standalone search-focused assertion.
- The same text and route normalization logic now exists in multiple admin components; extract only if another batch broadens shared admin list policies.

## Next Recommended Batch

Proceed to `Frontend Batch 18 - Admin Mutation Guard and Fetch Failure Reinforcement`.

Recommended scope: frontend-only Vitest component/server tests for admin list mutation controls and fetch failure behavior where frontend-owned. Cover missing-id delete/edit affordances, failed delete feedback without row loss, and admin blog/work list page fetch failure states if deterministic through server component tests. Avoid AI, WorkVideo upload, media validation, dark mode, pagination/search UI broadening, and browser-only tests unless a true browser-only behavior appears.
