# 다크모드 구현 지시서 (AI Agent 실행용)

> **브랜치**: `feat/add-front-darkmode`  
> **작성일**: 2026-04-11  
> **테스트 환경**: nginx HTTPS 모드 (`docker-compose.https.yml`)  
> **테스트 프레임워크**: Playwright (E2E) + 비디오 녹화 검증

---

## 현재 상태 분석

### 이미 갖춰진 인프라
- `src/app/globals.css`에 `:root` / `.dark` CSS 변수 정의됨 (oklch 색상 체계)
- `@custom-variant dark (&:is(.dark *))` — Tailwind v4 `dark:` prefix 활성화됨
- shadcn/ui 컴포넌트 — CSS 변수 기반으로 다크모드 자동 대응
- 대부분 컴포넌트에 `dark:` Tailwind 클래스 ~90% 적용됨

### 누락된 것
- `next-themes` 패키지 미설치
- ThemeProvider 컴포넌트 없음
- `<html>` 태그에 `.dark` 클래스를 적용/해제하는 메커니즘 없음
- 다크모드 토글 UI 없음
- 하드코딩 HEX 색상 6개(`#142850`, `#EDF7FA`, `#00A8CC`, `#FF7B54`, `#F3434F`)에 다크 variant 없거나 부적절
- 일부 컴포넌트(~10개)에서 `dark:` hover variant 누락

---

## 공통 규칙

1. **기존 동작 깨뜨리지 않기**: 라이트 모드의 현재 디자인은 그대로 유지한다.
2. **CSS 변수 우선**: 하드코딩 HEX를 CSS custom property로 전환할 때 `:root`/`.dark` 양쪽 모두 정의한다.
3. **FOUC 방지**: `next-themes`의 인라인 스크립트가 SSR 시점에 `<html class="dark">`를 설정하도록 한다.
4. **Playwright 비디오**: 모든 E2E 테스트는 `video: 'on'`으로 실행하여 비디오 아티팩트를 남긴다.
5. **한 TODO 완료 → 해당 테스트 통과 확인 → 다음 TODO** 순서를 지킨다.

---

## TODO 1: `next-themes` 설치 및 ThemeProvider 생성

### 1-1. 패키지 설치
```bash
npm install next-themes
```

### 1-2. ThemeProvider 컴포넌트 생성
**파일**: `src/components/providers/ThemeProvider.tsx`

```tsx
"use client"

import { ThemeProvider as NextThemesProvider     } from "next-themes"
import type { ReactNode } from "react"

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
```

### 1-3. 루트 레이아웃 수정
**파일**: `src/app/layout.tsx`

변경 사항:
- `<html lang="en">` → `<html lang="en" suppressHydrationWarning>`
- `<body>` 내부를 `<ThemeProvider>`로 감싼다
- import 추가: `import { ThemeProvider } from "@/components/providers/ThemeProvider"`

변경 전:
```tsx
<html lang="en">
  <body className={cn(archivo.variable, spaceGrotesk.variable, "antialiased font-sans bg-background text-foreground")}>
    {children}
    <Toaster position="top-right" richColors />
  </body>
</html>
```

변경 후:
```tsx
<html lang="en" suppressHydrationWarning>
  <body className={cn(archivo.variable, spaceGrotesk.variable, "antialiased font-sans bg-background text-foreground")}>
    <ThemeProvider>
      {children}
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  </body>
</html>
```

### 검증 기준
- `npm run build` 성공
- `npm run typecheck` 에러 없음
- 브라우저에서 `document.documentElement.classList`에 `dark` 또는 빈 값이 시스템 설정에 따라 적용됨

---

## TODO 2: 다크모드 토글 버튼 생성 및 Navbar 배치

### 2-1. ThemeToggle 컴포넌트 생성
**파일**: `src/components/ui/ThemeToggle.tsx`

요구사항:
- `"use client"` 선언
- `useTheme()` 훅 사용 (`next-themes`)
- `lucide-react`의 `Sun`, `Moon`, `Monitor` 아이콘 사용
- 클릭 시 light → dark → system 순환, 또는 드롭다운 메뉴로 3가지 선택
- hydration mismatch 방지: `useEffect`로 `mounted` 상태 관리, mounted 전 skeleton/placeholder 렌더
- 접근성: `aria-label="테마 변경"`, 키보드 포커스 가능
- 스타일: 기존 Navbar 버튼과 일관된 크기/패딩. `bg-transparent hover:bg-accent` 스타일 권장
- `data-testid="theme-toggle"` 속성 필수

