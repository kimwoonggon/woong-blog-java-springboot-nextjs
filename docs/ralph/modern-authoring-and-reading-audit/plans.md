# Plans

> **Stop-and-fix rule**: validation 실패 시 다음 마일스톤으로 넘어가지 않는다.

## [ ] M1: Capability audit and UX decision lock
Audit the current reading/authoring capability set, lock what “modern” means for this repo, and decide which gaps matter enough to implement now.

Dependencies: none  
Estimated loops: 1

### Allowed Files
- `docs/ralph/modern-authoring-and-reading-audit/prompt.md`
- `docs/ralph/modern-authoring-and-reading-audit/plans.md`
- `docs/ralph/modern-authoring-and-reading-audit/implement.md`
- `docs/ralph/modern-authoring-and-reading-audit/documentation.md`

### Acceptance Criteria
- [ ] The current feature set is explicitly audited: reading layout, related-content UX, image upload UX, drag/drop support, paste support, code-block/editor support, and design consistency.
- [ ] The plan clearly distinguishes “already supported but poorly surfaced” from “missing capability.”
- [ ] The chosen modernization scope is explicit and bounded.
- [ ] The decisions about image upload UX, code-oriented authoring, and design consistency are documented.

### Validation Commands
```bash
test -f docs/ralph/modern-authoring-and-reading-audit/prompt.md && test -f docs/ralph/modern-authoring-and-reading-audit/plans.md && test -f docs/ralph/modern-authoring-and-reading-audit/implement.md && test -f docs/ralph/modern-authoring-and-reading-audit/documentation.md
```

## [ ] M2: Modern reading-surface refinement
Refine blog/work reading surfaces so lists, detail pages, and “other posts/works” browsing feel contemporary, stable, and visually coherent.

Dependencies: M1  
Estimated loops: 1-2

### Allowed Files
- `src/app/(public)/works/page.tsx`
- `src/app/(public)/blog/page.tsx`
- `src/app/(public)/works/[slug]/page.tsx`
- `src/app/(public)/blog/[slug]/page.tsx`
- `src/components/content/RelatedContentList.tsx`
- `src/components/layout/*`
- `src/components/ui/*`
- `tests/public-*.spec.ts`
- `docs/ralph/modern-authoring-and-reading-audit/documentation.md`

### Acceptance Criteria
- [ ] Works/blog list and detail surfaces follow one coherent card/metadata rhythm.
- [ ] Related-content sections are stable and easy to scan across different content lengths.
- [ ] Responsive/mobile detail browsing is explicitly verified.
- [ ] Test files exist and cover at least one list expectation and one detail/related-content expectation.

### Validation Commands
```bash
npm run build && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/public-content.spec.ts tests/public-detail-pages.spec.ts tests/public-layout-stability.spec.ts tests/public-blog-pagination.spec.ts tests/public-works-pagination.spec.ts --workers=1
```

## [ ] M3: Media upload UX modernization
Bring upload affordances for work/blog/home/resume surfaces closer to modern expectations: obvious click-first flows, drag/drop where appropriate, clear feedback, and consistent hierarchy.

Dependencies: M1  
Estimated loops: 2

### Allowed Files
- `src/components/admin/BlogEditor.tsx`
- `src/components/admin/WorkEditor.tsx`
- `src/components/admin/TiptapEditor.tsx`
- `src/components/admin/HomePageEditor.tsx`
- `src/components/admin/ResumeEditor.tsx`
- `src/components/admin/InlineAdminEditorShell.tsx`
- `src/test/*`
- `tests/admin-*.spec.ts`
- `tests/public-inline-editors.spec.ts`
- `docs/ralph/modern-authoring-and-reading-audit/documentation.md`

### Acceptance Criteria
- [ ] The repo’s current drag/drop/paste support for inline blog images is either improved or clearly surfaced to users.
- [ ] Non-inline upload surfaces (work/home/resume) have clear modern affordances and feedback.
- [ ] The resulting upload UX does not require hidden knowledge of drag/drop to succeed.
- [ ] Test files exist and cover at least one upload affordance or feedback expectation.

### Validation Commands
```bash
npm run build && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/admin-blog-image-upload.spec.ts tests/admin-work-image-upload.spec.ts tests/admin-home-image-upload.spec.ts tests/admin-resume-upload.spec.ts tests/public-inline-editors.spec.ts --workers=1
```

## [ ] M4: Code-oriented authoring and modern editor capability alignment
Align the product and UI around the editor capabilities that matter for technical/modern writing, especially code blocks and advanced content inserts.

Dependencies: M1  
Estimated loops: 1-2

### Allowed Files
- `src/components/admin/TiptapEditor.tsx`
- `src/components/admin/tiptap/*`
- `src/components/admin/BlogEditor.tsx`
- `src/components/admin/WorkEditor.tsx`
- `src/test/*`
- `tests/admin-blog-*.spec.ts`
- `tests/admin-work-*.spec.ts`
- `docs/ralph/modern-authoring-and-reading-audit/documentation.md`

### Acceptance Criteria
- [ ] The product’s support for code blocks / code-like content is explicit in the UI and documentation.
- [ ] Any supported advanced inserts (image drag/drop, slash commands, HTML block, 3D block) are clearly surfaced or consciously deferred.
- [ ] The plan does not pretend unsupported “code upload/file attachment” capabilities already exist.
- [ ] Test files exist for at least one technical-authoring capability or surfaced limitation.

### Validation Commands
```bash
npm run build && npx vitest run src/test/work-editor.test.tsx src/test/responsive-page-size.test.ts --pool=threads && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/admin-blog-image-upload.spec.ts tests/admin-blog-image-validation.spec.ts tests/admin-blog-edit.spec.ts tests/admin-work-edit.spec.ts --workers=1
```

## [ ] M5: Final design-system consistency and audit sign-off
Do a final pass to ensure the refreshed reading/authoring surfaces feel like one system, then record what is now modernized vs still deferred.

Dependencies: M2, M3, M4  
Estimated loops: 1

### Allowed Files
- `src/app/(public)/**`
- `src/components/admin/**`
- `src/components/content/**`
- `src/components/layout/**`
- `src/components/ui/**`
- `src/test/*`
- `tests/*`
- `docs/ralph/modern-authoring-and-reading-audit/documentation.md`

### Acceptance Criteria
- [ ] Reading surfaces and authoring surfaces use a coherent visual hierarchy and interaction language.
- [ ] Remaining gaps are documented honestly as deferred items, not hidden.
- [ ] Full browser regression remains green after the audit-refresh pass.
- [ ] Documentation clearly states which modern capabilities are complete, partial, or deferred.

### Validation Commands
```bash
npm run lint && python -c "import shutil, pathlib; p = pathlib.Path('.next/dev'); shutil.rmtree(p) if p.exists() else None; print('removed', p)" && npm run typecheck && npm run build && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test --workers=1
```
