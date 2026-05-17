# Frontend Batch 12 - Sanitization and Public Indexing Helper Reinforcement

Date: 2026-04-28

## Summary

Batch 12 reinforced frontend sanitizer and public indexing behavior around HTML URL safety, server-side sanitizer fallback output, and sitemap generation for malformed content metadata.

Vitest unit/server module tests were sufficient for the requested scope. No Playwright tests were added or run because no browser-only routing, history, or visual behavior changed.

## Tests Added Or Reinforced

- `src/test/html-sanitizer.test.ts`
  - DOM sanitizer removes event handlers and protocol-relative `href`/`src` values.
  - Safe relative links, `_blank` rel hardening, and safe data image URLs remain preserved.
  - Server fallback strips unquoted event handlers, unquoted `javascript:` URLs, protocol-relative media URLs, and script blocks without leaking raw unsafe text.
- `src/test/sitemap.test.ts`
  - Public sitemap uses the generated current date when blog/work `publishedAt` is invalid or missing.
  - Valid `publishedAt` dates remain preserved.
  - Empty/nullish blog/work slugs are omitted.
  - Korean/Unicode and unsafe-looking text slugs are encoded instead of emitted raw.

## Production Files Changed

- `src/lib/content/html-sanitizer.ts`
  - Protocol-relative URLs such as `//evil.example/path` are no longer treated as safe relative URLs.
  - The server fallback now removes unquoted event handler attributes and unsafe `href`/`src` values in addition to the existing quoted cases.
- `src/app/sitemap.ts`
  - Sitemap entries skip nullish or blank public content slugs instead of creating `/undefined`, `/null`, or trailing-slash detail URLs.
  - Invalid public content dates fall back to the sitemap generation timestamp instead of emitting `Invalid Date`.

## Intentionally Not Changed

- Backend behavior and API contracts.
- AI, WorkVideo upload, media validation, dark mode, public API error-boundary UI, and pagination/search UI.
- Broad HTML parser rewrites beyond the existing sanitizer helper.
- Browser/E2E coverage, because the changed behavior is deterministic at helper/server module level.

## Behavior Bugs Found

- Protocol-relative `href` and `src` values were accepted by the DOM sanitizer because any string starting with `/` was treated as relative.
- Server-side sanitizer fallback could leak unquoted event handlers and unquoted `javascript:` URL attributes.
- Server-side sanitizer fallback could preserve protocol-relative image/link URLs.
- Sitemap generation could emit `Invalid Date` for malformed `publishedAt` values.
- Sitemap generation could emit public detail URLs ending in `/undefined`, `/null`, or a blank detail segment when API payloads were malformed.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx skills find nextjs security testing` | Passed | Found external security/Next.js skills; no new skill was installed. |
| `npm test -- --run src/test/html-sanitizer.test.ts src/test/sitemap.test.ts` | Failed before fixes, then passed | Final focused run: 2 files, 4 tests. |
| `npm test -- --run src/test/pact/public-api-consumer.pact.test.ts` | Passed | Rerun after one transient full-suite Pact work-list failure; focused Pact run passed with 1 file and 6 tests. |
| `npm test -- --run` | Passed | Final run passed with 71 files and 486 tests. Known Pact V3 warnings and jsdom navigation warning appeared. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Remaining Sanitization And Indexing Gaps

- Public `generateMetadata` branches for blog/work API failure, null detail, blank social images, and malformed path inputs still need focused server module coverage.
- Robots metadata remains simple and low-risk but is not directly unit-tested.
- The sanitizer still intentionally uses a constrained regex fallback on the server rather than a full DOM parser; future changes should stay focused on observable unsafe output.
- Public list/card date formatting remains component-local and is not yet covered as a shared date helper.

## Next Recommended Batch

Proceed to `Frontend Batch 13 - Public Metadata and Server Route Fallback Reinforcement`.

Recommended scope: frontend-only Vitest server module tests for public blog/work `generateMetadata` fallback behavior, notFound/null-detail metadata, social image normalization, path/canonical safety, and no `undefined`/`null` user-facing metadata. Avoid public error-boundary UI, pagination/search UI, AI, WorkVideo upload, media validation, and browser-only tests unless a true browser-only behavior appears.
