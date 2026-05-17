# Plans

> **Stop-and-fix rule**: validation 실패 시 다음 마일스톤으로 넘어가지 않는다.

## [ ] M1: Push-safety hygiene and cache cleanup guardrails
Audit `.gitignore`, remove/clear local cache artifacts from the release path, and make the final push step explicitly safe for `origin`.

Dependencies: none  
Estimated loops: 1

### Allowed Files
- `.gitignore`
- `playwright.config.ts`
- `tests/helpers/global-setup.ts`
- `scripts/setup-local-https.sh`
- `scripts/run-local-https.sh`
- `tests/admin-menus.spec.ts`
- `tests/public-admin-affordances.spec.ts`

### Acceptance Criteria
- [ ] The release path explicitly excludes local secrets/certs/caches/storage state (`.env*`, `.local-certs/`, `.next/`, `.omx/`, `test-results/`, `playwright-report/`, backend `bin/` / `obj/`, admin storage-state artifacts).
- [ ] A documented cache-clearing step exists for local verification artifacts that should not be pushed.
- [ ] The plan states that final push must not include unrelated WIP from other in-progress files/branches.
- [ ] Test files exist or are updated to cover at least one push-safety/admin-affordance expectation.

### Validation Commands
```bash
git check-ignore -v .env .next/ .local-certs/ .omx/ test-results/ playwright-report/ backend/src/Portfolio.Api/obj/ tests/helpers/admin-storage-state.json && python - <<'PY'
from pathlib import Path
import shutil
for target in [Path('.next/dev'), Path('test-results/playwright')]:
    shutil.rmtree(target, ignore_errors=True)
print('cleared-cache-artifacts')
PY
&& npm run lint && npm run typecheck && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/admin-menus.spec.ts tests/public-admin-affordances.spec.ts --workers=1
```

## [ ] M2: Read-only admin members page
Add a privacy-safe members listing surface to admin using existing `Profile` + `AuthSession` data, without turning it into full member management.

Dependencies: M1  
Estimated loops: 1-2

### Allowed Files
- `src/app/admin/layout.tsx`
- `src/app/admin/dashboard/page.tsx`
- `src/app/admin/members/page.tsx`
- `src/lib/api/admin-members.ts`
- `backend/src/Portfolio.Api/Controllers/AdminMembersController.cs`
- `backend/src/Portfolio.Api/Application/Admin/Abstractions/IAdminMemberService.cs`
- `backend/src/Portfolio.Api/Application/Admin/GetAdminMembers/*`
- `backend/src/Portfolio.Api/Infrastructure/Persistence/Admin/AdminMemberService.cs`
- `backend/src/Portfolio.Api/Program.cs`
- `backend/tests/Portfolio.Api.Tests/*Members*.cs`
- `src/test/admin-page-success-states.test.tsx`
- `tests/admin-members.spec.ts`
- `tests/admin-dashboard.spec.ts`

### Acceptance Criteria
- [ ] Admin navigation exposes a clear `Members` entry point.
- [ ] Admin members page loads through a dedicated backend admin API, not a hardcoded mock list.
- [ ] The page is **read-only** and shows only privacy-safe fields: display name, email, role, provider, joined date (`Profile.CreatedAt`), last login (`Profile.LastLoginAt`), and an optional bounded active-session summary.
- [ ] The UI/API does **not** expose raw session keys, IP addresses, provider subjects, tokens, or other security-sensitive datasets.
- [ ] Test files exist and cover at least one backend members query path plus one browser-visible admin members flow.

### Validation Commands
```bash
docker run --rm -v "$PWD/backend:/src" -w /src mcr.microsoft.com/dotnet/sdk:10.0-alpine dotnet test tests/Portfolio.Api.Tests/Portfolio.Api.Tests.csproj --filter "FullyQualifiedName~Members" && npm run build && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/admin-members.spec.ts tests/admin-dashboard.spec.ts --workers=1
```

## [ ] M3: HTTPS admin resume PDF upload fix
Make admin resume upload work reliably through the local HTTPS runtime while preserving the existing HTTP flow.

Dependencies: M1  
Estimated loops: 1-2

