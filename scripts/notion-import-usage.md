# Notion Download -> PostgreSQL Import Usage

이 문서는 `downloads/` 아래에 저장된 Notion 연결(export) 결과를 PostgreSQL로 다시 적재하는 방법을 정리한다.

대상 스크립트:

- `scripts/import-notion-downloads-to-db.mjs`
- `scripts/migrate-notion-blog-downloads.mjs`
- `scripts/notion-db-import-lib.mjs`

기본 전제:

- 프로젝트 루트에서 실행한다.
- `docker compose` 기준 `db`, `backend` 컨테이너가 떠 있어야 한다.
- 다운로드 폴더 안에 `pages.json`, `manifest.json`, 각 페이지별 `blocks.json`, `assets-manifest.json` 이 있어야 한다.

예시 다운로드 폴더:

- `downloads/notion-connected-2026-03-27T10-24-20-364Z`
- `downloads/notion-connected-2026-04-13T08-03-24-517Z`

## 실운영용 기본 마이그레이션

현재 기본 러너는 아래 두 export 폴더를 순차 처리한다.

- `downloads/notion-connected-2026-03-27T10-24-20-364Z`
- `downloads/notion-connected-2026-04-13T08-03-24-517Z`

```bash
npm run migrate:blog:notion
```

직접 대상 폴더를 넘기려면:

```bash
node scripts/migrate-notion-blog-downloads.mjs \
  downloads/notion-connected-2026-03-27T10-24-20-364Z \
  downloads/notion-connected-2026-04-13T08-03-24-517Z
```

`docker-compose.prod.yml` 같은 다른 Compose 스택에 붙일 때는:

```bash
DOCKER_COMPOSE_ENV_FILE=.env.prod.local \
DOCKER_COMPOSE_FILES=docker-compose.prod.yml \
POSTGRES_DB=portfolio \
POSTGRES_USER=portfolio \
node scripts/migrate-notion-blog-downloads.mjs
```

운영 러너는 export 폴더 안의 기존 `db-import-*.json` 결과 파일을 이어받지 않고, DB 기준으로 다시 적재한다.

## 가장 기본 실행

```bash
NOTION_EXPORT_DIR=downloads/notion-connected-2026-03-27T10-24-20-364Z \
node scripts/import-notion-downloads-to-db.mjs
```

이 스크립트는 각 Notion 페이지를 읽어서:

- 블로그 HTML로 변환
- 이미지 asset을 backend media 경로로 복사
- PostgreSQL `Blogs`, `Assets` 테이블에 upsert

를 수행한다.

## 같은 제목이 있으면 skip

이미 DB에 같은 제목의 블로그가 있으면 건너뛰려면 아래 옵션을 사용한다.

```bash
NOTION_EXPORT_DIR=downloads/notion-connected-2026-03-27T10-24-20-364Z \
NOTION_IMPORT_SKIP_EXISTING_TITLES=true \
node scripts/import-notion-downloads-to-db.mjs
```

동작 기준:

- `Title`을 trim
- 연속 공백을 하나로 정규화
- 대소문자 무시
- 정확히 같은 제목이면 skip

skip된 항목은 결과 파일에 `status: "skipped_duplicate_title"` 로 기록된다.

## 병렬 수 조절

기본 병렬 수는 4다.

```bash
NOTION_EXPORT_DIR=downloads/notion-connected-2026-03-27T10-24-20-364Z \
NOTION_IMPORT_CONCURRENCY=8 \
node scripts/import-notion-downloads-to-db.mjs
```

단일 스레드 실행:

```bash
NOTION_EXPORT_DIR=downloads/notion-connected-2026-03-27T10-24-20-364Z \
NOTION_IMPORT_SINGLE_THREAD=true \
node scripts/import-notion-downloads-to-db.mjs
```

## 주요 환경변수

- `NOTION_EXPORT_DIR`
  - import 대상 다운로드 폴더
- `NOTION_EXPORT_DIRS`
  - 여러 다운로드 폴더를 `,` 또는 줄바꿈으로 전달
- `NOTION_IMPORT_SKIP_EXISTING_TITLES`
  - `true` 이면 DB에 같은 제목이 있을 때 skip
- `NOTION_IMPORT_CONCURRENCY`
  - 병렬 worker 수
- `NOTION_IMPORT_SINGLE_THREAD`
  - `true` 이면 강제로 worker 1개 사용
- `DOCKER_COMPOSE_ENV_FILE`
  - import 스크립트가 붙을 Compose env 파일
- `DOCKER_COMPOSE_FILES`
  - import 스크립트가 붙을 Compose 파일 목록

## 실행 결과 파일

실행 중/종료 후 아래 파일들이 갱신된다.

- `db_status/current.json`
  - 현재 진행 상태
- `db_status/notion-migration-01.json`
  - 첫 번째 export 폴더 상태
- `db_status/notion-migration-02.json`
  - 두 번째 export 폴더 상태
- `db_status/notion-blog-migration-summary.json`
  - 전체 합산 결과
- `<NOTION_EXPORT_DIR>/db-import-direct-results.json`
  - 성공/skip 결과
- `<NOTION_EXPORT_DIR>/db-import-direct-failures.json`
  - 실패 결과

예시 확인:

```bash
cat db_status/current.json
```

```bash
cat downloads/notion-connected-2026-03-27T10-24-20-364Z/db-import-direct-results.json
```

## 결과 요약 확인

간단 요약은 아래처럼 확인할 수 있다.

```bash
node -e "const fs=require('fs');const root='downloads/notion-connected-2026-03-27T10-24-20-364Z';const results=JSON.parse(fs.readFileSync(root+'/db-import-direct-results.json','utf8'));const failures=JSON.parse(fs.readFileSync(root+'/db-import-direct-failures.json','utf8'));const imported=results.filter(r=>r.status!=='skipped_duplicate_title').length;const skipped=results.filter(r=>r.status==='skipped_duplicate_title').length;console.log(JSON.stringify({results:results.length, imported, skippedDuplicateTitles:skipped, failures:failures.length},null,2))"
```

## 주의사항

- 제목 중복 skip은 "유사 제목"이 아니라 "정규화 후 동일 제목" 기준이다.
- 같은 제목이지만 실제로는 다른 글이어도 skip될 수 있다.
- asset 복사는 `backend` 컨테이너 내부 `/app/media/...` 로 수행된다.
- DB upsert는 기존 marker/pageId/slug 기반 로직도 유지한다.
- `Untitled` 문서가 많으면 제목 기준 skip이 과하게 작동할 수 있다.
- WSL에서 저장소가 `/mnt/*` 아래면 PostgreSQL bind mount가 권한 오류를 낼 수 있으므로 `POSTGRES_DATA_DIR` 를 Linux 홈 경로로 override 하는 편이 안전하다.

## 이번 실제 실행 결과 예시

`downloads/notion-connected-2026-03-27T10-24-20-364Z` 기준:

- 총 처리: `1350`
- import: `505`
- 제목 중복 skip: `845`
- failures: `0`
