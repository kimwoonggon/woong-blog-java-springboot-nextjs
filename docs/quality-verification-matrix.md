# Quality Verification Matrix

## Broad Sweep Targets

| Surface | Backend write path | DB persistence proof | Frontend/public readback proof |
|---|---|---|---|
| Pages | `/api/admin/pages` | backend tests + DB-backed page assertions | Playwright admin pages + `/introduction` / `/contact` + public content specs |
| Site settings | `/api/admin/site-settings` | backend tests + singleton site settings assertions | Playwright home/admin pages + public site settings readback |
| Works | `/api/admin/works` | backend tests + work metadata/media assertions + work video lifecycle assertions + thumbnail fallback resolution | Playwright work create/edit/publish/image/video flows + public work detail/video readback + inline work video embed flows + auto-thumbnail create/edit/mixed/photo-only flows |
| Blogs | `/api/admin/blogs` | backend tests + slug/excerpt/content assertions | Playwright blog create/edit/publish/image flows + public blog detail readback |
| Resume | `/api/admin/site-settings` + `/api/uploads` | backend upload/site-settings tests | Playwright resume upload/download + public resume page |
| Media | `/api/uploads` + work video endpoints | backend upload/delete + asset persistence assertions + real R2 smoke | Playwright home/work/blog image upload paths + real browser R2 upload/readback + `/media/*` and R2 playback requests |

## Green Evidence Chain

1. `backend/mvnw -f backend/pom.xml test`
2. `./scripts/db-load-smoke.sh`
3. `./scripts/backend-http-smoke.sh`
4. `npm run test -- --run && npm run lint && npm run typecheck && npm run build`
5. `npm run test:e2e:stack`
6. `curl -fsS http://localhost/api/health`
7. `npm run test:e2e:artifacts:index`

## Known manual lane
- `tests/manual-auth.spec.ts` remains the manual provider-login verification lane.
- Real R2 upload verification is now automated through `npm run test:r2:smoke` and `npm run test:e2e:r2-browser`.
- Work auto-thumbnail screenshots and recordings are archived under `test-results/playwright-archives/work-auto-thumbnail-*`.