### 2-2. Navbar에 토글 배치
**파일**: `src/components/layout/Navbar.tsx`

배치 위치:
- **데스크탑**: 우측 네비게이션 영역, 로그인/아바타 버튼 **바로 좌측**
- **모바일**: 모바일 메뉴 내에도 ThemeToggle 렌더링

### 검증 기준
- 토글 버튼이 Navbar에 나타남
- 클릭 시 `<html>` 태그의 class가 `dark`↔(없음) 전환됨
- 새로고침 후에도 선택한 테마가 유지됨 (localStorage `theme` 키)
- 시스템 테마 변경 시 "system" 모드에서 자동 반영

---

## TODO 3: 브랜드 색상 CSS 변수 추가

### 3-1. globals.css에 커스텀 브랜드 변수 정의
**파일**: `src/app/globals.css`

`:root` 블록 내부에 추가:
```css
--brand-accent: oklch(0.60 0.22 25);       /* #F3434F 레드 */
--brand-navy: oklch(0.25 0.08 260);         /* #142850 네이비 */
--brand-cyan: oklch(0.65 0.14 220);         /* #00A8CC 시안 */
--brand-orange: oklch(0.72 0.17 45);        /* #FF7B54 오렌지 */
--brand-section-bg: oklch(0.97 0.01 220);   /* #EDF7FA 라이트 시안 배경 */
```

`.dark` 블록 내부에 추가:
```css
--brand-accent: oklch(0.65 0.22 25);        /* 다크배경 대비 약간 밝은 레드 */
--brand-navy: oklch(0.55 0.15 260);         /* 다크배경 대비 밝은 블루 */
--brand-cyan: oklch(0.75 0.14 220);         /* 다크배경 대비 밝은 시안 */
--brand-orange: oklch(0.78 0.17 45);        /* 다크배경 대비 밝은 오렌지 */
--brand-section-bg: oklch(0.18 0.02 220);   /* 어두운 시안 배경 */
```

### 3-2. `@theme inline` 블록에 매핑 추가
```css
--color-brand-accent: var(--brand-accent);
--color-brand-navy: var(--brand-navy);
--color-brand-cyan: var(--brand-cyan);
--color-brand-orange: var(--brand-orange);
--color-brand-section-bg: var(--brand-section-bg);
```

### 검증 기준
- `npm run build` 성공
- 브라우저 DevTools에서 라이트/다크 모드 전환 시 CSS 변수 값이 바뀌는지 확인

---

## TODO 4: 공용 페이지 하드코딩 색상 마이그레이션

### 4-1. 홈페이지 (`src/app/(public)/page.tsx`)
| 변경 대상 | 변경 전 | 변경 후 |
|-----------|---------|---------|
| 섹션 배경 | `bg-[#EDF7FA]` | `bg-brand-section-bg` |
| 링크 텍스트 | `text-[#00A8CC]` | `text-brand-cyan` |
| 링크 hover | `hover:text-[#00A8CC]` | `hover:text-brand-cyan` |
| 링크 dark | `dark:text-[#00A8CC]` | (제거, 변수가 자동 전환) |
| 카테고리 배지 | `bg-[#142850] text-white` | `bg-brand-navy text-white` |
| 액센트 텍스트 | `text-[#F3434F]` | `text-brand-accent` |
| 액센트 hover | `hover:text-[#F3434F]` | `hover:text-brand-accent` |

### 4-2. Works 목록 (`src/app/(public)/works/page.tsx`)
| 변경 전 | 변경 후 |
|---------|---------|
| `bg-[#142850]` | `bg-brand-navy` |
| `hover:text-[#F3434F]` | `hover:text-brand-accent` |

### 4-3. Works 상세 (`src/app/(public)/works/[slug]/page.tsx`)
| 변경 전 | 변경 후 |
|---------|---------|
| `bg-[#FF7B54]` | `bg-brand-orange` |
| `border-[#FF7B54]` | `border-brand-orange` |
| `hover:text-[#FF7B54]` | `hover:text-brand-orange` |

