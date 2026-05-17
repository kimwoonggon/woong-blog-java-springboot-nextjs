# Plans

> **Stop-and-fix rule**: validation 실패 시 다음 마일스톤으로 넘어가지 않는다.

## [ ] M1: Density, pagination, and shell balance
Fix the remaining public density and shell-balance issues: underfilled Works/Blog layouts, uneven related-content paging behavior, and awkward navbar sizing/alignment.

Dependencies: none  
Estimated loops: 1-2

### Allowed Files
- `src/components/layout/Navbar.tsx`
- `src/hooks/useResponsivePageSize.ts`
- `src/lib/responsive-page-size.ts`
- `src/app/(public)/works/page.tsx`
- `src/app/(public)/blog/page.tsx`
- `src/app/(public)/works/[slug]/page.tsx`
- `src/app/(public)/blog/[slug]/page.tsx`
- `src/components/content/RelatedContentList.tsx`
- `src/components/layout/*`
- `src/components/ui/*`
- `src/test/*`
- `tests/public-*.spec.ts`
- `docs/ralph/notion-admin-density-modernization/documentation.md`

### Acceptance Criteria
- [ ] At `>= 1440px` wide desktop viewports, `/works` shows a denser first screen than the current 6-card baseline, targeting an explicit larger public page size (recommended target: 8 or more cards when the viewport height supports it).
- [ ] At `>= 1440px` wide desktop viewports, `/blog` shows a denser first screen than the current underfilled state, targeting an explicit larger public page size (recommended target: 12 or more cards when the viewport height supports it).
- [ ] Related-content sections on work/blog detail pages use an explicit larger desktop target (recommended baseline: `6/4/2`) so they do not look sparse on wide screens.
- [ ] Pagination/next-previous movement does not cause visually jarring row jumps beyond a small geometry threshold in browser tests.
- [ ] Navbar brand / nav cluster / account cluster use an intentionally asymmetric desktop layout so the nav no longer feels awkwardly dead-center; text sizing and spacing are visibly larger than the current shell.
- [ ] Browser tests cover at least one desktop density case, one mobile/tablet case, and one related-content paging stability case.

### Validation Commands
```bash
npm run build && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/public-content.spec.ts tests/public-detail-pages.spec.ts tests/public-layout-stability.spec.ts tests/public-blog-pagination.spec.ts tests/public-works-pagination.spec.ts --workers=1
```

## [ ] M2: Admin IA and friction reduction
Make admin navigation and editing faster: add home/public-home escape hatches, title-click edit affordances, and more natural post-create redirect behavior.

Dependencies: M1  
Estimated loops: 1-2

### Allowed Files
- `src/app/admin/layout.tsx`
- `src/app/admin/dashboard/page.tsx`
- `src/components/admin/AdminDashboardCollections.tsx`
- `src/app/admin/works/page.tsx`
- `src/app/admin/blog/page.tsx`
- `src/app/admin/pages/page.tsx`
- `src/components/admin/WorkEditor.tsx`
- `src/components/admin/BlogEditor.tsx`
- `tests/admin-dashboard.spec.ts`
- `tests/admin-work-publish.spec.ts`
- `tests/admin-blog-publish.spec.ts`
- `tests/admin-*.spec.ts`
- `docs/ralph/notion-admin-density-modernization/documentation.md`

### Acceptance Criteria
- [ ] Admin sidebar and/or dashboard expose an obvious `Public Home` or `Open Site` path so users can leave admin without URL hacking.
- [ ] Admin Works / Blog list rows treat the title as the primary edit affordance, not just the small icon button.
- [ ] Admin Pages surface adds an equally obvious edit-entry affordance from its section titles or navigation labels.
- [ ] Create Work and Create Blog flows redirect to the chosen next step explicitly: the recommended default is return to the relevant admin list after save, unless the Notion-view milestone later supersedes it.
- [ ] Work category friction is reduced with a concrete rule: recommended choice is default `Uncategorized` / `General` at create time instead of blocking create when the user has not meaningfully categorized yet.
- [ ] Browser tests exist for at least one admin navigation shortcut, one title-click edit path, and one create-flow redirect expectation.

### Validation Commands
```bash
npm run build && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/admin-dashboard.spec.ts tests/admin-work-publish.spec.ts tests/admin-blog-publish.spec.ts tests/admin-pages-settings.spec.ts --workers=1
```

