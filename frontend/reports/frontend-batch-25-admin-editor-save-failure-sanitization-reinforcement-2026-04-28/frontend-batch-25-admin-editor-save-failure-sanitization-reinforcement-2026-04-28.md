# Frontend Batch 25 - Admin Editor Save Failure Sanitization Reinforcement

Date: 2026-04-28

## Summary

Batch 25 reinforced admin Blog, Page, and Work editor save failure messages so technical backend details are not shown to users while input state remains intact.

Vitest component tests were sufficient for this scope. No Playwright tests were added or run because no browser-only routing, history, or visual behavior changed.

## Tests Added Or Reinforced

- `src/test/blog-editor.test.tsx`
  - Technical save failures render safe Blog editor error copy and preserve title, excerpt, and body input.
- `src/test/page-editor.test.tsx`
  - Technical save failures render safe Page editor toast copy and preserve title/body input.
- `src/test/work-editor.test.tsx`
  - Technical save failures render safe Work editor error copy and preserve title, period, and body input.

## Production Files Changed

- `src/lib/admin-save-error.ts`
  - Added a small shared sanitizer for technical save failure messages.
- `src/components/admin/BlogEditor.tsx`
  - Blog save failures now sanitize technical response text before rendering and toasting.
- `src/components/admin/PageEditor.tsx`
  - Page save failures now sanitize technical response text before toasting.
- `src/components/admin/WorkEditor.tsx`
  - Work save failures now sanitize technical response payloads before rendering and toasting.

## Intentionally Not Changed

- Backend behavior and API contracts.
- Public pages, public error-boundary UI, pagination/search UI, AI behavior, WorkVideo upload, media validation, and dark mode.
- Non-technical validation messages such as `Unauthorized`, `Forbidden`, and normal backend validation copy.

## Behavior Bugs Found

- Blog editor save failures could show raw SQL/status/stack/provider details.
- Page editor save failure toasts could show raw SQL/status/stack/provider details.
- Work editor save failures could show raw SQL/status/stack/provider details.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx skills find react form editor save failure testing` | Passed | Results included low-install form/editor skills; no new skill was installed. |
| `npm test -- --run src/test/page-editor.test.tsx src/test/blog-editor.test.tsx src/test/work-editor.test.tsx` | Failed before fixes, then passed | RED run failed with 3 editor save failure assertions. Final focused Batch 25 slice passed with 3 files and 52 tests. |
| `npm test -- --run` | Passed | Final run passed with 78 files and 525 tests. Known Pact V3 warnings and jsdom navigation warning appeared. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Remaining Editor Gaps

- Upload/video-specific failure messages can still be audited separately without changing save-submit behavior.
- Autosave-specific Blog Notion failure sanitization remains separate from standard editor save paths.
- Success/redirect return-path behavior was not changed in this batch.

## Next Recommended Batch

Proceed to `Frontend Batch 26 - Admin Upload Failure Sanitization Reinforcement`.

Recommended scope: frontend-only Vitest component tests for thumbnail/icon/PDF/video upload failure messages where frontend-owned. Verify upload failures preserve selected form state, avoid raw backend/storage details, and do not leak `undefined`, `null`, stack traces, SQL/provider names, or broken preview labels. Avoid AI behavior, dark mode, pagination/search UI broadening, and browser-only tests unless a true browser-only behavior appears.
