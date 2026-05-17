# Frontend Batch 33 - Public Detail Return-To Success Reinforcement

Date: 2026-04-28

## Summary

Batch 33 reinforced public Blog and Work detail delete success navigation. Existing production guards already preserve safe local `returnTo` values, reject protocol-relative `returnTo` values, and fall back to deterministic related page URLs.

No production changes were required. Vitest component tests covered the route decisions deterministically. Playwright was not rerun because this batch did not change browser routing/history behavior and the Docker/backend e2e blocker remains unresolved.

## Tests Added Or Reinforced

- `src/test/public-detail-admin-actions.test.tsx`
  - Blog detail delete success preserves a safe local `returnTo` path.
  - Blog detail delete success rejects protocol-relative `returnTo` and falls back to `relatedPage`.
  - Work detail delete success preserves a safe local `returnTo` path.
  - Work detail delete success rejects protocol-relative `returnTo` and falls back to `relatedPage`.

## Production Files Changed

- None.

## Behavior Bugs Found

- None. Existing public detail return-to guards behaved correctly under the reinforced tests.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx skills find nextjs returnTo navigation test url safety` | Passed | Results were general/low-install Next.js navigation skills; no new skill was installed. |
| `npm test -- --run src/test/public-detail-admin-actions.test.tsx` | Passed | Focused run passed with 1 file and 8 tests. |
| `npm test -- --run` | Passed | Final run passed with 79 files and 546 tests. Known Pact V3 warnings and jsdom navigation warning appeared. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Remaining Navigation Gaps

- Browser back/forward integration after public detail delete remains better suited to Playwright once Docker/backend e2e is available.
- Public list create/edit success routing can receive a similar local return path sweep if more route-state gaps are found.
- Full e2e still needs Docker Desktop WSL integration or an already running backend on `127.0.0.1:8080`.

## Next Recommended Batch

Proceed to `Frontend Batch 34 - Public Admin Gate Session Failure Reinforcement`.

Recommended scope: frontend-only Vitest coverage for public admin gate/session lookup failure and stale cache behavior. Verify session fetch failures hide admin affordances without raw errors, admin/non-admin role decisions are deterministic, cache reset remains testable, and public content remains visible. Avoid AI behavior, dark mode, media validation, pagination/search UI broadening, and browser-only tests unless required.