### Allowed Files
- `src/components/admin/ResumeEditor.tsx`
- `src/app/admin/pages/page.tsx`
- `src/lib/api/base.ts`
- `src/lib/api/browser.ts`
- `playwright.config.ts`
- `tests/helpers/global-setup.ts`
- `tests/admin-resume-upload.spec.ts`
- `tests/admin-resume-validation.spec.ts`
- `tests/public-admin-affordances.spec.ts`
- `backend/src/Portfolio.Api/Controllers/UploadsController.cs`
- `backend/src/Portfolio.Api/Controllers/AdminSiteSettingsController.cs`
- `backend/src/Portfolio.Api/Controllers/Models/UpdateSiteSettingsRequest.cs`
- `backend/tests/Portfolio.Api.Tests/UploadsControllerTests.cs`
- `nginx/local-https.conf`
- `docker-compose.https.yml`
- `scripts/setup-local-https.sh`
- `scripts/run-local-https.sh`

### Acceptance Criteria
- [ ] Admin resume PDF upload succeeds on `https://localhost/admin/pages` with the local HTTPS stack running.
- [ ] The uploaded resume is linked into site settings and appears on the public `/resume` page after the HTTPS flow.
- [ ] Non-PDF validation still blocks invalid uploads with a clear error.
- [ ] The HTTPS fix does not regress the normal HTTP/local runtime upload behavior.
- [ ] Test files exist and cover at least one HTTPS resume upload success path and one validation/failure path.

### Validation Commands
```bash
./scripts/setup-local-https.sh && NGINX_DEFAULT_CONF=./nginx/local-https.conf docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build && curl -ks https://localhost/api/auth/session && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=https://localhost npx playwright test tests/admin-resume-upload.spec.ts tests/admin-resume-validation.spec.ts tests/public-admin-affordances.spec.ts --workers=1
```

## [ ] M4: Regression expansion and push readiness
Lock the new members/HTTPS behavior with broader regression coverage, then finish with a clean release/push gate for `origin`.

Dependencies: M2, M3  
Estimated loops: 1

### Allowed Files
- `playwright.config.ts`
- `tests/helpers/global-setup.ts`
- `tests/admin-members.spec.ts`
- `tests/admin-resume-upload.spec.ts`
- `tests/admin-resume-validation.spec.ts`
- `tests/admin-dashboard.spec.ts`
- `tests/admin-menus.spec.ts`
- `tests/public-admin-affordances.spec.ts`
- `tests/public-detail-pages.spec.ts`
- `tests/resume.spec.ts`
- `src/test/admin-page-success-states.test.tsx`
- `src/test/admin-page-error-states.test.tsx`
- `src/test/resume-editor.test.tsx`
- `src/test/work-editor.test.tsx`
- `src/test/responsive-page-size.test.ts`

### Acceptance Criteria
- [ ] The release verification bundle explicitly covers members, HTTPS resume upload, HTTP resume upload, and core admin/public navigation.
- [ ] The final release checklist includes `git remote -v`, clean/safe staging expectations, and a no-secrets/no-local-artifacts push rule.
- [ ] Test files exist and cover at least one member-list path plus one HTTPS resume upload path in the final gate.
- [ ] The resulting branch is ready for a final `git push origin HEAD` step once all validation is green.

### Validation Commands
```bash
npm run lint && npm run typecheck && npm run build && npx vitest run src/test/admin-page-success-states.test.tsx src/test/admin-page-error-states.test.tsx src/test/resume-editor.test.tsx src/test/work-editor.test.tsx src/test/responsive-page-size.test.ts --pool=forks && PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost npx playwright test tests/admin-members.spec.ts tests/admin-dashboard.spec.ts tests/admin-menus.spec.ts tests/admin-pages-settings.spec.ts tests/admin-resume-upload.spec.ts tests/admin-resume-validation.spec.ts tests/admin-work-publish.spec.ts tests/admin-blog-publish.spec.ts tests/admin-blog-edit.spec.ts tests/public-admin-affordances.spec.ts tests/public-detail-pages.spec.ts tests/resume.spec.ts --workers=1 && git remote -v && git status --short
```
