# Plans

> **Stop-and-fix rule**: validation 실패 시 다음 마일스톤으로 넘어가지 않는다.

## [ ] M1: ASP.NET Core 백엔드/Compose/Nginx 골격 확정

Next.js UI는 그대로 두고, 새 백엔드 런타임과 배포 골격만 먼저 세운다. 이 단계에서는 기능 cutover보다 “새 경계가 실제로 기동 가능한가”를 증명한다.

Dependencies: 없음
Estimated loops: 2

### Allowed Files
- backend/
- nginx/
- docker-compose.yml
- backend/Dockerfile
- Dockerfile
- .github/workflows/ci-cd.yml
- src/lib/backend/
- src/lib/config/
- tests/

### Acceptance Criteria
- [ ] ASP.NET Core solution/project 구조가 생성되고 health endpoint가 존재한다.
- [ ] `docker-compose.yml`에 frontend/backend/db/nginx 서비스와 기본 healthcheck/volume/network가 정의된다.
- [ ] Nginx가 `/`는 Next.js, `/api`는 ASP.NET Core, `/media`는 자산 경로로 라우팅하도록 설계된다.
- [ ] 테스트 파일이 존재하고 compose 골격/health contract를 커버한다.

### Validation Commands
```bash
npm run lint && npm run build && dotnet test backend/tests/Portfolio.Backend.Tests/Portfolio.Backend.Tests.csproj && docker compose config
```

## [ ] M2: 로컬 PostgreSQL 도메인 스키마와 이관 기반 만들기

현행 코드가 실제로 쓰는 필드 기준으로 PostgreSQL 스키마를 재정의한다. `supabase/schema.sql`은 참고만 하고, 코드가 기대하는 컬럼/타입을 기준으로 EF Core 엔터티와 migration을 만든다.

Dependencies: M1
Estimated loops: 3

### Allowed Files
- backend/src/Portfolio.Domain/
- backend/src/Portfolio.Application/
- backend/src/Portfolio.Infrastructure/
- backend/src/Portfolio.Api/
- backend/tests/
- scripts/
- supabase/schema.sql
- docs/ralph/aspcore-postgres-compose-migration/

### Acceptance Criteria
- [ ] `profiles`, `assets`, `site_settings`, `pages`, `works`, `blogs`, `page_views`가 코드 현실을 반영한 로컬 PostgreSQL 스키마로 정의된다.
- [ ] 현재 코드가 사용하는 `site_settings` 확장 필드와 `works` 확장 필드가 누락 없이 반영된다.
- [ ] 데이터 import/mapping 전략(특히 slug, published_at, asset path, role)이 문서화된다.
- [ ] 테스트 파일이 존재하고 스키마 생성/핵심 제약/seed 규칙을 커버한다.

### Validation Commands
```bash
dotnet test backend/tests/Portfolio.Backend.Tests/Portfolio.Backend.Tests.csproj --filter Schema && docker compose config && npm run lint && npm run build
```

## [ ] M3: 공개 페이지 read path를 ASP.NET Core로 이관

공개 UI는 건드리지 않고, `(public)` 페이지들이 Supabase 대신 ASP.NET Core read API를 통해 데이터를 받게 만든다. Next.js는 SSR UI shell 역할만 수행한다.

Dependencies: M2
Estimated loops: 3

### Allowed Files
- src/app/(public)/
- src/app/layout.tsx
- src/lib/backend/
- src/lib/supabase/
- backend/src/Portfolio.Api/
- backend/src/Portfolio.Application/
- backend/src/Portfolio.Infrastructure/
- backend/tests/
- tests/

### Acceptance Criteria
- [ ] Home/Works/Blog/Introduction/Contact/Resume read path가 ASP.NET Core API + 로컬 PostgreSQL을 사용한다.
- [ ] 공개 페이지의 시각적 결과와 fallback 메시지가 현재 동작과 동일하게 유지된다.
- [ ] 공개 페이지 source에서 도메인 데이터 조회를 위한 Supabase table query가 제거된다.
- [ ] 테스트 파일이 존재하고 공개 read contract와 fallback 동작을 커버한다.

### Validation Commands
```bash
npm run lint && npm run build && dotnet test backend/tests/Portfolio.Backend.Tests/Portfolio.Backend.Tests.csproj --filter PublicRead
```

## [ ] M4: 인증 브리지와 admin read path 이관

로그인/세션은 기존 Supabase OAuth를 유지한다. 대신 admin role/profile/dashboard read는 로컬 PostgreSQL 기반 ASP.NET Core를 통해 처리한다. Next.js는 인증 확인 후 trusted internal caller/BFF로 백엔드와 통신한다.

Dependencies: M3
Estimated loops: 3

### Allowed Files
- src/app/admin/layout.tsx
- src/app/admin/dashboard/page.tsx
- src/app/login/page.tsx
- src/app/api/auth/callback/route.ts
- src/lib/backend/
- src/lib/supabase/
- backend/src/Portfolio.Api/
- backend/src/Portfolio.Application/
- backend/src/Portfolio.Infrastructure/
- backend/tests/
- tests/

