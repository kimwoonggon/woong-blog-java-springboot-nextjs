# Merge Notes — Supabase Runtime Decommission

## Branch
- `refactor/supabase-runtime-decommission`

## Commit slices
1. `bf45bbd` — inventory/runtime boundary artifact
2. `ea53aad` — remove Supabase runtime authority
3. `3794101` — rewrite README and ARCHITECTURE

## What changed
- Removed remaining Supabase-backed runtime handlers and helpers from `src/`
- Removed `@supabase/ssr` and `@supabase/supabase-js`
- Repointed Tiptap image upload to the backend-facing API base helper
- Rewrote `README.md` and `ARCHITECTURE.md` to the current stack
- Added `docs/runtime-decommission-matrix.md` as the inventory + rollback reference

## Rollback points
- If admin auth or upload behavior regresses, revert `ea53aad` first.
- If docs need to be separated from runtime changes, revert `3794101` independently.
- The inventory/reference slice `bf45bbd` is safe to keep even if later slices are reverted.

## Verified evidence
- Runtime grep over `src tests README.md ARCHITECTURE.md package.json` for `@/lib/supabase|supabase` → no hits
- `npm run test -- --run` → 17 passed
- `npm run lint` → pass
- `npm run typecheck` → pass
- `npm run build` → success
- dockerized backend tests → 51 passed
- `./scripts/db-load-smoke.sh` → PASS
- `npm run test:e2e:stack` → 30 passed, 1 skipped
- architect sign-off → APPROVED

## Known non-blocking risks
- `tests/manual-auth.spec.ts` remains a manual/skip path
- backend test restore still emits `NU1903` for `Newtonsoft.Json 9.0.1`
- `next dev` is intentionally documented as UI-only convenience, not a full-stack verification path
- the worktree still contains unrelated pre-existing dirty/untracked files outside this decommission slice

## PR packaging note
When opening a PR, scope the review to these commits only:

```bash
git log --oneline ebcb3b0..HEAD
```

If needed, reviewers can inspect only the decommission slice with:

```bash
git diff ebcb3b0..HEAD -- docs/runtime-decommission-matrix.md docs/merge-notes-supabase-runtime-decommission.md README.md ARCHITECTURE.md src/components/admin/TiptapEditor.tsx package.json package-lock.json src/app/admin/pages/actions.ts src/app/api/admin/pages/route.ts src/app/api/admin/site-settings/route.ts src/app/api/auth/callback/route.ts src/app/api/uploads/route.ts src/lib/supabase/
```

## Suggested next operator step
```bash
git push -u origin refactor/supabase-runtime-decommission
```
