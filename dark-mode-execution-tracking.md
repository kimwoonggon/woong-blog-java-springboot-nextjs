# Dark Mode Execution Tracking

`O` = 수행/확인 완료  
`X` = 미수행/미확인

## Implementation

| ID | Check | Status | Notes |
| --- | --- | --- | --- |
| T1 | `next-themes` 설치 및 lockfile 반영 | O | `package.json`, `package-lock.json` |
| T2 | `ThemeProvider` 생성 및 루트 레이아웃 래핑 | O | `src/components/providers/ThemeProvider.tsx`, `src/app/layout.tsx` |
| T3 | `ThemeToggle` 생성 및 Navbar 데스크탑/모바일 배치 | O | `src/components/ui/ThemeToggle.tsx`, `src/components/layout/Navbar.tsx` |
| T4 | 브랜드 CSS 변수 및 `@theme inline` 매핑 추가 | O | `src/app/globals.css` |
| T5 | 공용 페이지 HEX 마이그레이션 완료 | O | public pages + `Footer` |
| T6 | 누락된 `dark:` hover/text variant 보강 | O | `ResumeEditor` 보강 포함 |
| T7 | prose 코드블록 변수화 및 전역 dark 미세 스타일 추가 | O | scrollbar, selection 포함 |
| T8 | `WorkVideoEmbedComponent` brand ring 토큰화 | O | `ring-brand-orange` |
| T9 | `tests/dark-mode.spec.ts` 생성 | O | 24개 DM 시나리오 |

## Automated Verification

| ID | Check | Status | Notes |
| --- | --- | --- | --- |
| V1 | `npm run typecheck` | O | pass |
| V2 | `npm run lint` | O | pass |
| V3 | `npm run build` | O | pass |
| V4 | `tests/dark-mode.spec.ts` 실행 | O | HTTPS 기준 24 passed |
| V5 | 기존 public 회귀 테스트 실행 | O | 9 passed |
| V6 | 기존 admin 회귀 테스트 실행 | O | 4 passed |
| V7 | public/admin 대상 HEX 및 hover grep 검증 | O | HEX 0건, `hover:bg-red-50` 누락 0건 |

## Manual Video Review

| ID | Check | Status | Notes |
| --- | --- | --- | --- |
| DM-01 | 토글 버튼이 Navbar에 보이는가 | X | 사용자 확인 |
| DM-02 | 다크모드 전환 시 배경이 즉시 어두워지는가 | X | 사용자 확인 |
| DM-03 | 라이트모드 복귀 시 깜빡임(FOUC) 없는가 | X | 사용자 확인 |
| DM-04 | 새로고침 후에도 다크모드 유지되는가 | X | 사용자 확인 |
| DM-05 | 시스템 테마 따라가는가 | X | 사용자 확인 |
| DM-06 | 홈페이지 다크: 섹션 배경, 텍스트, 카드 정상 | X | 사용자 확인 |
| DM-07 | Works 목록 다크: 배지, 카드, hover 정상 | X | 사용자 확인 |
| DM-08 | Works 상세 다크: prose, 이미지, 배지 정상 | X | 사용자 확인 |
| DM-09 | Blog 목록 다크: 카드 레이아웃 깨짐 없음 | X | 사용자 확인 |
| DM-10 | Blog 상세 다크: 코드블록, 인용문, 링크 정상 | X | 사용자 확인 |
| DM-11 | Contact 다크: 이메일 링크 가시적 | X | 사용자 확인 |
| DM-12 | Footer 다크: 배경 어둡고 링크 hover 정상 | X | 사용자 확인 |
| DM-13 | Login 다크: 카드/입력필드 구분 가능 | X | 사용자 확인 |
| DM-14 | Admin Dashboard 다크: 카드/통계 가시적 | X | 사용자 확인 |
| DM-15 | BlogEditor 다크: 에디터/버튼 정상 | X | 사용자 확인 |
| DM-16 | WorkEditor 다크: 업로드존/버튼 정상 | X | 사용자 확인 |
| DM-17 | 삭제 버튼 hover 다크: 배경 변화 있음 | X | 사용자 확인 |
| DM-18 | 코드블록 다크: 배경 더 어둡고 텍스트 선명 | X | 사용자 확인 |
| DM-19 | Prose 다크: 모든 제목/본문/리스트 가독적 | X | 사용자 확인 |
| DM-20 | 모바일 다크: 네비 토글 있고 전체 정상 | X | 사용자 확인 |
| DM-21 | 다크↔라이트 전환: 레이아웃 깨짐 없음 | X | 사용자 확인 |
| DM-22 | Pagination 다크: active 버튼 구분 가능 | X | 사용자 확인 |
| DM-23 | 본문 대비 4.5:1 이상 | X | 사용자 확인 |
| DM-24 | muted 텍스트 대비 3:1 이상 | X | 사용자 확인 |
