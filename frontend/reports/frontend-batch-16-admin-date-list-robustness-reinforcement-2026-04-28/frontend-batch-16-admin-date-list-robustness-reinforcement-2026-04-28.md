# Frontend Batch 16 - Admin Date and List Robustness Reinforcement

Date: 2026-04-28

## Summary

Batch 16 reinforced admin blog/work table and admin dashboard collection date fallbacks for malformed admin list item dates.

Vitest component tests were sufficient for this scope. No Playwright tests were added or run because no browser-only routing, history, or visual behavior changed.

## Tests Added Or Reinforced

- `src/test/admin-bulk-table.test.tsx`
  - Admin blog table renders `—` for malformed `publishedAt` values.
  - Admin works table renders `—` for malformed `publishedAt` values.
  - Admin table output does not leak `Invalid Date`, `RangeError`, `undefined`, or `null` text for those malformed date cases.
- `src/test/admin-dashboard-collections.test.tsx`
  - Admin dashboard Work and Blog collection cards render `—` for malformed `publishedAt` values.
  - Admin dashboard collection output does not leak `Invalid Date`, `RangeError`, `undefined`, or `null` text for malformed date cases.

## Production Files Changed

- `src/components/admin/AdminBlogTableClient.tsx`
  - Blog table published date rendering now validates parsed dates and falls back to `—` for missing or malformed values.
- `src/components/admin/AdminWorksTableClient.tsx`
  - Work table published date rendering now validates parsed dates and falls back to `—` for missing or malformed values.
- `src/components/admin/AdminDashboardCollections.tsx`
  - Dashboard collection card date rendering now validates parsed dates and falls back to `—` for missing or malformed values.

## Intentionally Not Changed

- Backend behavior and API contracts.
- Public pages, public error-boundary UI, pagination/search UI, AI, WorkVideo upload, media validation, and dark mode.
- Admin fetch/data source behavior.
- Browser/E2E coverage, because the changed behavior is deterministic through Vitest component rendering.

## Behavior Bugs Found

- Admin blog table published date cells could display `Invalid Date` for malformed admin item dates.
- Admin works table published date cells could display `Invalid Date` for malformed admin item dates.
- Admin dashboard Work and Blog collection cards could display `Invalid Date` for malformed admin item dates.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx skills find react admin table testing` | Passed | Results included table/admin skills; no new skill was installed because existing component tests already cover the local admin table patterns. |
| `npm test -- --run src/test/admin-bulk-table.test.tsx src/test/admin-dashboard-collections.test.tsx` | Failed before fixes, then passed | Final focused Batch 16 slice passed with 2 files and 25 tests. |
| `npm test -- --run src/test/public-detail-boundary.test.tsx` | Passed | Isolation check after the first full run timed out in this unrelated file; 1 file and 7 tests. |
| `npm test -- --run` | Failed once, then passed | First full run timed out in one unrelated `public-detail-boundary` test; final full run passed with 75 files and 504 tests. Known Pact V3 warnings and jsdom navigation warning appeared. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Remaining Admin Date And List Gaps

- Admin table title, slug, category, tag, thumbnail, and public-link fallbacks have not been audited for nullish or unsafe-looking malformed values.
- Admin dashboard collection links still assume item ids are present and safe enough for the edit route.
- Admin list fetch failure UI was not changed in this date-focused batch.
- The same small date fallback logic now exists in several admin/public components; extract only if another batch broadens the shared date policy.

## Next Recommended Batch

Proceed to `Frontend Batch 17 - Admin List Text and Link Fallback Reinforcement`.

Recommended scope: frontend-only Vitest component tests for admin blog/work table and dashboard list behavior when title, slug, category, tags, thumbnails, and ids are empty, nullish, or unsafe-looking. Verify no `undefined`/`null` text leaks, public/admin links remain safe and deterministic, and accessible table/card semantics remain intact. Avoid AI, WorkVideo upload, media validation, dark mode, pagination/search UI, and browser-only tests unless a true browser-only behavior appears.