### 4-4. Blog 상세 (`src/app/(public)/blog/[slug]/page.tsx`)
| 변경 전 | 변경 후 |
|---------|---------|
| `bg-[#F3434F]` | `bg-brand-accent` |
| `hover:bg-[#F3434F]/90` | `hover:bg-brand-accent/90` |
| `hover:text-[#F3434F]` | `hover:text-brand-accent` |
| `border-[#F3434F]` | `border-brand-accent` |

### 4-5. Blog 목록 (`src/app/(public)/blog/page.tsx`)
| 변경 전 | 변경 후 |
|---------|---------|
| `hover:text-[#F3434F]` | `hover:text-brand-accent` |

### 4-6. Footer (`src/components/layout/Footer.tsx`)
| 변경 전 | 변경 후 |
|---------|---------|
| `hover:text-[#F3434F]` | `hover:text-brand-accent` |
| `dark:hover:text-[#F3434F]` | (제거, 변수 자동 전환) |

### 검증 기준
- 라이트 모드에서 기존과 동일한 색상 유지 (시각적으로 차이 없음)
- 다크 모드에서 배경/텍스트가 적절히 밝게 전환됨
- 모든 하드코딩 HEX (`#142850`, `#EDF7FA`, `#00A8CC`, `#FF7B54`, `#F3434F`) 검색 시 공용 페이지에서 0건

---

## TODO 5: 누락된 `dark:` variant 추가

### 5-1. DeleteButton (`src/components/admin/DeleteButton.tsx`)
- `hover:bg-red-50` → `hover:bg-red-50 dark:hover:bg-red-950/20` 추가

### 5-2. AdminBlogTableClient (`src/components/admin/AdminBlogTableClient.tsx`)
- 삭제 버튼의 `hover:bg-red-50` → `dark:hover:bg-red-950/20` 추가

### 5-3. AdminWorksTableClient (`src/components/admin/AdminWorksTableClient.tsx`)
- 삭제 버튼의 `hover:bg-red-50` → `dark:hover:bg-red-950/20` 추가

### 5-4. Login 페이지 (`src/app/login/page.tsx`)
- `hover:bg-emerald-100` → `hover:bg-emerald-100 dark:hover:bg-emerald-900/50` 추가

### 5-5. Contact 페이지 (`src/app/(public)/contact/page.tsx`)
- `text-blue-600` → `text-blue-600 dark:text-blue-400` 추가

### 5-6. PublicPagination (`src/components/layout/PublicPagination.tsx`)
- active 상태: `border-sky-400 bg-sky-500 text-white` → `dark:border-sky-600 dark:bg-sky-600` 추가

### 5-7. AuthoringCapabilityHints (`src/components/admin/AuthoringCapabilityHints.tsx`)
- `bg-white/70` → `bg-white/70 dark:bg-sky-950/60` 추가

### 5-8. Tiptap toolbar 플로팅 (`src/components/admin/tiptap-editor/toolbar.tsx`)
- 플로팅 툴바 `bg-gray-900 dark:bg-gray-800` → `bg-gray-900 dark:bg-gray-950 dark:border dark:border-gray-700` 수정

### 5-9. Tiptap extensions 링크 색상 (`src/components/admin/tiptap-editor/extensions.ts`)
- `text-blue-600 hover:text-blue-800` → `dark:text-blue-400 dark:hover:text-blue-300` 추가

### 5-10. BlogEditor / WorkEditor 버튼 (`src/components/admin/BlogEditor.tsx`, `src/components/admin/WorkEditor.tsx`)
- `bg-[#142850]` → `bg-brand-navy` 변환 (TODO 3에서 정의한 변수 사용)
- `hover:bg-[#142850]/90` → `hover:bg-brand-navy/90` 변환

### 검증 기준
- 다크 모드에서 모든 버튼 hover 상태가 시각적으로 구분됨
- 다크 모드에서 텍스트가 배경과 충분한 대비를 가짐
- grep으로 `hover:bg-red-50`만 있는 줄(dark: 없는)이 0건

---

## TODO 6: Prose / 코드 블록 다크모드 정비

