# Frontend Batch 15 - Public Home Date and Detail Ordering Reinforcement

Date: 2026-04-28

## Summary

Batch 15 reinforced public home date display fallbacks and public blog/work detail related ordering when content dates are invalid or missing.

Vitest server/component tests were sufficient for this scope. No Playwright tests were added or run because no browser-only routing, history, or visual behavior changed.

## Tests Added Or Reinforced

- `src/test/public-home-date-fallback.test.tsx`
  - Public home featured Work and recent Study cards render `Unknown Date` for invalid dates.
  - Public home output does not leak `Invalid Date` or `RangeError` text.
- `src/test/blog-detail-related.test.tsx`
  - Blog detail related item ordering keeps valid dated posts ahead of invalid/missing date posts.
- `src/test/work-detail-related-order.test.tsx`
  - Work detail related item ordering keeps valid dated works ahead of invalid/missing date works.

## Production Files Changed

- `src/app/(public)/page.tsx`
  - Public home date formatting now returns `Unknown Date` for malformed dates in featured Works and recent Study cards.
- `src/app/(public)/blog/[slug]/page.tsx`
  - Blog detail related/adjacent sorting now treats malformed dates like missing dates instead of comparing `NaN`.
- `src/app/(public)/works/[slug]/page.tsx`
  - Work detail related/adjacent sorting now treats malformed dates like missing dates instead of comparing `NaN`.

## Intentionally Not Changed

- Backend behavior and API contracts.
- Public error-boundary UI, pagination/search UI, AI, WorkVideo upload, media validation, and dark mode.
- Admin dashboard/list date formatting.
- Browser/E2E coverage, because the changed behavior is deterministic through Vitest.

## Behavior Bugs Found

- Public home featured Work and recent Study cards could display `Invalid Date` for malformed public dates.
- Blog detail related/adjacent ordering could place malformed-date posts ahead of valid dated posts because `NaN` was used in the sort comparator.
- Work detail related/adjacent ordering could place malformed-date works ahead of valid dated works because `NaN` was used in the sort comparator.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx skills find nextjs server component date testing` | Passed | Results included one moderate-install React/Jest skill and low-install Next.js skills; no new skill was installed. |
| `npm test -- --run src/test/public-home-date-fallback.test.tsx src/test/blog-detail-related.test.tsx src/test/work-detail-related-order.test.tsx` | Failed before fixes, then passed | Final focused run: 3 files, 4 tests. |
| `npm test -- --run` | Passed | Final run passed with 75 files and 501 tests. Known Pact V3 warnings and jsdom navigation warning appeared. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Remaining Public Date Gaps

- Admin dashboard/list date formatting remains outside these public-only batches.
- Public detail sort helpers are duplicated between blog/work route modules; extract only if more route modules need the same behavior.
- Public date fallback coverage is now stronger on home/feed/related/detail surfaces, but locale/timezone display consistency has not been audited as a standalone concern.

## Next Recommended Batch

Proceed to `Frontend Batch 16 - Admin Date and List Robustness Reinforcement`.

Recommended scope: frontend-only Vitest component tests for admin blog/work/dashboard date fallbacks, malformed list item values, and no `Invalid Date`, `undefined`, or `null` leakage in admin tables/cards. Avoid public error-boundary UI, pagination/search UI, AI, WorkVideo upload, media validation, dark mode, and browser-only tests unless a true browser-only behavior appears.
