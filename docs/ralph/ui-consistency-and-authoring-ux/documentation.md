# Documentation

_Last updated: 2026-03-26T04:20:00Z_

**Current milestone**: Complete

## How to Run
1. Start the stack for browser verification:
   - `docker compose up -d --build frontend backend nginx`
2. Run build/lint/typecheck before visual verification:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build`
3. Run targeted Playwright suites for public/admin UX regression:
   - `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test ... --workers=1`

## How to Demo
1. Open `/works` and `/blog` and compare card consistency across different content lengths.
2. Open a work detail page and a blog detail page and inspect the related-content section for stable ordering and spacing.
3. Log in as admin and create a new work/blog through the refreshed editor flow.
4. Upload media through the refreshed upload affordance.
5. Resize to a mobile-ish viewport and confirm list/detail/editor usability remains coherent.

## Decisions Log
| Timestamp | Milestone | Decision | Reasoning |
|-----------|-----------|----------|-----------|
| 2026-03-26T03:55:00Z | M1 | Replace visually jagged masonry-like listing behavior with a stable card/grid system | The current `columns-*` Works layout and uneven list/detail related cards create unpredictable reading flow and vertical jumpiness. |
| 2026-03-26T03:55:00Z | M1 | Default new blog/work creation to immediate publish | The current create-then-publish step adds friction for the dominant single-author workflow described in the request. |
| 2026-03-26T03:55:00Z | M1 | Keep publish state as an editable attribute after creation | Simplifying the default create path should not remove later control over visibility. |
| 2026-03-26T03:55:00Z | M1 | Treat mobile/responsive consistency as a first-class requirement, not polish | The request explicitly calls out discomfort on dynamic sizes and mobile viewing. |
| 2026-03-26T04:20:00Z | M2 | Unify Works/Blog list cards around stable grid rows and clamped content regions | Predictable card height and image ratio matter more than masonry density for readability and mobile consistency. |
| 2026-03-26T04:20:00Z | M3 | Auto-publish new work/blog entries by default while leaving edit-time publish control intact | The common author path is “write and ship now,” but later visibility control is still valuable. |
| 2026-03-26T04:20:00Z | M3 | Make upload affordances explicit instead of assuming users discover drag/drop behavior | Everyday authoring should be click-first and obvious, with drag/drop treated as an enhancement. |
| 2026-03-26T04:20:00Z | M4 | Verify responsive stability with explicit mobile and desktop browser assertions | Visual consistency claims should be backed by browser geometry checks, not just subjective inspection. |

## Known Issues
- `tests/manual-auth.spec.ts` remains a manual-only skipped path outside this UI pass.
- `Newtonsoft.Json 9.0.1` advisory debt remains unrelated but still open in the repo.
- `npm run typecheck` can be polluted by stale `.next/dev` artifacts in this environment; the clean verification path removes `.next/dev` before re-running typecheck.
