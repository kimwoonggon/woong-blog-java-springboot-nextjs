# Frontend Batch 7 - Form and Media Validation Edge Case Reinforcement

Date: 2026-04-27

## Summary

Batch 7 added deterministic frontend coverage for form/media validation edge cases across resume PDF upload, Tiptap inline image upload, work thumbnail/icon/video upload, and home profile image upload.

Production changes were minimal:

- Added shared file validation helpers for images, PDFs, and MP4 videos.
- Wired the helpers into Resume, Home, and Work editors.
- Rejected invalid files before upload/staging, preserved unrelated form state, and avoided false success UI on failed upload paths.

## Intentionally Not Changed

- Backend upload behavior and API contracts were not changed.
- AI tests and public API error-boundary tests were not expanded.
- No real external storage calls or real large upload files were used.
- No browser upload specs were changed because component tests covered the frontend-owned validation deterministically.
- No maximum file size behavior was added because no frontend-owned size limit exists today.

## Goal Verification

- Resume PDF invalid type/extension, empty file, failed upload, no false success, and retry behavior are covered.
- Tiptap inline image non-image rejection, upload failure, content preservation, no broken image insertion, and retry behavior are covered.
- Work thumbnail/icon invalid type rejection, upload failure state preservation, no false success, icon remove, and video invalid type rejection are covered.
- Home image invalid type rejection, upload failure state preservation, no false success, and retry behavior are covered.
- Shared file validation is covered with table-driven tests for type, extension, empty file, unknown MIME, and uppercase extension.

## Behavior Bugs Found

- Home image upload accepted non-image files when the browser `accept` hint was bypassed.
- Work thumbnail/icon upload accepted non-image files when the browser `accept` hint was bypassed.
- Work HLS video staging accepted unsupported non-MP4 files when the browser `accept` hint was bypassed.
- Resume validation accepted PDF-like files when only MIME or extension matched, and did not reject empty PDFs client-side.

## Validations

| Command | Result |
| --- | --- |
| `npm test -- --run src/test/resume-editor.test.tsx` | Passed: 1 file, 13 tests |
| `npm test -- --run src/test/tiptap-editor.test.tsx` | Passed: 1 file, 11 tests |
| `npm test -- --run src/test/work-editor.test.tsx` | Passed: 1 file, 32 tests |
| `npm test -- --run src/test/file-validation.test.ts src/test/admin-editor-exceptions.test.tsx` | Passed: 2 files, 31 tests |
| `npm test -- --run` | Passed: 67 files, 426 tests |
| `npm run lint` | Passed: 0 errors, 6 existing warnings |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `git diff --check` | Passed |

## Risks and Follow-ups

- Oversized upload tests remain deferred until product-owned frontend size limits are defined.
- Browser E2E upload validation was not expanded because component coverage is deterministic and avoids live storage.
- Deeper direct video upload target progress/retry validation remains WorkVideo-specific and should be handled separately if needed.

## Recommendation

Proceed to the next batch: loading and empty states for route-level skeletons and deterministic empty list/member/dashboard states.
