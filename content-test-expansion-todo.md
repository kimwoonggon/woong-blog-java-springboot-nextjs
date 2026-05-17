# Content Test Expansion TODO

## Docs
- [x] Add `content-test-expansion-plan.md`
- [x] Add `content-test-expansion-todo.md`
- [x] Update `docs/quality-verification-matrix.md` with new evidence lanes

## Scripts
- [x] Add `test:e2e:public`
- [x] Add `test:e2e:admin`
- [x] Add `test:e2e:works`
- [x] Add `test:e2e:blog`
- [x] Add `test:e2e:uploads`
- [x] Add `test:e2e:r2-browser`
- [x] Add `test:e2e:artifacts:index`

## Playwright Public
- [x] Home, introduction, contact, and resume paths covered in grouped run
- [x] Public works/blog pagination covered in grouped run
- [x] Public work detail body/video/youtube/related content covered in grouped run
- [x] Public blog detail content/related content covered in grouped run

## Playwright Admin
- [x] Admin shell redirect and menu/dashboard/member coverage grouped
- [x] Pages/settings save and public readback grouped
- [x] Search/pagination and bulk actions grouped

## Playwright Works
- [x] Create work only grouped
- [x] Create with staged YouTube + uploaded video grouped
- [x] Edit existing work grouped
- [x] Add/reorder/remove video grouped
- [x] Publish/public readback grouped

## Playwright Blog
- [x] Create/edit/publish grouped
- [x] Validation grouped
- [x] Image upload grouped
- [x] Notion workspace grouped

## Playwright Uploads / Media
- [x] Resume upload/delete/download grouped
- [x] Home image upload/readback grouped
- [x] Work image upload/readback grouped
- [x] Blog image upload/readback grouped
- [x] Real browser R2 upload/readback grouped

## Vitest
- [x] `WorkEditor` new branches fully covered
- [x] `WorkVideoPlayer` render branches fully covered
- [x] `src/lib/api/works.ts` parser behavior fully covered

## Verification
- [x] Run `npm run test:e2e:public`
- [x] Run `npm run test:e2e:admin`
- [x] Run `npm run test:e2e:works`
- [x] Run `npm run test:e2e:blog`
- [x] Run `npm run test:e2e:uploads`
- [x] Run `CloudflareR2__ForceEnabledInDevelopment=true npm run test:e2e:r2-browser`
- [x] Run `CloudflareR2__ForceEnabledInDevelopment=true npm run test:r2:smoke`
- [x] Run `npm run test:e2e:artifacts:index`

## Performance Branch
- [ ] Switch to `performance-test` branch for load tooling work
- [ ] Add `k6` scenario for 100 concurrent work page requests
- [ ] Add `k6` scenario for 100 concurrent video playback URL requests
- [ ] Add mixed page + video scenario
- [ ] Save `summary.json`, `summary.md`, raw output, and `docker stats`

## Deferred
- [ ] MinIO/S3-compatible lane
- [ ] resumable upload
- [ ] stream/transcoding performance work
