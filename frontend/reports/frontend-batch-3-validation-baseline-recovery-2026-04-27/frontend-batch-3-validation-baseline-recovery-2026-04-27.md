# Frontend Batch 3 Validation Baseline Recovery Audit

## Summary

Recovered the frontend validation baseline after Batch 3 without adding Batch 4 coverage or changing backend behavior.

Changed production/test-infrastructure files:

- `scripts/dev-up.sh`
- `src/app/(public)/works/[slug]/page.tsx`
- `src/app/(public)/works/[slug]/work-detail-metadata.ts`
- `src/test/work-detail-metadata.test.ts`

Supporting artifacts:

- `todolist-2026-04-27.md`
- `frontend/reports/frontend-test-coverage-audit-2026-04-26/frontend-test-coverage-audit-2026-04-26.md`
- `frontend/reports/frontend-batch-3-workvideo-failure-reinforcement-2026-04-27/`
- `frontend/reports/frontend-batch-3-validation-baseline-recovery-2026-04-27/`
- `backend/reports/frontend-batch-3-validation-baseline-recovery-2026-04-27/prechange-backup/`

## What Changed

- Extracted work-detail metadata construction into a small deterministic helper so the metadata test no longer imports the full work detail page tree.
- Kept `generateMetadata` behavior unchanged by delegating to the extracted helper.
- Added a `scripts/dev-up.sh` preflight that detects an occupied Windows-side backend publish port before Docker compose builds and fails with actionable diagnostics.
- Revalidated Playwright with the backend container published on host port `18080` while keeping the frontend/nginx URL at `http://127.0.0.1:3000`.
- Mirrored the earlier Batch 3 frontend report from the misplaced `backend/reports/...` path to the canonical `frontend/reports/...` path.

## Intentionally Not Changed

- No Batch 4 tests were added.
- No AI tests or public API error-boundary tests were added.
- No WorkVideo assertions were weakened or skipped.
- No backend behavior or port mapping defaults were changed.
- The stale Windows `8080` portproxy was not removed because it requires elevated Windows permissions.
- Existing unrelated dirty and untracked files were not reverted or cleaned.

## Root Causes

Vitest full-suite timeout:

`src/test/work-detail-metadata.test.ts` imported `src/app/(public)/works/[slug]/page.tsx` only to exercise metadata generation. That server-component page import pulled in a broad UI/dependency tree and passed in isolation, but timed out under full threaded Vitest contention. Extracting and testing `buildWorkDetailMetadata` preserved the behavior assertions while removing the slow import path.

Docker/backend `8080` failure:

Windows IP Helper (`svchost`, PID 4812 during investigation) owned `0.0.0.0:8080` through a portproxy rule forwarding to `172.25.159.91:8080`, where no WSL listener existed. Docker Desktop could not publish backend `127.0.0.1:8080`. Removing the rule requires elevated PowerShell, so validation used `BACKEND_PUBLISH_PORT=18080 ./scripts/dev-up.sh`.

## Verification Against Goals

- Full Vitest is deterministic again.
- Focused Batch 3 component tests still pass.
- Focused WorkVideo Playwright tests pass without real R2, S3, Cloudflare, ffmpeg, YouTube, or external media providers.
- Full Playwright passes against an intentionally started local compose stack.
- The compose stack was stopped after validation.
- Full lint, typecheck, build, and diff checks pass.

## Validation Results

- `npm test -- --run src/test/work-detail-metadata.test.ts`: passed, 1 file / 2 tests.
- `npm test -- --run`: passed, 63 files / 344 tests.
- `docker compose -f docker-compose.dev.yml down --remove-orphans`: passed.
- `docker compose -f docker-compose.dev.yml ps`: passed; no project services were running before recovery.
- `./scripts/dev-up.sh`: failed fast by design because Windows side already listened on `127.0.0.1:8080`.
- `BACKEND_PUBLISH_PORT=18080 ./scripts/dev-up.sh`: passed; backend published as `127.0.0.1:18080->8080/tcp`.
- `npm test -- --run src/test/work-editor.test.tsx src/test/work-video-player.test.tsx`: passed, 2 files / 39 tests.
- `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e -- tests/admin-work-video-create-flow.spec.ts tests/admin-work-video-edit-flow.spec.ts tests/admin-work-video-drag-order.spec.ts tests/admin-work-video-s3-compatible.spec.ts tests/public-work-videos.spec.ts`: passed, 10 tests.
- `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e`: passed, 409 tests / 6 skipped.
- `npm run lint`: passed, 0 errors / 6 existing warnings.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.
- `docker compose -f docker-compose.dev.yml down --remove-orphans`: passed; stopped the alternate-port stack.
- `docker compose -f docker-compose.dev.yml ps`: passed; no project services remain running.

## Risks And Yellow Flags

- Default `./scripts/dev-up.sh` remains blocked on this machine until the stale Windows `8080` portproxy is removed from an elevated PowerShell session.
- The alternate backend publish port must be documented when using `PLAYWRIGHT_EXTERNAL_SERVER=1`; otherwise tests can accidentally target an absent backend.
- The earlier Batch 3 report still exists under `backend/reports/...` as a legacy misplaced copy.

## Recommendation

Batch 4 can safely start after using `BACKEND_PUBLISH_PORT=18080 ./scripts/dev-up.sh` with `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000`, or after deleting the stale Windows `8080` portproxy and using the default startup path.
