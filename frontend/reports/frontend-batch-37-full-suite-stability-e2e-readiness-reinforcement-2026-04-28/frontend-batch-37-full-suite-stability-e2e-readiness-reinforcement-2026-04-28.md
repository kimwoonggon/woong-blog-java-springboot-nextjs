# Frontend Batch 37 - Full-Suite Stability and E2E Readiness Reinforcement

Date: 2026-04-28

## Summary

Batch 37 added a deterministic e2e readiness check before expensive Playwright runs and stabilized the full Vitest command by bounding worker count. The readiness command now reports Docker, backend health URL, and frontend URL blockers explicitly, including the current Docker Desktop WSL integration blocker.

No production UI behavior changed.

## Tests Added Or Reinforced

- `src/test/e2e-readiness.test.ts`
  - Verifies `BACKEND_PUBLISH_PORT` is honored when building backend health URLs.
  - Verifies Docker Desktop WSL integration failures are reported as blockers.
  - Verifies healthy local HTTP endpoints are reported as ready.
  - Verifies unreachable backend/frontend endpoints do not leak stack traces.
  - Verifies aggregate readiness blocks full e2e when one dependency is unavailable.

## Production Files Changed

- None.

## Test Infrastructure Files Changed

- `scripts/check-e2e-readiness.mjs`
  - Added injectable Docker and HTTP readiness checks.
  - Added sanitized CLI output for local e2e prerequisites.
- `package.json`
  - Added `npm run test:e2e:readiness`.
  - Updated `npm test` to use `vitest --pool=threads --maxWorkers=4`.
- `docs/e2e-readiness.md`
  - Documented readiness usage, default URLs, alternate backend port flow, and Docker WSL integration blocker.

## Behavior Bugs Found

- No production behavior bugs were found.
- Full-suite stability issue found: the previous unbounded Vitest worker startup pattern could pass all files but still fail the run with worker startup timeouts under WSL load.
- A direct switch to the `forks` pool worsened worker startup failures. The final fix keeps the `threads` pool and bounds workers to 4.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx skills find vitest playwright e2e readiness stability docker` | Passed | Results were general Playwright/e2e skills; no new skill was installed. |
| `npm test -- --run src/test/e2e-readiness.test.ts` | Failed once, then passed | RED failed before helper implementation. Final focused run passed with 1 file and 5 tests. |
| `npm run test:e2e:readiness` | Blocked as expected | Reported Docker daemon, backend health URL, and frontend URL blockers without stack traces. |
| `npm test -- --run src/test/e2e-readiness.test.ts src/test/tiptap-editor.test.tsx` | Passed | Worker-bound focused stability run passed with 2 files and 17 tests. |
| `npm test -- --run` | Passed | Final run passed with 81 files and 559 tests using `--maxWorkers=4`. Known Pact V3 warnings and jsdom navigation warning appeared. |
| `npm run lint` | Passed | 0 errors, 6 existing warnings. |
| `npm run typecheck` | Passed | `tsc --noEmit` completed successfully after helper env typing was narrowed. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `git diff --check` | Passed | No whitespace errors. |

## Remaining Gaps

- Full Playwright e2e still cannot run in this WSL distro until Docker Desktop WSL integration is enabled or an equivalent local stack is already reachable.
- The readiness command confirms current local blockers but does not start Docker or the dev stack itself.
- The known jsdom `Not implemented: navigation to another Document` warning remains and should be isolated in a later test-infrastructure cleanup batch.
- Full Vitest now passes reliably in this run, but it takes roughly 14 minutes with bounded workers.

## Next Recommended Batch

Proceed to `Frontend Batch 38 - JSDOM Navigation Warning Isolation`.

Recommended scope: frontend test infrastructure only. Identify which unit/component test triggers the jsdom navigation warning, replace real document navigation with a deterministic mock or behavior assertion where appropriate, and keep production behavior unchanged. Do not broaden into product feature coverage, AI behavior, media validation, dark mode, or Playwright unless the warning source proves browser-only.