## [ ] M3: Notion-view foundation for blog authoring
Add a bounded first version of a Notion-inspired admin view for **Blog first**: left-side entry list, right-side immediate editor, and debounced autosave for content only.

Dependencies: M2  
Estimated loops: 2-4

### Allowed Files
- `src/app/admin/layout.tsx`
- `src/app/admin/blog/**`
- `src/components/admin/BlogEditor.tsx`
- `src/components/admin/TiptapEditor.tsx`
- `src/components/admin/tiptap/*`
- `src/components/admin/*`
- `src/lib/api/blogs.ts`
- `src/test/*`
- `tests/admin-*.spec.ts`
- `docs/ralph/notion-admin-density-modernization/documentation.md`

### Acceptance Criteria
- [ ] Admin exposes a distinct `Notion View` entry point for **Blog** as the first rollout surface.
- [ ] The Notion view uses a left-side document list and a right-side editor pane inspired by the reference image.
- [ ] The first version is **content-first**: title is visible, but instant-save applies only to content/body; title/tags/publish state remain explicit-save or separate controls.
- [ ] Autosave behavior is explicit and bounded: recommended baseline is debounced autosave with visible `Saving… / Saved / Error` status.
- [ ] The Notion view clearly uses existing Tiptap capabilities (`/` commands, code blocks, image insertion) instead of inventing a new editor from scratch.
- [ ] Browser tests exist for at least one left-list selection flow and one immediate content edit/autosave flow.

### Validation Commands
```bash
npm run build && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/admin-blog-edit.spec.ts tests/admin-work-edit.spec.ts tests/public-inline-editors.spec.ts --workers=1
```

## [ ] M4: Advanced editor capability surfacing
Make modern authoring capabilities discoverable: image drag/drop/paste, code blocks, slash commands, and supported advanced blocks should be clearly surfaced rather than hidden.

Dependencies: M3  
Estimated loops: 1-2

### Allowed Files
- `src/components/admin/TiptapEditor.tsx`
- `src/components/admin/tiptap/*`
- `src/components/admin/BlogEditor.tsx`
- `src/components/admin/WorkEditor.tsx`
- `src/test/*`
- `tests/admin-blog-*.spec.ts`
- `tests/admin-work-*.spec.ts`
- `docs/ralph/notion-admin-density-modernization/documentation.md`

### Acceptance Criteria
- [ ] The UI explicitly communicates that inline image upload supports click insert plus drag/drop/paste where available.
- [ ] The UI explicitly communicates that code writing is supported through code blocks / slash commands, not generic code-file upload.
- [ ] The Notion/blog editor surfaces a clear hint for `/` commands and code-block insertion.
- [ ] Any supported HTML/3D/custom blocks are surfaced or consciously hidden with documentation explaining why.
- [ ] Tests exist for at least one surfaced advanced-authoring capability.

### Validation Commands
```bash
npm run build && npx vitest run src/test/work-editor.test.tsx src/test/responsive-page-size.test.ts --pool=threads && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/admin-blog-image-upload.spec.ts tests/admin-blog-image-validation.spec.ts tests/admin-work-image-upload.spec.ts --workers=1
```

## [ ] M5: Members-list decision and final sign-off
Make an explicit product/architecture call on member listing and finish the design-system sign-off for this modernization pass.

Dependencies: M1, M2, M3, M4  
Estimated loops: 1

### Allowed Files
- `src/app/admin/**`
- `src/components/admin/**`
- `backend/src/Portfolio.Api/**`
- `backend/tests/Portfolio.Api.Tests/*`
- `tests/*`
- `docs/ralph/notion-admin-density-modernization/documentation.md`

### Acceptance Criteria
- [ ] The plan explicitly states that member list is **deferred by default** unless the implementation is intentionally expanded into a separate read-only milestone.
- [ ] If deferred, the reasons and required backend/frontend touchpoints are documented (`Profile`, `AuthSession`, admin API, privacy decisions).
- [ ] Reading/admin/notion-view surfaces feel coherent as one modernization pass.
- [ ] Final browser regression is green.

### Validation Commands
```bash
npm run lint && python -c "import shutil, pathlib; p = pathlib.Path('.next/dev'); shutil.rmtree(p) if p.exists() else None; print('removed', p)" && npm run typecheck && npm run build && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test --workers=1
```