### 6-1. globals.css Prose `pre` 배경 변수화
**파일**: `src/app/globals.css`

변경 전:
```css
.prose pre {
  background: #111827;
  ...
  color: #f9fafb;
}
```

변경 후:
```css
.prose pre {
  background: var(--code-block-bg, #111827);
  ...
  color: var(--code-block-fg, #f9fafb);
}
```

`:root`에 추가:
```css
--code-block-bg: #111827;
--code-block-fg: #f9fafb;
```

`.dark`에 추가:
```css
--code-block-bg: #0d1117;
--code-block-fg: #e6edf3;
```

### 6-2. highlight.js 테마 유지
- 코드블록은 라이트/다크 모두 다크 배경 유지 (개발자 블로그 표준)
- `github-dark.css` import 그대로 유지
- 추가 작업 없음

### 검증 기준
- 라이트 모드: 코드블록 배경 `#111827` (기존과 동일)
- 다크 모드: 코드블록 배경 `#0d1117` (약간 더 어두움)
- 코드 텍스트 가독성 양쪽 모두 정상

---

## TODO 7: 전역 다크모드 미세 스타일 추가

### 7-1. 스크롤바 다크모드 (`src/app/globals.css`)
```css
@layer base {
  .dark ::-webkit-scrollbar-track { background: oklch(0.15 0.02 280); }
  .dark ::-webkit-scrollbar-thumb { background: oklch(0.35 0.02 280); }
}
```

### 7-2. 텍스트 선택 영역
```css
@layer base {
  ::selection { background: oklch(0.60 0.22 25 / 30%); }
  .dark ::selection { background: oklch(0.60 0.22 25 / 40%); color: white; }
}
```

### 7-3. 다크모드 이미지 밝기 (선택)
- **하지 않는다** — 이미지 원본 색 유지 (`filter: brightness` 적용 안 함)

### 검증 기준
- 다크 모드에서 스크롤바가 배경과 조화를 이룸
- 텍스트 선택 시 하이라이트가 양 모드에서 가시적

---

## TODO 8: 빌드 및 타입 검증

```bash
npm run typecheck   # TypeScript 에러 0건
npm run lint        # ESLint 에러 0건
npm run build       # Next.js 빌드 성공
```

### 검증 기준
- 3가지 명령 모두 exit code 0

---

# 테스트 계획

## 테스트 환경 구성

### HTTPS 모드 실행
```bash
# 1. Docker 스택 빌드 및 실행
docker compose -f docker-compose.yml -f docker-compose.https.yml up --build -d

# 2. 백엔드 헬스체크
curl -k https://localhost/api/health

# 3. Playwright HTTPS 환경변수 설정
export PLAYWRIGHT_EXTERNAL_SERVER=1
export PLAYWRIGHT_BASE_URL=https://localhost
```

### Playwright 비디오 설정 확인
`playwright.config.ts`에 이미 `video: 'on'` 설정됨.  
모든 테스트 비디오는 `test-results/playwright/` 하위에 저장된다.

---

## Playwright 테스트 파일 생성

### 테스트 파일: `tests/dark-mode.spec.ts`

이 파일 하나에 모든 다크모드 관련 E2E 테스트를 작성한다. 각 `test()`가 개별 비디오를 생성하므로 TODO별 검증이 가능하다.

---

### 테스트 그룹 1: 테마 토글 기능 (TODO 1-2 검증)

```
test('DM-01: 테마 토글 버튼이 Navbar에 존재한다')
- / 접속 → data-testid="theme-toggle" 요소가 visible

test('DM-02: 토글 클릭으로 다크모드 전환된다')
- / 접속 → 토글 클릭 → <html> 태그에 class="dark" 포함 확인
- 배경색이 어두운 값으로 변경 확인 (getComputedStyle)

test('DM-03: 토글 클릭으로 라이트모드 복귀된다')
- 다크모드 상태에서 토글 클릭 → <html>에 class="dark" 없음 확인
- 배경색이 밝은 값으로 복원 확인

test('DM-04: 테마 선택이 새로고침 후에도 유지된다')
- 토글로 다크모드 전환 → page.reload() → <html> class에 "dark" 유지

test('DM-05: 시스템 테마 "system" 모드 동작')
- emulateMedia({ colorScheme: 'dark' }) → 시스템 다크모드에서 dark 클래스 적용 확인
- emulateMedia({ colorScheme: 'light' }) → light로 복원 확인
```

