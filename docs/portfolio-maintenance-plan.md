# Portfolio Maintenance Plan

_Last updated: 2026-03-27_

## Goal
Maintain this portfolio project safely and predictably across:
- public pages
- admin pages
- uploads / resume flow
- auth / session / local-admin flow
- compose / nginx / HTTPS runtime
- release / push readiness

## Skill Routing

### 1. Default maintenance lane
Use:
- `$portfolio-maintenance <issue>`

Use this first for:
- page breakage
- admin regressions
- upload/download issues
- auth/logout/local-admin shortcut issues
- compose / nginx / HTTPS drift
- regression expansion before release

### 2. Scope is unclear or the work is broad
Use:
- `$ralplan <goal>`

Use this when:
- 3+ surfaces are affected
- acceptance criteria are unclear
- you need milestones / allowed-files / validation commands before coding

### 3. Implementation must continue until green
Use:
- `$ralph <plan-or-doc-path>`

Use this when:
- the issue is already scoped
- the fix needs code + tests + runtime verification
- you want completion evidence, not partial progress

### 4. Security-sensitive changes
Add:
- `$security-review`

Required for:
- auth / session / cookie / CSRF changes
- upload surface changes
- member/privacy related changes
- HTTPS / proxy / nginx hardening

### 5. Final review before push
Add:
- `$code-review`

Use before:
- mainline merge
- release push
- branch upload after large maintenance slices

## Operating Cadence

### A. Quick maintenance pass
When a single issue appears:
1. `$portfolio-maintenance <issue>`
2. If scope expands, switch to `$ralplan`
3. Execute with `$ralph`
4. Run `$code-review` before push

### B. Weekly stability pass
Once per week:
1. Run `$portfolio-maintenance weekly regression audit`
2. Verify these bundles:
   - public pages bundle
   - admin/content bundle
   - HTTPS admin/upload bundle
3. Record failures as separate Ralph tasks

### C. Release candidate pass
Before pushing a branch you want to keep:
1. `$portfolio-maintenance release readiness`
2. Run:
   - lint
   - typecheck
   - build
   - targeted vitest
   - targeted Playwright HTTP
   - targeted Playwright HTTPS
3. Run `$security-review` if auth/upload/member code changed
4. Run `$code-review`
5. Check push safety:
   - `git status --short`
   - `git check-ignore -v .env .local-certs/ .next/ .omx/ test-results/ playwright-report/ backend/**/obj/`
6. Push only after green verification

## Standard Verification Bundles

### Public pages
```bash
npm run lint && npm run typecheck && npm run build && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/home.spec.ts tests/introduction.spec.ts tests/public-content.spec.ts --workers=1
```

### Admin/content
```bash
npm run lint && npm run typecheck && npm run build && npx vitest run src/test/admin-page-success-states.test.tsx src/test/admin-page-error-states.test.tsx src/test/work-editor.test.tsx src/test/resume-editor.test.tsx --pool=forks && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/admin-dashboard.spec.ts tests/admin-pages-settings.spec.ts tests/admin-work-publish.spec.ts tests/admin-blog-publish.spec.ts tests/admin-blog-edit.spec.ts tests/admin-menus.spec.ts --workers=1
```

### HTTPS admin/upload
```bash
bash ./scripts/setup-local-https.sh && docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=https://localhost npx playwright test tests/admin-resume-upload.spec.ts tests/admin-resume-validation.spec.ts tests/public-admin-affordances.spec.ts --workers=1
```

## Priority Maintenance Backlog

### P1 — Must stay green
- admin login/session/logout
- resume upload/download
- blog/work publish + public readback
- dashboard/pages navigation
- HTTPS localhost boot

### P2 — Must stay usable
- public page layout/density
- blog notion view
- members page
- media upload UX

### P3 — Continuous improvement
- broader regression coverage
- docs freshness
- release / push safety automation

## Rules
- Prefer narrow fixes over broad rewrites
- No new dependencies unless necessary
- Never upload secrets, local certs, storage-state files, or runtime artifacts
- Treat auth/upload/member work as security-sensitive by default
- Do not claim success without runtime verification when admin/upload/auth is involved

## Done Definition
A maintenance slice is done only when:
- code change is in place
- relevant tests are updated or added
- lint/typecheck/build are green
- required browser/runtime verification is green
- remaining risks are explicitly stated
- push safety is checked before upload
