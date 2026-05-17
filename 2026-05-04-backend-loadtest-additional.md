# 지시서 - 2026-05-04 Backend Loadtest 추가 작업

## 목적

- `2026-05-04-backend-loadtest.md` 기준의 잔여 이슈를 코드스캔 증거 기준으로 재정렬한다.
- Playwright full core 기준 실패 19건 가정이 아니라, 최신 실행 결과를 기준으로 미해결 항목을 확정한다.
- 실패 군을 재현성/비재현성으로 분류하고 다음 실행 우선순위를 고정한다.

## 목표

- 최신 Playwright full core 실행(434 tests) 결과를 기준으로 실패 목록을 한 번 더 정합성 검증한다.
- 재현 루프 실행으로 stable 실패를 도출해 추적 우선순위를 확정한다.
- CI 체인 검증 상태(CI Dev → Promote Main Runtime → release/main-promote → CI Main Runtime)를 최신 기준으로 갱신한다.
- `backend-loadtest-additional-2026-05-04` 감사 산출물 업데이트 근거를 정리한다.

## 범위

- Playwright full core 실행 결과(최근 `full-core-latest.log`) 수치/실패 목록 점검.
- 선택 재실행(Spec subset, focused loop) 결과와 full run 비교 분류.
- 코드스캔 방식 실패 집계:
  - 누락/중복 라인 제거
  - 재현성 기준으로 안정 실패 집합 산출
- CI 체인 로그/URL 기재.

## 비범위

- UI 기능 변경 또는 새 테스트 추가 구현.
- backend 구조 변경(시스템 아키텍처, 큐/Worker/monitoring 스택 추가).
- full e2e 범위 자체 확장(현재 full core 밖의 신규 스위트 추가).

## 사용자 지시 반영

- 목표/범위/TODO/완료기준 형식을 유지한다.
- 코드스캔 기반 근거로만 실행 항목을 정한다.
- 검증 로그는 파일 경로 + 실행 수치로 남긴다.

## Plan Alignment Check - Before Execution

- 기준 문서 원문(`2026-05-04-backend-loadtest.md`)이 워크트리에 없어 현재는 `backend-loadtest-additional-2026-05-04` 보고서와 실행 로그를 정합성 기준으로 사용한다.
- 실행 증빙은 다음 파일을 우선 사용한다.
  - `backend/reports/backend-loadtest-additional-2026-05-04/reruns/full-core-latest.log`
  - `backend/reports/backend-loadtest-additional-2026-05-04/reruns/repro-latest.log`
  - `backend/reports/backend-loadtest-additional-2026-05-04/backend-loadtest-additional-2026-05-04.md/.json/.html`

## 현재 상태 스냅샷(요약)

- Playwright full core run (latest): `Total 434 / Passed 416 / Failed 14 / Skipped 4`
- Focused repro loop: `Total 37 / Passed 30 / Failed 7 / Skipped 0`
- Budget failure(최신): `1`
- Warning(최신): `39`
- CI chain status: `CI Dev` → `Promote Main Runtime` → `release/main-promote -> main` → `CI Main Runtime` 확인 완료

## TODOs

- [x] 1) 최신 full run 실패군 정합성 확인
  - 실행 로그: `backend/reports/backend-loadtest-additional-2026-05-04/reruns/full-core-latest.log`
  - 재확인 항목: 실패 14건 목록, 라인 기준 키워드
  - 확인 실패 시 `backend-loadtest-additional-2026-05-04/backend-loadtest-additional-2026-05-04.md`에 반영

- [x] 2) 재현 루프 정합화
  - 명령: `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 ENABLE_LOCAL_ADMIN_SHORTCUT=true PLAYWRIGHT_EXPECT_LOCAL_ADMIN_SHORTCUT=visible PLAYWRIGHT_E2E_PROFILE=core node scripts/run-e2e-latency.mjs -- --workers=1 tests/public-blog-inline-redirects.spec.ts tests/ui-improvement-featured-works-grid.spec.ts tests/admin-blog-ai-dialog.spec.ts tests/admin-blog-edit.spec.ts tests/ui-admin-keyboard-accessibility.spec.ts tests/ui-admin-tiptap-link-popover.spec.ts tests/ui-quality-visual-metrics.spec.ts tests/work-inline-create-flow.spec.ts`
  - 산출:
    - `backend/reports/backend-loadtest-additional-2026-05-04/reruns/repro-latest.log`
    - `30 / 7 / 0`
  - 실패 7건을 stable candidate로 분류

