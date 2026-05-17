# Frontend Content Test Expansion Plan

## Summary
- Expand browser verification across public pages, works, blog, admin shell, pages/settings, uploads, and the new work video flows.
- Keep `docker compose + nginx + backend + frontend` as the only e2e source of truth.
- Use `real R2` as the only upload validation target. `MinIO` remains deferred.
- Treat upload-heavy Playwright suites as artifact-producing suites. Preserve `video.webm`, failure screenshots, and traces, then index them after runs.

## E2E Surface Matrix

### Public
- Home, introduction, contact, and resume pages render and navigate correctly.
- Works list and blog list pagination remain stable.
- Public work detail proves:
  - title, excerpt, and body render
  - uploaded video renders as `<video>`
  - YouTube renders through `youtube-nocookie`
  - related content remains visible
- Public blog detail proves authored body and related content remain intact.

### Admin
- Admin shell redirects unauthenticated users and loads menus, dashboard, and members.
- Pages/settings save and read back publicly.
- Resume and image upload flows still validate, upload, and read back correctly.

### Works
- Create work only.
- Create work with staged YouTube plus uploaded video.
- Edit existing work content.
- Add, reorder, and remove work videos.
- Publish and read back publicly.

### Blog
- Create, edit, and publish.
- Validation failures remain visible.
- Image upload remains stable.
- Notion workspace load and save path remains healthy.

### Uploads / Media
- Resume upload/delete/download.
- Home image upload/readback.
- Work image upload/readback.
- Blog image upload/readback.
- Real browser R2 upload/readback for work videos.

## Unit Test Expansion
- Extend `src/test/work-editor.test.tsx` for:
  - staged create flow
  - create-and-add-videos orchestration
  - existing-work YouTube add
  - upload target request
  - direct-upload CORS failure hint
  - reorder conflict
  - remove path
- Keep `src/test/work-video-player.test.tsx` for renderer branching.
- Expand `src/test/public-api-clients.test.ts` and `src/test/public-api-contracts.test.ts` for `videos[]`, `videosVersion`, malformed payload rejection, and backward-compatible absence behavior.
- Add a dedicated `src/test/works-api-parsing.test.ts` only if parser complexity grows beyond current coverage.

## Playwright Artifact Policy
- Keep Playwright video recording enabled globally.
- Upload-focused specs are artifact-critical:
  - `tests/admin-work-image-upload.spec.ts`
  - `tests/admin-blog-image-upload.spec.ts`
  - `tests/admin-resume-upload.spec.ts`
  - `tests/admin-work-video-create-flow.spec.ts`
  - `tests/public-work-videos.spec.ts`
  - real R2 browser upload lane
- After these suites run, generate an artifact index under `test-results/playwright/summary/`.
- Retain traces on failure and keep screenshots on.

## Package Script Additions
- `test:e2e:public`
- `test:e2e:admin`
- `test:e2e:works`
- `test:e2e:blog`
- `test:e2e:uploads`
- `test:e2e:r2-browser`
- `test:e2e:artifacts:index`
- Keep `test:e2e:stack` as the full release gate.

## Performance Test Plan
- Use the existing `performance-test` branch for load tooling and artifacts.
- Use HTTP-level load with `k6`, not 100 concurrent Playwright browsers.
- Scenarios:
  - `work-html-100vu`
    - 100 concurrent users request public work detail pages
  - `video-playback-100vu`
    - 100 concurrent users request playback URLs with `HEAD` and byte-range `GET`
  - `mixed-work-video-100vu`
    - 100 concurrent users request work pages and then playback URLs
- Artifacts:
  - raw `k6` output
  - `summary.json`
  - `summary.md`
  - `docker stats`
  - scenario/env snapshot
- Acceptance:
  - page HTML path stays free of app 5xx errors
  - playback URL path stays free of R2 4xx/5xx for valid media
  - mixed flow keeps page-to-video handoff intact

## Verification Commands
- `npm run test -- --run src/test/work-editor.test.tsx src/test/work-video-player.test.tsx src/test/public-api-clients.test.ts src/test/public-api-contracts.test.ts`
- `npm run test:e2e:public`
- `npm run test:e2e:admin`
- `npm run test:e2e:works`
- `npm run test:e2e:blog`
- `npm run test:e2e:uploads`
- `CloudflareR2__ForceEnabledInDevelopment=true npm run test:e2e:r2-browser`
- `CloudflareR2__ForceEnabledInDevelopment=true npm run test:r2:smoke`
- `npm run test:e2e:artifacts:index`

## Assumptions
- `MinIO` is deferred and not required for the next pass.
- `real R2` is the only release-significant upload target.
- This pass is test-coverage expansion, not a product redesign.