### 테스트 그룹 2: 공용 페이지 다크모드 렌더링 (TODO 3-4 검증)

```
test('DM-06: 홈페이지 다크모드 렌더링')
- 다크모드 전환 → / 접속
- 페이지 배경이 어두운지 확인 (background-color 검증)
- "Recent posts" 섹션 배경이 어두운 시안인지 확인
- 스크린샷 촬영

test('DM-07: Works 목록 다크모드 렌더링')
- 다크모드 → /works 접속
- 카테고리 배지 배경이 밝은 블루인지 확인 (brand-navy 다크값)
- 카드 텍스트가 밝은 색인지 확인

test('DM-08: Works 상세 다크모드 렌더링')
- 다크모드 → /works/seeded-work 접속
- 배지 배경(orange)이 다크에 적절한지 확인
- 인용문 테두리 orange 확인
- prose 콘텐츠 텍스트 명도 확인

test('DM-09: Blog 목록 다크모드 렌더링')
- 다크모드 → /blog 접속
- 카드 hover 시 텍스트 색상이 brand-accent인지 확인

test('DM-10: Blog 상세 다크모드 렌더링')
- 다크모드 → /blog/seeded-blog 접속
- 배지, 태그, 인용문 테두리 색상 확인
- prose 콘텐츠 가독성 확인

test('DM-11: Contact 페이지 다크모드 렌더링')
- 다크모드 → /contact 접속
- 이메일 링크 색상이 밝은 blue (dark:text-blue-400) 인지 확인

test('DM-12: Footer 다크모드 렌더링')
- 다크모드 → / 접속 → 스크롤하여 footer 확인
- 배경이 어두운지 확인
- 링크 hover 색상이 brand-accent인지 확인
```

### 테스트 그룹 3: Admin 페이지 다크모드 (TODO 5 검증)

```
test('DM-13: Login 페이지 다크모드 렌더링')
- 다크모드 → /login 접속
- 배경이 어두운지 확인
- 로그인 카드 배경이 dark surface 색상인지 확인

test('DM-14: Admin Dashboard 다크모드 렌더링')
- 인증된 상태에서 다크모드 → /admin/dashboard 접속
- 대시보드 카드 배경/테두리가 dark variant인지 확인
- 스크린샷 촬영

test('DM-15: BlogEditor 다크모드 렌더링')
- 인증 상태 → 블로그 편집 페이지 접속
- 저장 버튼 배경이 brand-navy (밝은 블루)인지 확인
- 에디터 영역 배경이 어두운지 확인

test('DM-16: WorkEditor 다크모드 렌더링')
- 인증 상태 → 워크 편집 페이지 접속
- 저장/발행 버튼이 brand-navy인지 확인
- 업로드 존 배경이 dark variant인지 확인

test('DM-17: 삭제 버튼 hover 다크모드')
- 인증 상태 → admin 테이블 페이지
- 삭제 버튼 hover 시 어두운 red 배경 확인 (dark:hover:bg-red-950/20)
```

### 테스트 그룹 4: 코드블록 & Prose (TODO 6 검증)

```
test('DM-18: 코드블록 다크모드 배경')
- 다크모드 → prose 콘텐츠가 있는 블로그 상세 접속
- <pre> 요소의 background-color가 #0d1117 계열인지 확인
- 코드 텍스트 가시성 확인

test('DM-19: Prose 텍스트 다크모드 가독성')
- 다크모드 → 블로그 상세 접속
- p, h1, h2, h3, li 텍스트가 밝은 색인지 확인
- 링크 색상이 primary(accent red)인지 확인
```

### 테스트 그룹 5: 반응형 & 전환 (TODO 7 검증)

