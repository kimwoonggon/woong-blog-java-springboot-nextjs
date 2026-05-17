# Supabase Runtime Decommission Matrix

_Last updated: 2026-03-24_

## Official Supported Runtime Path

- **Official runtime for this repository:** `docker compose up -d --build` behind `nginx`.
- **Runtime truth:**
  - `nginx` routes `/api/*` and `/media/*` to the ASP.NET Core backend.
  - Next.js is the UI shell and server-rendering surface, not the source of truth for auth, uploads, or content mutation APIs.
- **`next dev` / frontend-only mode:** may remain useful for isolated UI work, but it is **not** the supported verification path for auth, admin mutations, uploads, or final regression gates during/after this decommission.

## Why this document exists

The repo was migrated away from a Supabase-centered runtime, but several compatibility bridges still remain in `src/`. This file records:
1. which Supabase-linked paths are left,
2. whether they are authoritative, dead-through-nginx, or only dev fallback,
3. what backend-owned replacement each path must point to,
4. the branch/commit slicing strategy for safe removal.

## Compatibility Matrix

| Legacy path | Current caller(s) | Runtime status | Backend/runtime replacement | Action |
|---|---|---|---|---|
| `src/app/admin/pages/actions.ts` | no in-repo callers beyond self export | dead code / non-authoritative | backend admin pages API via `/api/admin/pages` | remove or rewire, then delete |
| `src/app/api/admin/pages/route.ts` | browser requests to `/api/admin/pages`; tests assert URL only | dead-through-nginx, possible dev-only fallback | ASP.NET Core admin page update/read path behind nginx `/api/admin/pages` | decommission Next handler |
| `src/app/api/admin/site-settings/route.ts` | browser requests to `/api/admin/site-settings`; tests assert URL only | dead-through-nginx, possible dev-only fallback | ASP.NET Core site settings path behind nginx `/api/admin/site-settings` | decommission Next handler |
| `src/app/api/auth/callback/route.ts` | no active frontend caller; auth entry already points at backend login | stale compatibility path | `backend/src/Portfolio.Api/Controllers/AuthController.cs` + ASP.NET Core OIDC callback ownership | validate then remove |
| `src/app/api/uploads/route.ts` | `src/components/admin/TiptapEditor.tsx`, browser requests to `/api/uploads`, tests assert URL only | dead-through-nginx, possible dev-only fallback | `backend/src/Portfolio.Api/Controllers/UploadsController.cs` behind nginx `/api/uploads` | centralize client path, decommission Next handler |
| `src/lib/supabase/server.ts` | imported only by the legacy paths above | non-authoritative helper | `src/lib/api/server.ts` + backend cookie/session endpoints | delete after callers are gone |
| `src/lib/supabase/client.ts` | no in-repo imports | dead helper | none | delete |
| `src/lib/supabase/admin.ts` | no in-repo imports | dead helper | none | delete |
| `package.json` Supabase deps | lockfile/runtime dependency only | legacy dependency | none once callers are removed | remove in M3 |
| `README.md` / `ARCHITECTURE.md` Supabase claims | contributors/operators | stale docs | current compose/nginx/backend docs | rewrite in M4 |

## File-backed Evidence

- Backend-owned auth launcher: `src/app/login/page.tsx`, `src/lib/api/auth.ts`, `backend/src/Portfolio.Api/Controllers/AuthController.cs`
- Backend-owned session enforcement: `src/app/admin/layout.tsx`, `src/lib/api/server.ts`
- Backend-owned uploads/media: `backend/src/Portfolio.Api/Controllers/UploadsController.cs`
- Backend authority for `/api/*` and `/media/*`: `nginx/default.conf`
- Compose topology with backend internal API origin: `docker-compose.yml`

## Git Execution Map

### Integration branch
- `refactor/supabase-runtime-decommission`

### Suggested commit slices
1. `Inventory remaining Supabase bridges before destructive cleanup`
2. `Cut page/settings/upload/auth compatibility handlers over to backend-owned paths`
3. `Remove dead Supabase helpers and package dependencies`
4. `Rewrite architecture and runbook docs to match the live stack`
5. `Prove zero-runtime-Supabase state and capture merge notes`

### Review rule
- Do not combine handler deletion, dependency removal, and docs rewrite in one opaque commit.
- Keep each slice rollback-safe and independently verifiable.

## Merge / Rollback Notes

### Rollback points
1. Reintroduce deleted `src/app/api/*` compatibility handlers only if the project intentionally restores frontend-only dev fallback as a supported path.
2. Restore `src/lib/supabase/*` and the removed Supabase packages together; never restore one without the other.
3. If auth/upload regress, roll back the handler-deletion slice first before touching docs.

### Known non-blocking risks
- `tests/manual-auth.spec.ts` remains an intentional manual/skip path.
- Backend test restore still emits the existing `NU1903` `Newtonsoft.Json 9.0.1` warning.
- `next dev` is treated as a UI-only convenience path, not a full-stack verification target.

## Verification Gate for M1

```bash
git branch --show-current && \
grep -R "@/lib/supabase/\|supabase" -n src | sed -n '1,200p'
```
