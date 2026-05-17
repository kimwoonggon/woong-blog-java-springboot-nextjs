# Frontend Batch 30 - Admin Remaining Mutation Confirmation Failure Reinforcement

Date: 2026-04-28

## Summary

Batch 30 reinforced remaining frontend-owned admin delete/confirm mutation failure states for Blog and Work list tables and the public inline Work delete action. Technical backend/storage/provider failure strings are now sanitized before user-facing toast output while rows, selection, dialogs, and retry affordances remain intact.

Vitest component tests covered the behavior deterministically. Playwright was not rerun because this batch did not change browser routing/history behavior and the Docker/backend e2e blocker remains unresolved.

## Tests Added Or Reinforced

- `src/test/admin-bulk-table.test.tsx`
  - Single Blog delete technical failures sanitize SQL/status/stack/backend details and keep the row plus retry dialog visible.
  - Single Work delete technical failures sanitize provider/status/stack/backend details and keep the row plus retry dialog visible.
  - Blog bulk delete technical failures sanitize backend details while preserving selected rows and selection summary.
  - Work bulk delete technical/storage failures sanitize provider/storage details while preserving selected rows and selection summary.
- `src/test/inline-work-editor-section.test.tsx`
  - Public inline Work delete technical failures sanitize backend details, avoid navigation/refresh/success toast, and leave the delete action retryable.

## Production Files Changed

- `src/lib/admin-save-error.ts`
  - Added `sanitizeAdminMutationError` for admin mutation failures.
- `src/components/admin/AdminBlogTableClient.tsx`
  - Applied mutation sanitization to single and bulk Blog delete failures.
- `src/components/admin/AdminWorksTableClient.tsx`
  - Applied mutation sanitization to single and bulk Work delete failures.
- `src/components/admin/InlineWorkEditorSection.tsx`
  - Applied mutation sanitization to public inline Work delete failures.

## Behavior Bugs Found

- Admin Blog single and bulk delete failures could show raw SQL/status/stack/backend details.
- Admin Work single and bulk delete failures could show raw provider/storage/status/stack/backend details.
- Public inline Work delete failures could show raw SQL/status/stack/backend details before remaining on the current page.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx skills find react admin mutation delete retry failure testing` | Passed | Results were general mutation/admin React skills; no new skill was installed. |
| `npm test -- --run src/test/admin-bulk-table.test.tsx src/test/inline-work-editor-section.test.tsx` | Failed before fixes, then passed | RED run failed with 5 raw technical delete failure assertions. Focused GREEN run passed with 2 files and 32 tests. |
| `npm test -- --run` | Passed | Final run passed with 78 files and 537 tests. Known Pact V3 warnings and jsdom navigation warning appeared. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Remaining Mutation Gaps

- Public inline Blog delete still has a similar toast catch path and should receive dedicated component coverage if a lightweight boundary is available.
- Resume PDF remove failure sanitization is covered by upload-oriented paths, but broader non-upload admin remove mutations can be revisited if new admin modules are added.
- Full e2e still needs Docker Desktop WSL integration or an already running backend on `127.0.0.1:8080`.

## Next Recommended Batch

Proceed to `Frontend Batch 31 - Public Inline Blog Delete Failure Reinforcement`.

Recommended scope: frontend-only Vitest/component coverage for public inline Blog delete and editor-load failure behavior where frontend-owned. Verify failed delete mutations preserve the public page, avoid raw backend details, do not navigate/refresh on failure, and keep admin affordances accessible. Avoid AI behavior, dark mode, media validation, pagination/search UI broadening, and browser-only tests unless required.
