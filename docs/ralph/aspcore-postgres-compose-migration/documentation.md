# Documentation

_Last updated: 2026-03-23T16:00:00+09:00_

**Current milestone**: M1

## How to Run

### 현재 기준
- 프론트엔드 개발 서버: `npm run dev`
- 현재 빌드 검증: `npm run lint && npm run build`

### 목표 기준
- 전체 스택: `docker compose up -d --build`
- 외부 진입점: `http://localhost` 또는 Nginx가 바인딩한 포트
- 내부 라우팅:
  - `/` → Next.js frontend
  - `/api` → ASP.NET Core backend
  - `/media` → 로컬 자산 경로
  - `postgres://...` → Docker Compose 내 PostgreSQL

## How to Demo

### 시나리오 A — 공개 방문자
1. 방문자가 Nginx 진입점 `/`로 접속한다.
2. Home/Works/Blog/Introduction/Contact/Resume 화면이 기존 UI와 동일하게 보인다.
3. 작품/블로그 상세로 이동해도 데이터는 ASP.NET Core + 로컬 PostgreSQL에서 읽힌다.
4. 자산이 없을 때는 현재와 동일한 placeholder/fallback이 보인다.

### 시나리오 B — 관리자 로그인
1. 운영자가 `/login`으로 진입한다.
2. Google OAuth 로그인 버튼을 누른다.
3. callback 후 `/admin`으로 돌아온다.
4. admin role이 로컬 PostgreSQL profile에 있으면 admin shell이 열리고, 아니면 `/`로 리다이렉트된다.

### 시나리오 C — 콘텐츠 수정
1. 운영자가 `/admin/works` 또는 `/admin/blog` 또는 `/admin/pages`로 이동한다.
2. 기존 UI 그대로 편집/저장/게시를 수행한다.
3. Next.js action/route가 ASP.NET Core admin API를 호출한다.
4. PostgreSQL과 로컬 자산 저장소가 갱신되고, public 페이지가 revalidate 된다.
5. 새로고침 후 공개 페이지에서 변경 사항이 반영된다.

### 시나리오 D — 자산 업로드/이력서 교체
1. 운영자가 이미지 또는 PDF를 업로드한다.
2. 파일이 로컬 저장소에 기록되고 metadata가 PostgreSQL `assets`에 남는다.
3. 반환 URL은 Supabase public URL이 아니라 로컬 `/media/...` 경로다.
4. 파일 삭제/교체 시 metadata와 실제 파일이 함께 정리된다.

## Decisions Log
| Timestamp | Milestone | Decision | Reasoning |
|-----------|-----------|----------|-----------|
| 2026-03-23 16:00 KST | Discovery | Next.js 공개/관리 UI는 유지하고 ASP.NET Core를 도메인 백엔드로 추가 | 사용자 요청이 UI 유지와 백엔드 교체를 동시에 요구함 |
| 2026-03-23 16:00 KST | Discovery | 인증은 기존 Supabase OAuth UX를 유지 | `/login` + callback 흐름이 이미 구현되어 있고, 인증 재구축은 범위를 과도하게 키움 |
| 2026-03-23 16:00 KST | Discovery | 도메인 데이터는 로컬 PostgreSQL로 이전 | Supabase data dependency를 제거해야 함 |
| 2026-03-23 16:00 KST | Discovery | 자산 저장은 로컬 파일 스토리지(+metadata DB)로 전환 | Compose 서비스 수를 늘리지 않고 Supabase Storage dependency를 제거하기 위함 |
| 2026-03-23 16:00 KST | Discovery | Nginx가 단일 진입점이 됨 | frontend/backend/media 라우팅 요구사항 충족 |
| 2026-03-23 16:00 KST | UX Review | admin UX는 public redesign 없이 workspace 방식으로 개선 | 현재 문제는 공개 UI가 아니라 운영자 상호작용의 분절임 |

## Known Issues
- `supabase/schema.sql`이 현재 코드가 기대하는 실사용 컬럼 세트와 다를 가능성이 높다.
- 현재 공개 페이지/관리 페이지/업로드/role 판정이 모두 Supabase table/storage query에 직접 연결되어 있다.
- 현재 CI/CD는 Compose/Nginx 목표와 달리 Vercel 배포 중심이다.

## Admin UX Improvement Proposal

### 현재 파악된 불편 지점
1. public shell과 admin shell이 완전히 분리되어 있어 운영자가 결과 확인을 위해 자주 컨텍스트를 바꿔야 한다.
2. `/admin/pages`는 settings/home/introduction/contact/resume를 한 페이지에 길게 쌓아둬 탐색성이 낮다.
3. Home/Page/Work/Blog editor가 저장 방식과 피드백 방식이 제각각이다.
4. Works/Blog list는 거의 같은 구조인데 중복 구현이 많고 Blog에는 public-view 버튼 중복 버그가 있다.

### 개선 제안
1. **Admin Workspace 정리**
   - `/admin/pages`를 Settings / Home / Introduction / Contact / Resume 단위의 탭 또는 section-nav 구조로 바꾼다.
2. **공통 Editor Shell 도입**
   - 저장 버튼 위치, 저장 상태, publish toggle, preview entry, last updated 표기를 공통화한다.
3. **Preview Bridge 추가**
   - editor 내부에서 public preview를 side drawer / 새 탭 / split preview 중 하나로 빠르게 볼 수 있게 한다.
4. **목록 화면 공통화**
   - Works/Blog list의 row action 패턴을 통일하고, 중복 public-view 버튼을 제거한다.
5. **공개 UI 비변경 원칙 유지**
   - 개선 범위는 admin IA/interaction으로만 제한한다.
