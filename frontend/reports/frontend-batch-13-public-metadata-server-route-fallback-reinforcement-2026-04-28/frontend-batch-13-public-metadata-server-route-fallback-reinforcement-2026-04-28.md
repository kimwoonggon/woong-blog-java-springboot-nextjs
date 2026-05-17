# Frontend Batch 13 - Public Metadata and Server Route Fallback Reinforcement

Date: 2026-04-28

## Summary

Batch 13 reinforced public metadata generation for blog/work detail routes and shared SEO metadata helper behavior. The batch focused on malformed route slugs, fetch failures, canonical path safety, social image safety, and Work YouTube thumbnail normalization.

Vitest unit/server module tests were sufficient for this scope. No Playwright tests were added or run because no browser-only routing, history, or visual behavior changed.

## Tests Added Or Reinforced

- `src/test/public-detail-metadata-fallback.test.ts`
  - Blog/work `generateMetadata` returns empty metadata for malformed route slugs.
  - Blog/work `generateMetadata` returns empty metadata when the public detail fetch fails.
  - Blog/work metadata canonical paths encode unsafe-looking API slugs.
  - Metadata output does not leak raw `<script>`, `undefined`, or `null` text.
- `src/test/seo-metadata.test.ts`
  - Canonical paths remain same-origin when given protocol-relative or duplicate-slash path input.
  - Unsafe `javascript:` and protocol-relative social images are filtered.
  - Safe relative and HTTPS social images remain preserved.
- `src/test/work-detail-metadata.test.ts`
  - Work detail canonical slugs are encoded.
  - Unsafe thumbnail URLs are filtered out of social metadata.
  - YouTube URL variants are normalized to video IDs before deriving social thumbnails.

## Production Files Changed

- `src/app/(public)/blog/[slug]/page.tsx`
  - `generateMetadata` now returns `{}` for malformed encoded slugs and public fetch failures.
  - Blog detail canonical metadata paths now encode API-provided slugs.
- `src/app/(public)/works/[slug]/page.tsx`
  - `generateMetadata` now returns `{}` for malformed encoded slugs and public fetch failures.
- `src/app/(public)/works/[slug]/work-detail-metadata.ts`
  - Work detail canonical metadata paths now encode API-provided slugs.
  - YouTube metadata thumbnails now reuse the shared YouTube ID normalizer before building thumbnail URLs.
- `src/lib/seo.ts`
  - Canonical paths collapse duplicate slashes and avoid protocol-relative output.
  - Unsafe social image URLs are filtered before Open Graph/Twitter metadata is emitted.

## Intentionally Not Changed

- Backend behavior and API contracts.
- Public error-boundary UI, pagination/search UI, AI, WorkVideo upload, media validation, and dark mode.
- Public page rendering behavior outside metadata generation.
- Playwright coverage, because the changed behavior is deterministic at helper/server module level.

## Behavior Bugs Found

- Blog/work `generateMetadata` could throw `URIError` for malformed route slug encodings.
- Blog/work `generateMetadata` could throw raw fetch errors during metadata generation.
- Blog/work canonical metadata paths could include raw unsafe-looking slug text such as `<script>`.
- `createPublicMetadata` could emit protocol-relative canonical paths.
- `createPublicMetadata` could emit unsafe `javascript:` or protocol-relative social image URLs.
- Work detail metadata could build YouTube thumbnail URLs from full YouTube URLs instead of normalized video IDs.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx skills find nextjs metadata testing` | Passed | Results were low-install external metadata/Next.js skills; no new skill was installed. |
| `npm test -- --run src/test/seo-metadata.test.ts src/test/work-detail-metadata.test.ts src/test/public-detail-metadata-fallback.test.ts` | Failed before fixes, then passed | Final focused run: 3 files, 13 tests. |
| `npm test -- --run src/test/admin-page-success-states.test.tsx` | Passed | Isolation check after an interrupted full run; 1 file, 18 tests. |
| `npm test -- --run` | Passed | Final run passed with 72 files and 493 tests. Known Pact V3 warnings and jsdom navigation warning appeared. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Remaining Metadata And Static Route Gaps

- `robots.ts` remains simple and low-risk but is not directly unit-tested.
- Public list/card date formatting remains component-local and still needs invalid/missing date coverage.
- `generateStaticParams` for blog/work still trusts API slugs and is not covered for empty/nullish malformed payloads.
- Public page/contact/introduction metadata remains less explicit than blog/work detail metadata.

## Next Recommended Batch

Proceed to `Frontend Batch 14 - Public Static Route and Date Display Reinforcement`.

Recommended scope: frontend-only Vitest tests for `robots.ts`, blog/work `generateStaticParams` malformed slug filtering if frontend-owned, and public list/card date display fallbacks for invalid or missing dates. Avoid public error-boundary UI, pagination/search UI, AI, WorkVideo upload, media validation, and browser-only tests unless a true browser-only behavior appears.
