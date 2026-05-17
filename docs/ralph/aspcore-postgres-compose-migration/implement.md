# Implementation Rules

**Source of truth**: `plans.md`

## Rules
1. `plans.md`의 마일스톤 순서대로 진행한다.
2. 각 마일스톤 완료 후 해당 Validation Commands를 반드시 실행한다.
3. Validation 실패 시 다음 마일스톤으로 넘어가지 않는다. 원인 수정 후 같은 마일스톤을 재검증한다.
4. Next.js 공개 UI의 마크업/스타일 변경은 금지한다. 필요한 경우 데이터 소스/adapter만 바꾼다.
5. 인증은 “기존 Supabase OAuth UX 유지”가 기본값이다. auth 전면 교체는 새 마일스톤 없이 수행하지 않는다.
6. Next.js는 점진적으로 BFF/adapter가 되고, 도메인 데이터/업로드/role 판정은 ASP.NET Core + 로컬 PostgreSQL로 옮긴다.
7. `supabase/schema.sql`을 그대로 믿지 말고, 현재 코드가 실제로 읽고 쓰는 필드를 기준으로 스키마를 맞춘다.
8. storage 전환 시 URL 계약(`/media/...` 등), orphan cleanup, asset metadata 일관성을 함께 다룬다.
9. admin UX 개선은 M7 이전에 공개 UI 리디자인으로 번지지 않도록 제한한다.
10. 새 작업이 발견되면 `plans.md`에 마일스톤을 추가하고 그 전에는 임의 확장하지 않는다.

## Scope Guard
> 제외 대상: 공개 UI 리디자인, 인증 전면 교체, 모바일 앱, 멀티테넌시, 마이크로서비스 분할, AI 기능 재설계, Supabase Auth 완전 제거.
