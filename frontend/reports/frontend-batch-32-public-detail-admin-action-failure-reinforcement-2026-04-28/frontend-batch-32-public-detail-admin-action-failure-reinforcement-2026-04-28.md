# Frontend Batch 32 - Public Detail Admin Action Failure Reinforcement

Date: 2026-04-28

## Summary

Batch 32 reinforced public detail admin action shells for Blog and Work detail pages. Editor payload load failures already render safe fallback panels, and delete mutation failures now sanitize technical backend/provider details before toast output while preserving the public page and retry controls.

Vitest component tests covered the behavior deterministically. Playwright was not rerun because this batch did not change browser routing/history behavior and the Docker/backend e2e blocker remains unresolved.

## Tests Added Or Reinforced

- `src/test/public-detail-admin-actions.test.tsx`
  - Blog detail editor payload failures render safe fallback copy without raw backend details.
  - Blog detail delete technical failures sanitize SQL/status/stack/backend details and avoid push/refresh/success.
  - Work detail editor payload failures render safe fallback copy without raw backend details.
  - Work detail delete technical failures sanitize provider/status/stack/backend details and avoid push/refresh/success.
- `src/test/inline-blog-editor-section.test.tsx`
  - Included in focused GREEN regression coverage for inline Blog delete sanitization.
- `src/test/inline-work-editor-section.test.tsx`
  - Included in focused GREEN regression coverage for inline Work delete sanitization.

## Production Files Changed

- `src/components/admin/PublicBlogDetailAdminActions.tsx`
  - Applied `sanitizeAdminMutationError` to Blog detail delete failures.
- `src/components/admin/PublicWorkDetailAdminActions.tsx`
  - Applied `sanitizeAdminMutationError` to Work detail delete failures.

## Behavior Bugs Found

- Public Blog detail delete failures could show raw SQL/status/stack/backend details.
- Public Work detail delete failures could show raw provider/status/stack/backend details.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx skills find nextjs dynamic public detail admin action testing` | Passed | Results were general/low-install Next.js/admin skills; no new skill was installed. |
| `npm test -- --run src/test/public-detail-admin-actions.test.tsx` | Failed before fixes | RED run failed with 2 raw technical delete failure assertions; load fallback tests passed. |
| `npm test -- --run src/test/public-detail-admin-actions.test.tsx src/test/inline-blog-editor-section.test.tsx src/test/inline-work-editor-section.test.tsx` | Passed | Focused GREEN run passed with 3 files and 11 tests. |
| `npm test -- --run` | Passed | Final run passed with 79 files and 542 tests. Known Pact V3 warnings and jsdom navigation warning appeared. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Remaining Public Detail Gaps

- Safe return-to success behavior is covered by local guards in production but not yet directly asserted in component tests.
- Browser session gate behavior for public admin affordances is still covered separately and can be revalidated in e2e once Docker/backend is available.
- Full e2e still needs Docker Desktop WSL integration or an already running backend on `127.0.0.1:8080`.

## Next Recommended Batch

Proceed to `Frontend Batch 33 - Public Detail Return-To Success Reinforcement`.

Recommended scope: frontend-only component tests for Blog/Work public detail admin delete success navigation. Assert unsafe `returnTo` values are rejected, local return paths are preserved, related page fallbacks are deterministic, and no protocol-relative navigation can occur. Avoid AI behavior, dark mode, media validation, pagination/search UI broadening, and browser-only tests unless required.
