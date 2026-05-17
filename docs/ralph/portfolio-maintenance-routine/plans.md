# Plans

> **Stop-and-fix rule**: validation 실패 시 다음 마일스톤으로 넘어가지 않는다.

## [ ] M1: Skill-routed issue maintenance lane
Define the default execution lane for single-issue maintenance using `portfolio-maintenance`, with clear verification expectations for narrow public/admin/upload/auth/runtime fixes.

Dependencies: none  
Estimated loops: 1

### Allowed Files
- `.codex/skills/portfolio-maintenance/SKILL.md`
- `docs/portfolio-maintenance-plan.md`
- `docs/ralph/portfolio-maintenance-routine/documentation.md`
- `package.json`
- `playwright.config.ts`
- `scripts/setup-local-https.sh`
- `docker-compose.yml`
- `docker-compose.https.yml`

### Acceptance Criteria
- [ ] The plan explicitly states that narrow maintenance starts with `portfolio-maintenance`.
- [ ] The verification lanes for frontend-only, admin/content, backend API, HTTP runtime, and HTTPS runtime are documented.
- [ ] The plan documents that build-only success is insufficient for auth/admin/upload issues.
- [ ] Test files or config references exist for at least one public, one admin, and one HTTPS verification bundle.

### Validation Commands
```bash
npm run lint && npm run typecheck && npm run build && npx vitest run src/test/work-editor.test.tsx src/test/responsive-page-size.test.ts --pool=forks && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/home.spec.ts tests/introduction.spec.ts tests/admin-dashboard.spec.ts tests/admin-menus.spec.ts --workers=1
```

## [ ] M2: Weekly stability sweep
Define the recurring maintenance pass that checks public browsing, admin content operations, and HTTPS upload/auth behavior before regressions accumulate.

Dependencies: M1  
Estimated loops: 1

### Allowed Files
- `docs/portfolio-maintenance-plan.md`
- `docs/ralph/portfolio-maintenance-routine/documentation.md`
- `playwright.config.ts`
- `tests/public-detail-pages.spec.ts`
- `tests/public-blog-pagination.spec.ts`
- `tests/public-works-pagination.spec.ts`
- `tests/public-layout-stability.spec.ts`
- `tests/admin-dashboard.spec.ts`
- `tests/admin-pages-settings.spec.ts`
- `tests/admin-work-publish.spec.ts`
- `tests/admin-blog-publish.spec.ts`
- `tests/admin-blog-edit.spec.ts`
- `tests/admin-menus.spec.ts`
- `tests/admin-resume-upload.spec.ts`
- `tests/admin-resume-validation.spec.ts`
- `tests/public-admin-affordances.spec.ts`

### Acceptance Criteria
- [ ] The weekly pass explicitly covers public pages, admin/content, and HTTPS admin/upload lanes.
- [ ] The plan defines what to do when a weekly check fails: create a scoped Ralph task instead of broad, untracked fixes.
- [ ] The verification bundle is runnable from current repo scripts/config without inventing new tooling.
- [ ] Test files named in the weekly pass already exist and cover the described surfaces.

### Validation Commands
```bash
npm run lint && npm run typecheck && npm run build && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/home.spec.ts tests/introduction.spec.ts tests/public-content.spec.ts tests/admin-dashboard.spec.ts tests/admin-pages-settings.spec.ts tests/admin-work-publish.spec.ts tests/admin-blog-publish.spec.ts tests/admin-blog-edit.spec.ts tests/admin-menus.spec.ts --workers=1 && bash ./scripts/setup-local-https.sh && docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=https://localhost npx playwright test tests/admin-resume-upload.spec.ts tests/admin-resume-validation.spec.ts tests/public-admin-affordances.spec.ts --workers=1
```

## [ ] M3: Security-sensitive maintenance lane
Define the stricter path for auth/session/upload/member/HTTPS changes so they always trigger extra review and privacy checks.