```
test('DM-20: 모바일 다크모드 렌더링')
- viewport 390x844 → 다크모드 → / 접속
- 모바일 메뉴에서 테마 토글 visible
- 전체 페이지 스크린샷 촬영

test('DM-21: 다크→라이트 전환 시 모든 요소 정상 복귀')
- 다크모드 전환 → /works 접속 → 스크린샷(dark)
- 라이트모드 전환 → 스크린샷(light)
- 두 스크린샷 모두 깨진 레이아웃 없음 확인

test('DM-22: Pagination 다크모드')
- 다크모드 → /blog 접속 (12+ 포스트 가정)
- active 페이지 버튼 배경색이 sky 계열 dark variant인지 확인
- 비활성 버튼이 배경과 구분되는지 확인
```

### 테스트 그룹 6: WCAG 색상 대비 검증

```
test('DM-23: 다크모드 본문 텍스트 대비 4.5:1 이상')
- 다크모드 → / 접속
- body의 background-color와 color를 JS로 추출
- 상대 휘도 계산 후 대비 비율 >= 4.5 확인

test('DM-24: 다크모드 muted 텍스트 대비 3:1 이상')
- 다크모드 → / 접속
- muted-foreground 요소의 대비 비율 >= 3.0 확인 (large text 기준)
```

---

## 테스트 실행 명령어

### 전체 다크모드 테스트 (HTTPS 스택)
```bash
PLAYWRIGHT_EXTERNAL_SERVER=1 \
PLAYWRIGHT_BASE_URL=https://localhost \
npx playwright test tests/dark-mode.spec.ts --workers=1
```

### headed 모드 (디버깅 시)
```bash
PLAYWRIGHT_EXTERNAL_SERVER=1 \
PLAYWRIGHT_BASE_URL=https://localhost \
PLAYWRIGHT_HEADED=1 \
npx playwright test tests/dark-mode.spec.ts --headed --workers=1
```

### 비디오 아티팩트 확인
```bash
# 테스트 완료 후 비디오 파일 목록
find test-results/playwright -name "*.webm" | sort

# 비디오 파일명은 테스트명 기반으로 자동 생성됨
# 예: test-results/playwright/dark-mode-DM-01--.../video.webm
```

### 기존 테스트 회귀 검증
다크모드 추가 후 기존 테스트도 모두 통과해야 한다:
```bash
# 공용 페이지 테스트
PLAYWRIGHT_EXTERNAL_SERVER=1 \
PLAYWRIGHT_BASE_URL=https://localhost \
npx playwright test tests/home.spec.ts tests/public-content.spec.ts tests/public-detail-pages.spec.ts tests/public-layout-stability.spec.ts --workers=1

# Admin 테스트 (인증 필요)
PLAYWRIGHT_EXTERNAL_SERVER=1 \
PLAYWRIGHT_BASE_URL=https://localhost \
npx playwright test tests/admin-dashboard.spec.ts tests/admin-menus.spec.ts --workers=1
```

---

## 비디오 검증 체크리스트

각 테스트 비디오를 눈으로 확인하면서 아래 항목을 체크한다:

| 비디오 | 확인 항목 | 통과 |
|--------|----------|------|
| DM-01 | 토글 버튼이 Navbar에 보이는가 | ☐ |
| DM-02 | 다크모드 전환 시 배경이 즉시 어두워지는가 | ☐ |
| DM-03 | 라이트모드 복귀 시 깜빡임(FOUC) 없는가 | ☐ |
| DM-04 | 새로고침 후에도 다크모드 유지되는가 | ☐ |
| DM-05 | 시스템 테마 따라가는가 | ☐ |
| DM-06 | 홈페이지 다크: 섹션 배경, 텍스트, 카드 정상 | ☐ |
| DM-07 | Works 목록 다크: 배지, 카드, hover 정상 | ☐ |
| DM-08 | Works 상세 다크: prose, 이미지, 배지 정상 | ☐ |
| DM-09 | Blog 목록 다크: 카드 레이아웃 깨짐 없음 | ☐ |
| DM-10 | Blog 상세 다크: 코드블록, 인용문, 링크 정상 | ☐ |
| DM-11 | Contact 다크: 이메일 링크 가시적 | ☐ |
| DM-12 | Footer 다크: 배경 어둡고 링크 hover 정상 | ☐ |
| DM-13 | Login 다크: 카드/입력필드 구분 가능 | ☐ |
| DM-14 | Admin Dashboard 다크: 카드/통계 가시적 | ☐ |
| DM-15 | BlogEditor 다크: 에디터/버튼 정상 | ☐ |
| DM-16 | WorkEditor 다크: 업로드존/버튼 정상 | ☐ |
| DM-17 | 삭제 버튼 hover 다크: 배경 변화 있음 | ☐ |
| DM-18 | 코드블록 다크: 배경 더 어둡고 텍스트 선명 | ☐ |
| DM-19 | Prose 다크: 모든 제목/본문/리스트 가독적 | ☐ |
| DM-20 | 모바일 다크: 네비 토글 있고 전체 정상 | ☐ |
| DM-21 | 다크↔라이트 전환: 레이아웃 깨짐 없음 | ☐ |
| DM-22 | Pagination 다크: active 버튼 구분 가능 | ☐ |
| DM-23 | 본문 대비 4.5:1 이상 | ☐ |
| DM-24 | muted 텍스트 대비 3:1 이상 | ☐ |