- [x] 3) 실패군 분류 갱신(재현/비재현)
  - Full run 안정 실패 14건 기준으로 분리
  - 재현 실패 7건
    - `tests/ui-improvement-featured-works-grid.spec.ts:141`
    - `tests/ui-improvement-featured-works-grid.spec.ts:200`
    - `tests/admin-blog-ai-dialog.spec.ts:29`
    - `tests/admin-blog-ai-dialog.spec.ts:90`
    - `tests/admin-blog-ai-dialog.spec.ts:156`
    - `tests/ui-admin-keyboard-accessibility.spec.ts:45`
    - `tests/ui-admin-keyboard-accessibility.spec.ts:66`
  - 비재현 후보 7건
    - `tests/public-detail-toc-fallback.spec.ts:6`
    - `tests/admin-search-pagination.spec.ts:344`
    - `tests/admin-work-special-input.spec.ts:6`
    - `tests/dark-mode.spec.ts:446`
    - `tests/ui-quality-layout-rhythm.spec.ts:7`
    - `tests/ui-quality-visual-metrics.spec.ts:61`
    - `tests/public-admin-affordances.spec.ts:64`

- [x] 4) 추가 감사 산출물 JSON 정합성 점검/갱신
  - 파일:
    - `backend/reports/backend-loadtest-additional-2026-05-04/backend-loadtest-additional-2026-05-04.md`
    - `backend/reports/backend-loadtest-additional-2026-05-04/backend-loadtest-additional-2026-05-04.html`
    - `backend/reports/backend-loadtest-additional-2026-05-04/backend-loadtest-additional-2026-05-04.json`
  - 점검 항목:
    - `failureTriage.fullRunFailureCount === 14`
    - `failureTriage.nonReproducibleFromFullRun === 7`
    - 증빙 파일 경로의 존재성

- [x] 5) CI 체인 근거 갱신
  - `CI Dev run`, `Promote Main Runtime run`, `release/main-promote PR`, `CI Main Runtime run`을 최신 상태로 교차 점검
  - 변경 이력(재실행 시점/재시도 run id 포함) 저장

- [x] 6) 다음 액션 우선순위 고정
  - 우선순위 높음: 재현 실패 7건 중 selector/포커스 계열
  - 우선순위 중간: 비재현 7건(환경/타이밍/노이즈 의존 가설 기반)
  - 우선순위 낮음: 반복 재현에서 소거된 변동성 항목

## Verification Log Template

- `PLAYWRIGHT_FULL`: `2026-05-04T16:15:13Z` 기준 434 / 416 / 14 / 4
- `PLAYWRIGHT_REPRO`: `2026-05-04T16:15:13Z` 기준 37 / 30 / 7 / 0
- `CI Dev`: run id/url/status
  - `25322888983` / `https://github.com/kimwoonggon/woong-blog-aspcore-nextjs/actions/runs/25322888983` / `success`
- `Promote Main Runtime`: run id/url/status
  - `25323185860` / `https://github.com/kimwoonggon/woong-blog-aspcore-nextjs/actions/runs/25323185860` / `success`
- `release/main-promote -> main`: PR 번호/상태/머지 커밋/타임스탬프
  - `35` / `MERGED` / `c797ef393d659dd5e64fdb8ffa337d5e73974dc0` / `2026-05-04T14:03:11Z`
- `CI Main Runtime`: run id/url/status
  - `25323196924` / `https://github.com/kimwoonggon/woong-blog-aspcore-nextjs/actions/runs/25323196924` / `success`
  - `25323508573` / `https://github.com/kimwoonggon/woong-blog-aspcore-nextjs/actions/runs/25323508573` / `success`
- `Artifacts`: 위 로그/요약 파일 경로

## 완료 기준

- TODO 항목이 실행 로그 및 증빙 경로로 종결되어야 한다.
- full run과 repro의 실패 분류가 일치해야 한다.
- `backend-loadtest-additional-2026-05-04` 보고서가 최신 통계(14개 full 실패, 7개 재현 실패)로 갱신돼야 한다.
- 재현 실패 7건은 다음 수정 액션으로 바로 연결되어야 하며, 비재현 7건은 조건부 재검증 사유가 명시돼야 한다.
