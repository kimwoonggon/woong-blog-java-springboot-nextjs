# Frontend Batch 11 - Helper Edge Case Reinforcement

Date: 2026-04-27

## Summary

Batch 11 reinforced frontend helper edge cases for search normalization, public revalidation path/tag parsing, blog/page content parsing, SEO metadata normalization, public detail date/content helpers, WorkVideo embed helpers, and YouTube thumbnail ID parsing.

Vitest unit tests were sufficient for the requested scope. No Playwright tests were added or run because no browser-only behavior was involved.

## Tests Added Or Reinforced

- `src/test/normalized-search.test.ts`
  - Whitespace-only, nullish, repeated-space, mixed Korean/English, case-insensitive, and symbol-heavy query behavior.
- `src/test/public-revalidation-paths.test.ts`
  - Empty/nullish slugs, trimmed Unicode slugs, unsafe slash-like slugs, encoded Korean paths, duplicate slashes, malformed percent-encoded paths, and encoded slash rejection.
- `src/test/blog-content.test.ts`
  - Malformed JSON fallback, empty renderable output, Korean multiline code block preservation, inline code preservation, and no raw parser error leakage.
- `src/test/page-content.test.ts`
  - Malformed/empty page JSON fallback and unknown block-type acceptance through the public block-content guard.
- `src/test/seo-metadata.test.ts`
  - Blank title fallback, blank social image filtering, canonical path normalization, and no `undefined`/`null` metadata string leakage.
- `src/test/public-detail-helper-edge-cases.test.ts`
  - Blog/work invalid and missing date fallback plus safe work content HTML parsing.
- `src/test/work-thumbnail-resolution.test.ts`
  - YouTube direct ID, short URL, watch URL, embed URL, shorts URL, invalid ID, and non-YouTube URL behavior.
- `src/test/work-video-embeds.test.ts`
  - Escaped embed IDs, empty embed IDs, and display-label fallbacks without `null` text.

## Production Files Changed

- `src/lib/content/page-content.ts`
  - `parsePageContentJson` now returns `null` for malformed JSON and non-object JSON instead of throwing or returning arrays.
- `src/lib/public-revalidation-paths.ts`
  - Detail path normalization now validates decoded path segments.
  - Malformed encoded paths and encoded slash segments are ignored without throwing.
- `src/lib/seo.ts`
  - Public metadata title falls back to the site author when blank.
  - Description falls back to an empty safe string.
  - Blank social images are filtered before Open Graph/Twitter metadata is emitted.
- `src/app/(public)/blog/[slug]/blog-detail-helpers.ts`
  - Invalid dates now return `Unknown Date` instead of `Invalid Date`.
- `src/app/(public)/works/[slug]/work-detail-helpers.ts`
  - Invalid dates now return `Unknown Date`.
  - Non-string `html` content now returns an empty safe string.
- `src/lib/content/work-thumbnail-resolution.ts`
  - YouTube ID normalization now handles URL query parameters regardless of order while still rejecting non-YouTube URLs.

## Intentionally Not Changed

- Backend behavior and API contracts.
- AI behavior, WorkVideo upload behavior, media validation, dark mode, public API error boundaries, and pagination/search UI.
- Browser/E2E coverage, because helper behavior was covered deterministically in Vitest.
- Broad parser rewrites or snapshot-style tests.

## Behavior Bugs Found

- Malformed page content JSON could throw parser errors through `parsePageContentJson`.
- Malformed percent-encoded public revalidation paths could throw URI errors.
- Encoded slash detail segments such as `%2Fadmin` could reach public revalidation tag mapping.
- Invalid blog/work detail dates rendered `Invalid Date` instead of the existing `Unknown Date` fallback.
- Work detail content parsing could return non-string values such as `123` as renderable output.
- Blank SEO titles and whitespace social image entries were preserved in metadata.
- YouTube watch URLs with `v` after another query parameter were not recognized for thumbnail fallback.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx skills find "typescript helper parsing seo testing"` | Passed | Low-install external skills found; no skill installed. |
| `npm test -- --run src/test/normalized-search.test.ts src/test/public-revalidation-paths.test.ts src/test/blog-content.test.ts src/test/page-content.test.ts src/test/seo-metadata.test.ts src/test/work-detail-metadata.test.ts src/test/public-detail-helper-edge-cases.test.ts src/test/work-video-embeds.test.ts src/test/work-thumbnail-resolution.test.ts` | Failed before fixes, then passed | Final run: 9 files, 68 tests. |
| `npm test -- --run src/test/seo-metadata.test.ts` | Passed | Rerun after adjusting the test assertion for Next metadata union typing. |
| `npm test -- --run` | Passed | Final run: 69 files, 482 tests. Known Pact V3 warnings and jsdom navigation warning appeared. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Remaining Helper Gaps

- Public list/card date formatting helpers are still component-local and not covered as shared date helpers.
- Sitemap date fallback behavior remains untested at the helper level.
- HTML sanitizer edge cases are partially covered elsewhere but were not expanded in this batch to avoid broad parser/security scope creep.
- WorkVideo player runtime fallback is covered by component tests, while this batch only reinforced helper-owned embed/thumbnail behavior.

## Recommendation

Proceed to a focused frontend security/sanitization or sitemap/metadata helper batch, depending on whether the next priority is content safety or public indexing correctness.
