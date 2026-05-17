# Frontend Batch 27 - Admin Image Upload Failure Sanitization Expansion

Date: 2026-04-28

## Summary

Batch 27 expanded upload failure sanitization to Home profile image uploads and Blog/Tiptap inline image uploads. Technical storage/provider details now resolve to safe upload failure copy while preserving editor content, Home form state, existing image previews, and retry behavior.

Vitest component/helper tests covered the changed behavior deterministically. Playwright was not rerun in this batch because Batch 26 confirmed the local Docker/backend environment is unavailable.

## Tests Added Or Reinforced

- `src/test/admin-editor-exceptions.test.tsx`
  - Home profile image upload failures sanitize Cloudflare/R2/storage/stack details.
  - Home profile image upload failures sanitize S3/bucket/storage/provider details while preserving headline, intro text, and the existing profile image preview.
  - Existing retry coverage still verifies a subsequent upload can succeed after a failed image upload.
- `src/test/tiptap-editor.test.tsx`
  - Tiptap inline image upload rejection logs a safe upload Error rather than raw storage/provider/stack details.
  - Existing coverage still verifies failed inline image uploads do not insert broken images and retry can insert the later successful image.

## Production Files Changed

- `src/components/admin/HomePageEditor.tsx`
  - Applied `sanitizeAdminUploadError` to profile image upload response failures and thrown `Error` failures.
- `src/components/admin/tiptap-editor/upload.ts`
  - Applied `sanitizeAdminUploadError` to inline editor image upload response failures and fetch rejections.

## Intentionally Not Changed

- Backend behavior, API contracts, upload endpoints, storage configuration, and seeded data.
- Blog save behavior, AI behavior, dark mode, pagination/search UI, and browser-only routing behavior.
- User-actionable validation messages such as invalid image file type messages.
- Full e2e execution, because Docker CLI and backend port 8080 were confirmed unavailable in Batch 26.

## Behavior Bugs Found

- Home profile image upload failures could show raw Cloudflare/R2/storage/stack/status details.
- Home profile image upload failures could show raw S3/bucket/storage/provider/status details.
- Tiptap inline image upload rejections could propagate raw storage/provider/stack details into the logged Error path.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx skills find react image upload failure sanitization testing` | Passed | Results included general file upload/sanitization skills; no new skill was installed. |
| `npm test -- --run src/test/admin-editor-exceptions.test.tsx src/test/tiptap-editor.test.tsx` | Failed before fixes, then passed | RED run failed with 3 upload failure assertions. Final focused Batch 27 slice passed with 2 files and 26 tests. |
| `npm test -- --run` | Passed | Final run passed with 78 files and 528 tests. Known Pact V3 warnings and jsdom navigation warning appeared. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Remaining Image Upload Gaps

- Blog Notion workspace inline image upload behavior shares Tiptap coverage but does not have a dedicated workspace-level upload failure test.
- Auto-generated thumbnail upload failures in Work video thumbnail generation are still separate from direct image upload controls.
- Full e2e still needs Docker Desktop WSL integration or an already running backend on `127.0.0.1:8080`.

## Next Recommended Batch

Proceed to `Frontend Batch 28 - Admin Video Secondary Failure Sanitization Reinforcement`.

Recommended scope: frontend-only Vitest component tests for Work video remove/reorder/auto-thumbnail secondary failure messages where frontend-owned. Verify failures preserve video/editor state, avoid raw backend/storage details, and do not leak `undefined`, `null`, stack traces, SQL/provider names, or broken video labels. Avoid AI behavior, dark mode, pagination/search UI broadening, and browser-only tests unless a true browser-only behavior appears. Re-attempt full e2e only after Docker/backend availability is confirmed.
