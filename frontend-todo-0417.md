# Frontend Todo 0417

Status format:
- [ ] Not started
- [~] In progress
- [x] Done

## 1. Mobile Header
- [x] Move the mobile menu trigger to the right edge with comfortable right margin.
- [x] Verify compact header has no horizontal overflow and keeps a usable drawer.
- Verification: `tests/ui-header-responsive.spec.ts` passed in full Docker/nginx Playwright run.

## 2. Public Copy And Layout
- [x] Home: replace Featured works block heading/copy with `Works`.
- [x] Home: replace Recent posts block heading/copy with `Study Notes`.
- [x] Home: remove long explore guidance and keep only `Works`, `Study`, `Introduction`.
- [x] Introduction: remove eyebrow and template description, keep large `Introduction`.
- [x] Works: remove archive/template copy and align top controls with Study.
- [x] Resume: remove duplicate small heading and explanatory copy.
- [x] Contact: remove duplicate eyebrow/description, keep large `Contact`.
- [x] Footer: replace repeated Explore copy with compact copyright and `Works & Study Notes`.
- [x] Reduce section/header height after copy removal so the page proportions still feel intentional.
- Verification: full Docker/nginx Playwright passed; build passed.

## 3. Works Search
- [x] Add public works title/content search API support.
- [x] Add Works page `Search work` and `Title`/`Content` controls following Study page behavior.
- Verification: `PublicQueryHandlerTests|PublicEndpointsTests` passed; `src/test/public-api-clients.test.ts` passed; `tests/public-works-search.spec.ts` passed in full Docker/nginx Playwright.

## 4. Resume PDF
- [x] Replace mobile-hostile iframe-only PDF behavior with an in-page PDF renderer.
- [x] Keep download as a secondary action.
- Verification: `npm run build` and `npm run typecheck` passed. `resume.spec.ts` and `public-resume-empty-state.spec.ts` passed in full Docker/nginx Playwright.

## 5. Favicon
- [x] Replace the default Next.js favicon with a Woonggon Kim/WK branded icon.
- Verification: `tests/public-seo-metadata.spec.ts` favicon test passed in full Docker/nginx Playwright.

## 6. XSS And Security Headers
- [x] Add `poweredByHeader: false`.
- [x] Add shared HTML sanitizer for public renderer and admin previews.
- [x] Add frontend and nginx security headers, including CSP allowances needed for media/HLS.
- Verification: sanitizer unit test passed; `npm run build`, `npm run typecheck`, and `npm run lint` passed. Docker/nginx runtime headers were exercised in full Playwright; direct `/media/videos/*.mp4` smoke returned 404.

## 7. Blog Image Resizing
- [x] Resize editor image uploads before upload for toolbar, drag/drop, and paste flows.
- [x] Ensure BlogEditor and BlogNotionWorkspace benefit through shared Tiptap upload code.
- [x] Add backend upload validation/metadata guardrails.
- [x] Add Notion import image resizing or document any dependency-gated limitation.
- Verification: `src/test/tiptap-image-upload.test.ts` passed; `UploadsControllerTests` passed; editor image upload Playwright specs passed in full Docker/nginx run.

## 8. R2 HLS Video
- [x] Add operator MP4 upload to HLS job endpoint.
- [x] Use ffmpeg copy-mode HLS segmentation to preserve original quality.
- [x] Upload HLS manifest and segments to R2, with local fallback for tests/dev.
- [x] Add HLS video projection and browser playback via native HLS or hls.js.
- Verification: `WorkVideoEndpointsTests` passed; `src/test/work-video-player.test.tsx` passed; HLS/video Playwright specs passed in full Docker/nginx run. Real R2 smoke script added but not run because real Cloudflare R2 credentials were not provided.

## 9. Admin AI Prompt Customization
- [x] Add custom system prompt textarea to single AI fix dialog.
- [x] Add custom system prompt textarea to batch AI fix panel.
- [x] Persist and apply custom prompt in backend single and batch AI paths.
- Verification: `src/test/admin-ai-fix-dialog.test.tsx`, `src/test/admin-blog-batch-ai-panel.test.tsx`, and `AdminAiEndpointsTests` passed. Live AI Playwright smoke is gated behind `PLAYWRIGHT_LIVE_AI=1` and skipped by default.

## Final Verification
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run build`
- [x] `npm test`
- [x] `dotnet test backend/tests/WoongBlog.Api.Tests/WoongBlog.Api.Tests.csproj`
- [x] Focused Playwright lanes for changed areas.
- [x] Full Docker/nginx Playwright: passed on clean `woongtest0417b` stack, 427 `video.webm` artifacts.
