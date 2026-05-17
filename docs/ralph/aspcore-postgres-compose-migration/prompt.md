# ASP.NET Core + Local PostgreSQL + Docker Compose/Nginx 마이그레이션

## Goals
- 기존 Next.js UI를 유지한 채 데이터/업로드/관리 기능의 런타임 백엔드를 ASP.NET Core로 분리한다.
- Supabase 의존성을 인증 중심으로 축소하고, 도메인 데이터는 로컬 PostgreSQL로 마이그레이션한다.
- 프론트엔드, 백엔드, DB를 Docker Compose로 묶고 Nginx가 단일 진입점이 되게 한다.
- 현재 admin/public 운영 흐름을 유지하되, admin UX의 분절을 줄일 개선 여지를 남긴다.

## Non-Goals
- 공개 UI의 비주얼 리디자인
- 인증 체계 자체의 전면 교체 (예: Supabase Auth 제거, 신규 IAM 도입)
- 모바일 앱/멀티테넌시/마이크로서비스화
- AI 편집 기능의 프롬프트 재설계
- Vercel 중심 배포 유지

## Hard Constraints
- 로그인 UX는 현재와 같은 Google OAuth + `/login` 진입 흐름을 유지해야 한다 (`src/app/login/page.tsx:9-15`, `src/app/api/auth/callback/route.ts:5-19`).
- admin 접근 제어는 반드시 유지되어야 한다. 현재는 `supabase.auth.getUser()` 후 `profiles.role === 'admin'`을 검사한다 (`src/app/admin/layout.tsx:13-34`).
- 공개 페이지 UI는 Next.js App Router 기반 SSR/RSC 구조를 유지해야 한다 (`src/app/(public)/layout.tsx:11-33`, `src/app/(public)/page.tsx:27-240`).
- 업로드/자산/이력서는 현재 Supabase Storage 공개 URL에 묶여 있으므로 저장소 전환 시 URL 체계를 함께 바꿔야 한다 (`src/app/api/uploads/route.ts:38-75`, `src/components/admin/ResumeEditor.tsx:27-67`, `next.config.ts:4-14`).
- 현재 코드가 기대하는 스키마와 `supabase/schema.sql`이 불일치할 수 있다. 예: 코드의 `site_settings.owner_name/tagline/social links`, `works.period/all_properties/icon_asset_id`는 스키마 파일에 없다 (`src/app/api/admin/site-settings/route.ts:25-49`, `src/app/admin/works/actions.ts:14-23`, `supabase/schema.sql:26-59`).
- 현재 CI/CD는 Docker build 검증 + Vercel 배포 전제로 작성되어 있어 Compose/Nginx 목표와 어긋난다 (`.github/workflows/ci-cd.yml:9-58`).

## Deliverables
- ASP.NET Core 백엔드 타깃 아키텍처와 경계 정의
- 로컬 PostgreSQL 스키마/마이그레이션/데이터 이관 계획
- 로컬 파일 자산 저장 전략과 URL 전략
- Next.js → ASP.NET Core 전환용 BFF/adapter 계획
- Docker Compose + Nginx 라우팅 설계
- admin UX 개선 제안서(공개 UI 변경 없음)
- Ralph 실행용 plans/implement/documentation/config/spec 세트

## Done When
- [ ] Next.js 공개 페이지가 Supabase 데이터 쿼리 없이 ASP.NET Core/로컬 PostgreSQL을 통해 동일한 화면을 렌더링한다.
- [ ] admin 로그인은 기존과 같은 Supabase OAuth 흐름을 유지하지만 역할/콘텐츠/업로드 데이터는 로컬 PostgreSQL/로컬 스토리지에서 동작한다.
- [ ] `/`, `/admin`, `/api`, `/media`가 Docker Compose + Nginx 뒤에서 동작한다.
- [ ] 업로드 파일/이력서/썸네일이 Supabase Storage가 아닌 로컬 스토리지 경로로 제공된다.
- [ ] 현재 admin UX의 분절 지점이 정리되고, 최소한 공통 editor shell/preview/workspace 방향이 문서화된다.
