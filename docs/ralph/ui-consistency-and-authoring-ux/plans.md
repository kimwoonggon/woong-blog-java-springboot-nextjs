# Plans

> **Stop-and-fix rule**: validation 실패 시 다음 마일스톤으로 넘어가지 않는다.

## [x] M1: Lock the UX rules and card-system direction
Define the concrete interaction and layout rules for Works/Blog cards, detail related-content sections, authoring flows, and publish behavior so later implementation does not drift.

Dependencies: none  
Estimated loops: 1

### Allowed Files
- `docs/ralph/ui-consistency-and-authoring-ux/prompt.md`
- `docs/ralph/ui-consistency-and-authoring-ux/plans.md`
- `docs/ralph/ui-consistency-and-authoring-ux/implement.md`
- `docs/ralph/ui-consistency-and-authoring-ux/documentation.md`

### Acceptance Criteria
- [x] Public-user and content-author scenarios are explicitly described for list, detail, and create/edit flows.
- [x] The chosen publish model is explicit: new content auto-publishes by default, while later unpublish/edit remains possible.
- [x] The chosen layout rule is explicit: use stable grid/card sizing rather than masonry-style height drift.
- [x] Mobile/responsive expectations are explicitly part of the scenario set.

### Validation Commands
```bash
test -f docs/ralph/ui-consistency-and-authoring-ux/prompt.md && test -f docs/ralph/ui-consistency-and-authoring-ux/plans.md && test -f docs/ralph/ui-consistency-and-authoring-ux/implement.md && test -f docs/ralph/ui-consistency-and-authoring-ux/documentation.md
```

## [x] M2: Public list and detail layout stabilization
Refactor Works/Blog list cards and related-content sections so item sizing, metadata placement, and responsive behavior remain stable across varied content lengths.

Dependencies: M1  
Estimated loops: 2-3

### Allowed Files
- `src/app/(public)/works/page.tsx`
- `src/app/(public)/blog/page.tsx`
- `src/app/(public)/works/[slug]/page.tsx`
- `src/app/(public)/blog/[slug]/page.tsx`
- `src/components/content/RelatedContentList.tsx`
- `src/components/admin/InlineAdminEditorShell.tsx`
- `src/components/ui/*`
- `src/components/layout/*`
- `src/test/*`
- `tests/public-*.spec.ts`
- `tests/public-inline-editors.spec.ts`
- `docs/ralph/ui-consistency-and-authoring-ux/documentation.md`

### Acceptance Criteria
- [x] Works list uses a stable responsive grid/card pattern instead of visually jagged masonry behavior.
- [x] Blog list uses the same stable card-system principles as Works.
- [x] Related-content sections on Work/Blog detail pages use consistent card height/ordering rules and do not jump unpredictably.
- [x] Card metadata/title/excerpt/tag layout remains readable with short, medium, and long content.
- [x] Test files exist and cover at least one public layout expectation plus one related-content stability expectation.

### Validation Commands
```bash
npm run build && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/public-content.spec.ts tests/public-detail-pages.spec.ts tests/public-inline-editors.spec.ts tests/public-blog-pagination.spec.ts tests/public-works-pagination.spec.ts --workers=1
```

## [x] M3: Authoring flow simplification and media-upload UX refresh
Improve Work/Blog editor UX so create/edit flows are more consistent, uploads are easier to understand, and the default create path no longer depends on a separate publish step.

Dependencies: M1  
Estimated loops: 2-3

### Allowed Files
- `src/components/admin/WorkEditor.tsx`
- `src/components/admin/BlogEditor.tsx`
- `src/components/admin/InlineAdminEditorShell.tsx`
- `src/components/admin/ResumeEditor.tsx`
- `src/components/admin/HomePageEditor.tsx`
- `src/components/admin/TiptapEditor.tsx`
- `src/app/admin/blog/actions.ts`
- `src/app/admin/works/actions.ts`
- `src/test/*`
- `tests/admin-*.spec.ts`
- `tests/public-inline-editors.spec.ts`
- `docs/ralph/ui-consistency-and-authoring-ux/documentation.md`

### Acceptance Criteria
- [x] New Work creation and new Blog creation auto-publish by default in the normal path, without a second explicit publish step.
- [x] Edit flows still allow authors to see and control published state after creation.
- [x] Upload affordances are explicit and usable without requiring hidden drag-only interaction.
- [x] Editor visual hierarchy, action labels, and status messaging are more consistent across Work/Blog flows.
- [x] Test files exist and cover at least one create flow plus one upload interaction expectation.

### Validation Commands
```bash
npm run build && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/admin-blog-publish.spec.ts tests/admin-work-publish.spec.ts tests/admin-blog-image-upload.spec.ts tests/admin-work-image-upload.spec.ts tests/public-inline-editors.spec.ts --workers=1
```

## [x] M4: Responsive polish and system-level consistency verification
Do a final consistency pass across mobile/desktop states, spacing, actions, and interaction feedback so the refreshed UI feels coherent rather than partially upgraded.

Dependencies: M2, M3  
Estimated loops: 1-2

### Allowed Files
- `src/app/(public)/**`
- `src/components/admin/**`
- `src/components/content/**`
- `src/components/layout/**`
- `src/components/ui/**`
- `src/hooks/useResponsivePageSize.ts`
- `src/test/*`
- `tests/*`
- `docs/ralph/ui-consistency-and-authoring-ux/documentation.md`

### Acceptance Criteria
- [x] Mobile, tablet, and desktop layouts are explicitly checked for Works/Blog list and detail surfaces.
- [x] Button hierarchy, editor shells, card spacing, and metadata styling feel consistent across the refreshed surfaces.
- [x] No refreshed flow regresses current auth/admin/public affordances.
- [x] Test files exist and cover at least one responsive/mobile-specific expectation.

### Validation Commands
```bash
npm run lint && npm run typecheck && npm run build && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/public-blog-pagination.spec.ts tests/public-works-pagination.spec.ts tests/public-inline-editors.spec.ts tests/public-admin-affordances.spec.ts tests/auth-login.spec.ts --workers=1
```
