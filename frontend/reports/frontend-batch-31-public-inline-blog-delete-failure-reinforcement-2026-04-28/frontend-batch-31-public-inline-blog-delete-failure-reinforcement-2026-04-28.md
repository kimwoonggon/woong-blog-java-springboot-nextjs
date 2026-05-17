# Frontend Batch 31 - Public Inline Blog Delete Failure Reinforcement

Date: 2026-04-28

## Summary

Batch 31 reinforced the public inline Blog delete failure state. Technical backend failure strings are now sanitized before toast output, while the public page remains in place and the delete action stays retryable.

Vitest component tests covered the behavior deterministically. Playwright was not rerun because this batch did not change browser routing/history behavior and the Docker/backend e2e blocker remains unresolved.

## Tests Added Or Reinforced

- `src/test/inline-blog-editor-section.test.tsx`
  - Public inline Blog delete technical failures sanitize SQL/status/stack/backend details.
  - Failed delete does not push, refresh, or show success.
  - Delete action remains enabled for retry after the failed mutation.
- `src/test/inline-work-editor-section.test.tsx`
  - Included in the focused GREEN slice to preserve matching inline Work delete failure behavior from Batch 30.

## Production Files Changed

- `src/components/admin/InlineBlogEditorSection.tsx`
  - Applied `sanitizeAdminMutationError` to public inline Blog delete failures.

## Behavior Bugs Found

- Public inline Blog delete failures could show raw SQL/status/stack/backend details in the toast message.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx skills find public inline blog delete failure react testing` | Passed | Results were low-install/general React testing skills; no new skill was installed. |
| `npm test -- --run src/test/inline-blog-editor-section.test.tsx` | Failed before fixes | RED run failed with 1 raw technical delete failure assertion. |
| `npm test -- --run src/test/inline-blog-editor-section.test.tsx src/test/inline-work-editor-section.test.tsx` | Passed | Focused GREEN run passed with 2 files and 7 tests. |
| `npm test -- --run` | Passed | Final run passed with 78 files and 538 tests. Known Pact V3 warnings and jsdom navigation warning appeared. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Remaining Public Inline Blog Gaps

- `PublicBlogDetailAdminActions` has a separate dynamic/client-gate fetch boundary and should receive dedicated coverage for loaded-detail delete failure sanitization.
- Public inline Blog editor load failure text is safe, but detailed retry/browser session behavior can be revisited with e2e once Docker/backend availability is restored.
- Full e2e still needs Docker Desktop WSL integration or an already running backend on `127.0.0.1:8080`.

## Next Recommended Batch

Proceed to `Frontend Batch 32 - Public Detail Admin Action Failure Reinforcement`.

Recommended scope: frontend-only component coverage for `PublicBlogDetailAdminActions` and matching public detail admin action shells where testable. Cover loaded-detail delete failure sanitization, editor payload load failure fallback text, safe return-to behavior that remains local, and no raw backend details. Avoid AI behavior, dark mode, media validation, pagination/search UI broadening, and browser-only tests unless required.