Dependencies: M1  
Estimated loops: 1

### Allowed Files
- `.codex/skills/portfolio-maintenance/SKILL.md`
- `docs/portfolio-maintenance-plan.md`
- `docs/ralph/portfolio-maintenance-routine/documentation.md`
- `src/app/admin/members/page.tsx`
- `src/components/admin/ResumeEditor.tsx`
- `backend/src/Portfolio.Api/Controllers/AuthController.cs`
- `backend/src/Portfolio.Api/Controllers/UploadsController.cs`
- `playwright.config.ts`
- `tests/public-admin-affordances.spec.ts`
- `tests/admin-resume-upload.spec.ts`
- `tests/admin-resume-validation.spec.ts`
- `tests/admin-members.spec.ts`

### Acceptance Criteria
- [ ] The plan explicitly marks auth/upload/member/HTTPS work as security-sensitive.
- [ ] The plan requires `security-review` for those slices before release/push.
- [ ] The plan forbids exposing secrets, raw session identifiers, provider subjects, or local-only artifacts.
- [ ] Tests exist for at least one upload/auth/member/privacy-sensitive surface.

### Validation Commands
```bash
npm run lint && npm run typecheck && npm run build && npx vitest run src/test/admin-page-success-states.test.tsx src/test/admin-page-error-states.test.tsx src/test/resume-editor.test.tsx --pool=forks && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=https://localhost npx playwright test tests/admin-resume-upload.spec.ts tests/admin-resume-validation.spec.ts tests/admin-members.spec.ts tests/public-admin-affordances.spec.ts --workers=1
```

## [ ] M4: Release candidate and push-safety gate
Define the final release/push workflow so ongoing maintenance branches are only uploaded after green verification and explicit artifact exclusion checks.

Dependencies: M1, M2, M3  
Estimated loops: 1

### Allowed Files
- `.gitignore`
- `.codex/skills/portfolio-maintenance/SKILL.md`
- `docs/portfolio-maintenance-plan.md`
- `docs/ralph/portfolio-maintenance-routine/documentation.md`
- `playwright.config.ts`
- `tests/helpers/global-setup.ts`
- `scripts/setup-local-https.sh`
- `docker-compose.https.yml`

### Acceptance Criteria
- [ ] The release gate includes lint, typecheck, build, targeted vitest, targeted Playwright HTTP, and targeted Playwright HTTPS.
- [ ] The push-safety checklist explicitly checks ignored paths like `.env*`, `.local-certs/`, `.next/`, `.omx/`, `test-results/`, `playwright-report/`, backend `bin/` / `obj/`, and storage-state artifacts.
- [ ] The plan requires `code-review` before final push and `security-review` if the change touches auth/upload/member/HTTPS code.
- [ ] The branch upload step is documented as the last action, after all verification is green.

### Validation Commands
```bash
git check-ignore -v .env .local-certs/ .next/ .omx/ test-results/ playwright-report/ tests/helpers/admin-storage-state.json backend/src/Portfolio.Api/obj/ && npm run lint && npm run typecheck && npm run build && npx vitest run src/test/admin-page-success-states.test.tsx src/test/admin-page-error-states.test.tsx src/test/work-editor.test.tsx src/test/resume-editor.test.tsx src/test/responsive-page-size.test.ts --pool=forks && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/home.spec.ts tests/introduction.spec.ts tests/public-content.spec.ts tests/admin-dashboard.spec.ts tests/admin-pages-settings.spec.ts tests/admin-work-publish.spec.ts tests/admin-blog-publish.spec.ts tests/admin-blog-edit.spec.ts tests/admin-menus.spec.ts --workers=1 && bash ./scripts/setup-local-https.sh && docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=https://localhost npx playwright test tests/admin-resume-upload.spec.ts tests/admin-resume-validation.spec.ts tests/public-admin-affordances.spec.ts --workers=1 && git status --short
```