---

## 수정 대상 파일 전체 목록

| # | 파일 경로 | 작업 내용 | TODO |
|---|----------|----------|------|
| 1 | `package.json` | `next-themes` 의존성 추가 | 1 |
| 2 | `src/components/providers/ThemeProvider.tsx` | **신규 생성** | 1 |
| 3 | `src/app/layout.tsx` | ThemeProvider 래핑, suppressHydrationWarning | 1 |
| 4 | `src/components/ui/ThemeToggle.tsx` | **신규 생성** | 2 |
| 5 | `src/components/layout/Navbar.tsx` | 토글 버튼 배치 | 2 |
| 6 | `src/app/globals.css` | 브랜드 CSS 변수, 코드블록 변수, 스크롤바, selection | 3,6,7 |
| 7 | `src/app/(public)/page.tsx` | HEX → CSS 변수 | 4 |
| 8 | `src/app/(public)/works/page.tsx` | HEX → CSS 변수 | 4 |
| 9 | `src/app/(public)/works/[slug]/page.tsx` | HEX → CSS 변수 | 4 |
| 10 | `src/app/(public)/blog/[slug]/page.tsx` | HEX → CSS 변수 | 4 |
| 11 | `src/app/(public)/blog/page.tsx` | HEX → CSS 변수 | 4 |
| 12 | `src/components/layout/Footer.tsx` | HEX → CSS 변수 | 4 |
| 13 | `src/components/admin/DeleteButton.tsx` | dark hover 추가 | 5 |
| 14 | `src/components/admin/AdminBlogTableClient.tsx` | dark hover 추가 | 5 |
| 15 | `src/components/admin/AdminWorksTableClient.tsx` | dark hover 추가 | 5 |
| 16 | `src/app/login/page.tsx` | dark hover 추가 | 5 |
| 17 | `src/app/(public)/contact/page.tsx` | dark text 추가 | 5 |
| 18 | `src/components/layout/PublicPagination.tsx` | dark variant 추가 | 5 |
| 19 | `src/components/admin/AuthoringCapabilityHints.tsx` | dark bg 추가 | 5 |
| 20 | `src/components/admin/tiptap-editor/toolbar.tsx` | 플로팅 툴바 dark 수정 | 5 |
| 21 | `src/components/admin/tiptap-editor/extensions.ts` | 링크 dark 추가 | 5 |
| 22 | `src/components/admin/BlogEditor.tsx` | 버튼 HEX → 변수 | 5 |
| 23 | `src/components/admin/WorkEditor.tsx` | 버튼 HEX → 변수 | 5 |
| 24 | `tests/dark-mode.spec.ts` | **신규 생성** — Playwright E2E | 테스트 |

---

## 작업 순서 요약

```
TODO 1 → TODO 2 → TODO 3 → TODO 4 → TODO 5 → TODO 6 → TODO 7 → TODO 8
                                                                     ↓
                                                              빌드/타입 검증
                                                                     ↓
                                              docker compose HTTPS 스택 실행
                                                                     ↓
                                              tests/dark-mode.spec.ts 작성
                                                                     ↓
                                              Playwright 테스트 실행 (비디오 ON)
                                                                     ↓
                                              기존 테스트 회귀 검증
                                                                     ↓
                                              비디오 아티팩트 눈 검증
                                                                     ↓
                                              완료
```