### Acceptance Criteria
- [ ] `/login`과 OAuth callback UX는 유지된다.
- [ ] admin role 판정이 로컬 PostgreSQL profile 기준으로 수행된다.
- [ ] admin dashboard/read path가 ASP.NET Core를 통해 동작한다.
- [ ] local profile이 없거나 role이 admin이 아닐 때 명시적으로 차단된다.
- [ ] 테스트 파일이 존재하고 auth bridge/admin read contract를 커버한다.

### Validation Commands
```bash
npm run lint && npm run build && dotnet test backend/tests/Portfolio.Backend.Tests/Portfolio.Backend.Tests.csproj --filter AuthBridge
```

## [ ] M5: admin write path와 업로드를 로컬 백엔드/스토리지로 이관

기존 UI를 유지하기 위해 client component 인터페이스는 가급적 그대로 둔다. 하지만 server actions/route handlers는 ASP.NET Core admin API를 호출하도록 바꾸고, 업로드는 로컬 파일 저장소 + assets metadata로 대체한다.

Dependencies: M4
Estimated loops: 4

### Allowed Files
- src/app/admin/pages/actions.ts
- src/app/admin/works/actions.ts
- src/app/admin/blog/actions.ts
- src/app/api/admin/pages/route.ts
- src/app/api/admin/site-settings/route.ts
- src/app/api/uploads/route.ts
- src/components/admin/
- src/lib/backend/
- src/lib/supabase/
- src/app/admin/pages/page.tsx
- src/app/admin/works/page.tsx
- src/app/admin/blog/page.tsx
- src/app/(public)/page.tsx
- src/app/(public)/works/page.tsx
- src/app/(public)/blog/page.tsx
- src/app/(public)/resume/page.tsx
- next.config.ts
- backend/src/Portfolio.Api/
- backend/src/Portfolio.Application/
- backend/src/Portfolio.Infrastructure/
- backend/tests/
- tests/

### Acceptance Criteria
- [ ] pages/site settings/works/blog CRUD가 ASP.NET Core + 로컬 PostgreSQL을 사용한다.
- [ ] 업로드/삭제/이력서 연결이 로컬 파일 저장소를 사용한다.
- [ ] 공개 자산 URL이 Supabase host 가정 없이 `/media/...` 또는 동등한 로컬 경로로 제공된다.
- [ ] 업로드 성공 후 metadata 실패, metadata 성공 후 파일 실패 같은 silent failure를 막는 보상/정리 규칙이 존재한다.
- [ ] 테스트 파일이 존재하고 admin mutation/upload contract를 커버한다.

### Validation Commands
```bash
npm run lint && npm run build && dotnet test backend/tests/Portfolio.Backend.Tests/Portfolio.Backend.Tests.csproj --filter AdminMutation
```

## [ ] M6: Compose/Nginx 운영 경로 완성 및 배포 파이프라인 정리

Nginx를 단일 진입점으로 고정하고, frontend/backend/db/media volume을 포함한 Compose 운영 시나리오를 마무리한다. 기존 Vercel deploy workflow는 Compose 기반 배포/검증 흐름으로 대체하거나 분리한다.

Dependencies: M5
Estimated loops: 2

### Allowed Files
- docker-compose.yml
- nginx/
- Dockerfile
- backend/Dockerfile
- .github/workflows/ci-cd.yml
- README.md
- docs/
- backend/tests/
- tests/

### Acceptance Criteria
- [ ] `docker compose up -d` 후 Nginx를 통해 `/`, `/admin`, `/api`, `/media`가 기대한 서비스로 연결된다.
- [ ] backend와 db의 의존/health 순서가 정의된다.
- [ ] CI가 Compose/컨테이너 기준 검증 경로를 가진다.
- [ ] 테스트 파일이 존재하고 container routing/health contract를 커버한다.

### Validation Commands
```bash
npm run lint && npm run build && dotnet test backend/tests/Portfolio.Backend.Tests/Portfolio.Backend.Tests.csproj && docker compose config
```

## [ ] M7: admin 작업공간 UX 정리 (공개 UI 변경 없음)

백엔드 컷오버가 끝난 뒤 admin 사용성만 다듬는다. 공개 UI는 그대로 두고, 운영자용 편집 경험을 “하나의 작업공간”처럼 느껴지게 만든다.

Dependencies: M5
Estimated loops: 2

### Allowed Files
- src/app/admin/
- src/components/admin/
- src/components/ui/
- src/lib/utils.ts
- tests/

### Acceptance Criteria
- [ ] `/admin/pages`는 Settings/Home/Introduction/Contact/Resume를 찾기 쉬운 workspace 구조(탭, anchor, section nav 중 하나)로 정리된다.
- [ ] Work/Blog/Page/Home editor가 공통 header/save feedback/publish/preview 패턴을 공유한다.
- [ ] Blog list의 중복 “View Public” 액션이 제거된다.
- [ ] 공개 페이지 시각 디자인은 변경되지 않는다.
- [ ] 테스트 파일이 존재하고 admin workspace 주요 상호작용을 커버한다.

### Validation Commands
```bash
npm run lint && npm run build && dotnet test backend/tests/Portfolio.Backend.Tests/Portfolio.Backend.Tests.csproj --filter Smoke
```
