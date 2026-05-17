# Frontend Batch 14 - Public Static Route and Date Display Reinforcement

Date: 2026-04-28

## Summary

Batch 14 reinforced public static route helpers and public date display fallbacks. The batch covered robots metadata output, malformed static params for blog/work detail routes, public feed invalid dates, and related-content invalid/missing dates.

Vitest unit/server/component tests were sufficient for this scope. No Playwright tests were added or run because no browser-only routing, history, or visual behavior changed.

## Tests Added Or Reinforced

- `src/test/public-static-routes.test.ts`
  - `robots.ts` emits root allow, admin disallow, and a normalized sitemap URL.
  - Blog/work `generateStaticParams` trims valid Unicode slugs.
  - Blog/work `generateStaticParams` preserves unsafe-looking but valid text slugs.
  - Blog/work `generateStaticParams` filters empty, nullish, slash, query, and hash slugs.
- `src/test/public-responsive-feed.test.tsx`
  - Blog and Work public feed cards render `Unknown Date` for invalid dates.
  - Public feed cards do not leak `Invalid Date` or `RangeError` text.
- `src/test/related-content-list.test.tsx`
  - Related content cards render `—` for invalid or missing dates.
  - Related content rendering no longer throws on invalid date input.

## Production Files Changed

- `src/app/(public)/blog/[slug]/page.tsx`
  - `generateStaticParams` now trims public slugs and filters malformed static route params.
- `src/app/(public)/works/[slug]/page.tsx`
  - `generateStaticParams` now trims public slugs and filters malformed static route params.
- `src/components/content/PublicResponsiveFeed.tsx`
  - Public blog/work feed date formatting now returns `Unknown Date` for invalid dates.
- `src/components/content/RelatedContentList.tsx`
  - Related card date formatting now returns `—` for invalid dates instead of throwing.

## Intentionally Not Changed

- Backend behavior and API contracts.
- Public error-boundary UI, pagination/search UI, AI, WorkVideo upload, media validation, and dark mode.
- Home page date formatting, which remains a separate server-rendered public surface.
- Playwright coverage, because the changed behavior is deterministic through Vitest.

## Behavior Bugs Found

- Blog/work `generateStaticParams` could return blank, nullish, slash, query, or hash slugs from malformed API payloads.
- Public feed cards could display `Invalid Date` for malformed public blog/work dates.
- Related content cards could throw `RangeError: Invalid time value` for malformed dates.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx skills find nextjs static params date testing` | Passed | Results were low-install external Next.js skills; no new skill was installed. |
| `npm test -- --run src/test/public-static-routes.test.ts src/test/public-responsive-feed.test.tsx src/test/related-content-list.test.tsx` | Failed before fixes, then passed | Final focused run: 3 files, 25 tests. |
| `npm test -- --run` | Passed | Final run passed with 73 files and 498 tests. Known Pact V3 warnings and jsdom navigation warning appeared. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Remaining Static Route And Date Gaps

- Home page featured/recent card date formatting remains server-component-local and still needs invalid date coverage.
- Public detail adjacent/related sort ordering still uses direct `new Date(...).getTime()` in page modules and is not covered for invalid dates.
- Admin dashboard/list date formatting remains outside this public-only batch.
- Static params filtering is duplicated in blog/work route modules; extract only if another route starts needing the same behavior.

## Next Recommended Batch

Proceed to `Frontend Batch 15 - Public Home Date and Detail Ordering Reinforcement`.

Recommended scope: frontend-only Vitest tests for public home featured/recent card invalid date fallbacks and blog/work detail adjacent/related ordering when dates are invalid or missing. Avoid public error-boundary UI, pagination/search UI, AI, WorkVideo upload, media validation, dark mode, and browser-only tests unless a true browser-only behavior appears.
