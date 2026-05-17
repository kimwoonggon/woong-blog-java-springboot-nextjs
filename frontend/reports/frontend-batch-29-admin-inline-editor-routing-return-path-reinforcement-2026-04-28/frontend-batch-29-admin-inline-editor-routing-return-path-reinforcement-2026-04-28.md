# Frontend Batch 29 - Admin Inline Editor Routing and Return Path Reinforcement

Date: 2026-04-28

## Summary

Batch 29 reinforced public inline Work editor return path behavior. Unsafe protocol-relative `returnTo` values are now rejected and removed from fallback public detail navigation, while sanitized save failures preserve inline editor state and do not navigate.

Vitest component tests covered the changed behavior deterministically. Playwright was not rerun because the Docker/backend blocker remains unresolved.

## Tests Added Or Reinforced

- `src/test/work-editor.test.tsx`
  - Unsafe public inline Work `returnTo=//...` is not pushed after edit save.
  - Fallback public detail navigation drops the unsafe `returnTo` query instead of carrying it forward.
  - Sanitized inline Work save failures preserve title/body state and avoid push/replace/refresh.
- `src/test/blog-editor.test.tsx`
  - Included in the focused slice to preserve existing Blog inline return path behavior.

## Production Files Changed

- `src/components/admin/WorkEditor.tsx`
  - Added safe `returnTo` resolution that rejects empty, non-local, and protocol-relative paths.
  - Added public detail query filtering so fallback detail replaces do not retain `returnTo`.

## Behavior Bugs Found

- Work inline edit save could navigate to a protocol-relative `returnTo` such as `//evil.example`.
- Work inline detail fallback navigation could retain unsafe `returnTo` in the resulting public detail URL.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx skills find nextjs inline editor routing return path testing` | Passed | Results were general Next.js skills; no new skill was installed. |
| `npm test -- --run src/test/work-editor.test.tsx` | Failed before fixes | RED run failed with 1 unsafe returnTo assertion. |
| `npm test -- --run src/test/work-editor.test.tsx src/test/blog-editor.test.tsx` | Passed | Focused GREEN run passed with 2 files and 50 tests. |
| `npm test -- --run` | Passed | Final run passed with 78 files and 532 tests. Known Pact V3 warnings and jsdom navigation warning appeared. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Remaining Inline Routing Gaps

- Browser history/back-button behavior remains better suited to Playwright once Docker/backend e2e is available.
- Inline Blog route fallback is already covered for unsafe returnTo, but more unsaved dialog browser integration can be revisited during e2e stabilization.
- Full e2e still needs Docker Desktop WSL integration or an already running backend on `127.0.0.1:8080`.

## Next Recommended Batch

Proceed to `Frontend Batch 30 - Admin Remaining Mutation Confirmation Failure Reinforcement`.

Recommended scope: frontend-only Vitest component tests for remaining admin mutation confirm/delete/remove retry paths not already covered by upload/save/video batches. Verify failed mutations preserve visible state, avoid raw backend details, and do not leak `undefined`, `null`, stack traces, SQL/provider names, or broken labels. Avoid AI behavior, dark mode, media validation, pagination/search UI broadening, and browser-only tests unless truly required.
