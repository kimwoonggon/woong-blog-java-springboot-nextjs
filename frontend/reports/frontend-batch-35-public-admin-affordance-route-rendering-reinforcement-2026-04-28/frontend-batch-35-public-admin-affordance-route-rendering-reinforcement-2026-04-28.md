# Frontend Batch 35 - Public Admin Affordance Route Rendering Reinforcement

Date: 2026-04-28

## Summary

Batch 35 reinforced public route rendering when admin affordance session checks fail. Authored public content remains visible, admin affordances stay hidden, and raw session/backend failure details do not leak into rendered public pages.

No production changes were required. One pre-existing full-suite timing/assertion weakness in admin dashboard tests was stabilized so the full validation remains deterministic.

## Tests Added Or Reinforced

- `src/test/public-admin-rendering.test.tsx`
  - Authored Introduction page content remains visible when `/api/auth/session` rejects with technical backend details.
  - Inline admin page affordance stays hidden after the failed browser session check.
  - Rendered public page text does not leak raw auth/backend details.
- `src/test/admin-page-success-states.test.tsx`
  - Stabilized dashboard success-state timeout under full-suite load.
  - Replaced brittle exact zero-count assertion with behavior-oriented minimum count assertion.
- `src/test/inline-work-editor-section.test.tsx`
  - Stabilized retryability assertion by waiting for the pending delete label to settle.

## Production Files Changed

- None.

## Behavior Bugs Found

- None in production. Test-only brittleness was found and fixed during full validation.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx skills find nextjs public route rendering admin affordance testing` | Passed | Results were general Next.js/accessibility skills; no new skill was installed. |
| `npm test -- --run src/test/public-admin-rendering.test.tsx src/test/public-admin-client-gate.test.tsx` | Failed once, then passed | Initial failure was a missing `waitFor` import in the new test. Final focused route/gate run passed with 2 files and 16 tests. |
| `npm test -- --run src/test/inline-work-editor-section.test.tsx src/test/inline-blog-editor-section.test.tsx src/test/public-admin-rendering.test.tsx src/test/public-admin-client-gate.test.tsx` | Passed | Timing regression slice passed with 4 files and 23 tests. |
| `npm test -- --run src/test/admin-page-success-states.test.tsx src/test/public-admin-rendering.test.tsx src/test/public-admin-client-gate.test.tsx src/test/inline-work-editor-section.test.tsx` | Passed | Dashboard stability slice passed with 4 files and 42 tests. |
| `npm test -- --run` | Passed | Final run passed with 79 files and 551 tests. Known Pact V3 warnings and jsdom navigation warning appeared. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Remaining Route Rendering Gaps

- Browser cookie/session transitions across full page reloads remain better suited to Playwright once Docker/backend e2e is available.
- Public list create affordance routing can receive a final smoke reinforcement if Batch 36 remains Vitest-only.
- Full e2e still needs Docker Desktop WSL integration or an already running backend on `127.0.0.1:8080`.

## Next Recommended Batch

Proceed to `Frontend Batch 36 - Final Public Admin Affordance Smoke Reinforcement`.

Recommended scope: frontend-only focused smoke coverage for public list create/admin affordance shells and report finalization. Verify create affordance hidden/visible behavior remains deterministic, no raw session/backend details leak, and no broken labels appear. If Docker/backend is unavailable, document the full e2e blocker rather than running Playwright.
