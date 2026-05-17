# Documentation

_Last updated: 2026-03-26T11:20:00Z_

**Current milestone**: Complete (M1-M4)

## How to Run
1. Standard local runtime:
   - `docker compose up -d --build frontend backend nginx`
2. HTTPS local runtime:
   - `./scripts/setup-local-https.sh`
   - `NGINX_DEFAULT_CONF=./nginx/local-https.conf docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build`
3. Main checks:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build`
   - targeted `dotnet test` / `vitest` / `playwright` commands from `plans.md`

## How to Demo
1. Verify admin navigation includes the new Members entry.
2. Open the Members page and confirm only privacy-safe account activity fields are shown.
3. Open `/admin/pages` on `https://localhost`, upload `tests/fixtures/resume.pdf`, and confirm `/resume` exposes the linked file.
4. Re-run the same resume flow on the normal HTTP/local runtime.
5. Confirm the push-safety checklist (`git remote -v`, ignored cache/artifact paths, clean staging intent) before the final `git push origin HEAD`.

## Decisions Log
| Timestamp | Milestone | Decision | Reasoning |
|-----------|-----------|----------|-----------|
| 2026-03-26T10:55:47Z | M1 | Treat member listing as read-only in this pass | The user wants visibility into who joined the page, but the current codebase has no member-management contract or privacy review for mutations. |
| 2026-03-26T10:55:47Z | M1 | Treat push safety as a first-class deliverable | The branch is close to release and the user explicitly asked to avoid uploading security-sensitive/local artifacts. |
| 2026-03-26T10:55:47Z | M1 | Verify the resume upload bug on HTTPS explicitly | The reported failure is specific to admin mode under HTTPS, so HTTP-only checks are insufficient. |
| 2026-03-26T11:20:00Z | M2 | Show only privacy-safe member activity fields | Existing `Profile` / `AuthSession` data is enough for a useful overview without exposing raw session/network identifiers. |
| 2026-03-26T11:20:00Z | M3 | Fix HTTPS upload by making the HTTPS compose overlay mount `nginx/local-https.conf` directly | The admin upload path itself already worked; the secure local runtime was not consistently booting the TLS nginx config. |
| 2026-03-26T11:20:00Z | M4 | Keep push readiness explicit instead of auto-pushing from a dirty branch | The repo still contains other in-progress modifications, so final staging/push intent must remain deliberate even after verification is green. |

## Known Issues
- Members page is intentionally read-only in this pass.
- HTTPS resume upload now depends on the HTTPS compose overlay being started (`docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build`).
- Final push-to-origin should still be gated by deliberate staging because the branch contains broader ongoing changes outside this Ralph slice.
