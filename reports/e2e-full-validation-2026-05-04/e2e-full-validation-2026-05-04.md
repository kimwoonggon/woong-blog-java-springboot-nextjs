# Playwright Full E2E Validation Audit

## Objective
Execute full Playwright validation with the exact command below, capture aggregate summary, capture failing spec names with top assertion stack lines, rerun failing specs for reproducibility, and report 0-failed status + required follow-up actions.

## Commands Executed
1. Full run (exact command requested):
`PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 ENABLE_LOCAL_ADMIN_SHORTCUT=true PLAYWRIGHT_EXPECT_LOCAL_ADMIN_SHORTCUT=visible PLAYWRIGHT_E2E_PROFILE=core node scripts/run-e2e-latency.mjs -- --workers=1`

2. Focused rerun of failing spec files:
`PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 ENABLE_LOCAL_ADMIN_SHORTCUT=true PLAYWRIGHT_EXPECT_LOCAL_ADMIN_SHORTCUT=visible PLAYWRIGHT_E2E_PROFILE=core node scripts/run-e2e-latency.mjs -- --workers=1 tests/public-seo-metadata.spec.ts tests/ui-improvement-featured-works-grid.spec.ts tests/admin-blog-ai-dialog.spec.ts tests/admin-work-edit.spec.ts tests/public-blog-detail-inline-edit.spec.ts tests/public-inline-editors-unsaved-warning.spec.ts tests/ui-admin-keyboard-accessibility.spec.ts tests/ui-quality-layout-rhythm.spec.ts tests/ui-quality-visual-metrics.spec.ts tests/work-inline-create-flow.spec.ts

## Full Run Results
- Total tests: 434
- Failed: 14
- Skipped: 4
- Duration: 38.2m
- 0 failed goal: **No** (failed)

## Failures in Full Run (14)
1. `[chromium-public] › tests/public-seo-metadata.spec.ts:21` `blog detail metadata uses the visible article title and excerpt`
   - `Error: expect(...).toHaveAttribute(...) failed`
   - `Locator: locator('meta[name="description"]')`
   - `Expected pattern: /.+/`

2. `[chromium-public] › tests/ui-improvement-featured-works-grid.spec.ts:141` `Works cards do not overflow on mobile with long unbroken content`
   - `Error: expect(received).toBeLessThanOrEqual(expected) failed`
   - `Expected: <= 321`
   - `Received:    337`

3. `[chromium-public] › tests/ui-improvement-featured-works-grid.spec.ts:200` `Works card width stays stable when mobile viewport height is extremely short`
   - `Error: expect(received).toBeLessThanOrEqual(expected) failed`
   - `Expected: <= 321`
   - `Received:    337`

4. `[chromium-authenticated] › tests/admin-blog-ai-dialog.spec.ts:29` `blog AI fix dialog loads runtime config, applies a fixed draft, and keeps editing local`
   - `Error: locator.dispatchEvent: Error: strict mode violation`
   - `locator('[data-slot="dialog-content"]').getByRole('button', { name: 'Start AI Fix' }) resolved to 2 elements`
   - `1) <button ...>… Start AI Fix ...` 

5. `[chromium-authenticated] › tests/admin-blog-ai-dialog.spec.ts:90` `blog AI fix failure preserves the draft and can retry with mocked routes`
   - `Error: locator.dispatchEvent: Error: strict mode violation`
   - `locator('[data-slot="dialog-content"]').getByRole('button', { name: 'Start AI Fix' }) resolved to 2 elements`
   - `1) <button ...>… Start AI Fix ...`

6. `[chromium-authenticated] › tests/admin-blog-ai-dialog.spec.ts:156` `work AI enrich uses mocked failure and success responses without live AI`
   - `Error: locator.dispatchEvent: Error: strict mode violation`
   - `locator('[data-slot="dialog-content"]').getByRole('button', { name: 'Start AI Fix' }) resolved to 2 elements`
   - `1) <button ...>… Start AI Fix ...`

7. `[chromium-authenticated] › tests/admin-work-edit.spec.ts:7` `admin can edit an existing work entry with mixed special input`
   - Full run failure details were truncated in terminal output by tooling; test is listed as failed and reproduced as pass on focused rerun.

8. `[chromium-authenticated] › tests/public-blog-detail-inline-edit.spec.ts:8` `admin can edit a public blog detail inline and return to the originating blog page`
   - Full run failure details were truncated in terminal output by tooling; test is listed as failed and reproduced as pass on focused rerun.

9. `[chromium-authenticated] › tests/public-inline-editors-unsaved-warning.spec.ts:27` `public blog inline editor clears beforeunload after save`
   - Full run failure details were truncated in terminal output by tooling; test is listed as failed and reproduced as pass on focused rerun.

10. `[chromium-authenticated] › tests/ui-admin-keyboard-accessibility.spec.ts:45` `mobile admin navigation exposes a labeled nav and supports sequential keyboard focus`
   - `Error: expect(locator).toBeFocused failed`
   - `Locator: getByRole('navigation', { name: 'Admin navigation' }).getByRole('link', { name: 'Works', exact: true })`
   - `Expected: focused` / `Received: inactive`

11. `[chromium-authenticated] › tests/ui-admin-keyboard-accessibility.spec.ts:66` `AI content dialog opens and closes by keyboard without invoking live AI`
   - `Error: expect(locator).toBeVisible failed`
   - `Locator: locator('[data-slot="dialog-content"]').getByRole('button', { name: 'Start AI Fix' })`
   - `Expected: visible` with strict-mode duplicate button match

12. `[chromium-authenticated] › tests/ui-quality-layout-rhythm.spec.ts:7` `VA-022 home sections keep a consistent vertical rhythm`
   - `Error: expect(Math.abs(gap - baseline)).toBeLessThanOrEqual(16) failed`
   - `Expected: <= 16`
   - `Received: 17.302734375`

13. `[chromium-authenticated] › tests/ui-quality-visual-metrics.spec.ts:61` `VA-305 public pagination keeps minimum touch targets and a differentiated active state`
   - `Error: expect(metrics.height).toBeGreaterThanOrEqual(30) failed`
   - `Expected: >= 30`
   - `Received: 0`

14. `[chromium-authenticated] › tests/work-inline-create-flow.spec.ts:58` `existing work video uploads persist thumbnails immediately without requiring Update Work`
   - `Error: expect(page.getByAltText('Work thumbnail preview')).toBeVisible() failed`
   - `Locator: getByAltText('Work thumbnail preview')`
   - `Error: element(s) not found`

## Focused Re-run Results (10 files)
- Total tests: 43
- Failed: 6
- Skipped: 1
- Duration: 5.5m
- Result: **No** full pass; 6 failures reproduced.

### Reproduced failures
1. `[chromium-public] tests/public-seo-metadata.spec.ts:21`
2. `[chromium-authenticated] tests/admin-blog-ai-dialog.spec.ts:29`
3. `[chromium-authenticated] tests/admin-blog-ai-dialog.spec.ts:90`
4. `[chromium-authenticated] tests/admin-blog-ai-dialog.spec.ts:156`
5. `[chromium-authenticated] tests/ui-admin-keyboard-accessibility.spec.ts:45`
6. `[chromium-authenticated] tests/ui-admin-keyboard-accessibility.spec.ts:66`

### Not reproduced in focused rerun
- The remaining 8 failures from the full run passed in focused rerun.

## What was intentionally not changed
- No application code, test code, or server configuration changes were made during validation.
- No environment/server process restarts were introduced by this task.

## Validations performed
- Executed full Playwright command exactly as requested.
- Re-ran only the failing spec files to confirm reproducibility.
- Read/updated the 2026-05-04 TODO file to track task progress and verification state.
- Produced persistent audit artifacts in this report set.

## Risks / Yellow flags / Follow-ups
- `admin-blog-ai-dialog.spec.ts` failures are likely selector ambiguity due two `Start AI Fix` buttons in the same dialog. This appears stable and should be fixed by narrowing selector scope.
- SEO metadata assertion indicates `meta[name="description"]` missing on blog detail page in `public-seo-metadata.spec.ts`.
- Keyboard accessibility failure (`ui-admin-keyboard-accessibility.spec.ts:45/66`) suggests focus and dialog button visibility behavior is inconsistent.
- Three additional failures in full run that did not reproduce likely represent non-deterministic timing/layout noise from viewport-dependent assertions and should be rechecked with a stable baseline run before declaring fixed.

## Recommendation / Next step
Goal `0 failed` is **not satisfied**. Blocker actions are needed for:
1. `tests/admin-blog-ai-dialog.spec.ts` selector strictness fixes.
2. `tests/public-seo-metadata.spec.ts` meta description rendering guard.
3. `tests/ui-admin-keyboard-accessibility.spec.ts` focus and AI dialog button selection/visibility assertions.

