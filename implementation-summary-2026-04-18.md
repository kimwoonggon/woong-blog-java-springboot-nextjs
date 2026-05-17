# Implementation Summary - 2026-04-18

이 문서는 2026-04-18 작업에서 수행한 변경을 빠짐없이 파일별, 위치별, 명세별로 정리한 기록이다.

## 요청 범위

- admin page, work, blog 검색 개선
- 검색/페이지 변경 시 URL과 검색 input이 계속 되돌아가는 문제 확인 및 수정
- blog/work editor 및 public render에서 Mermaid 렌더링 지원
- blog/work editor 이미지 클릭, 선택 표시, resize, drag/move 지원
- 운영 서버에서 `/media` tar dump와 PostgreSQL dump를 매일 오전 7시 Azure Blob Storage로 전송
- 백업 restore 코드 작성
- `.env.prod.example`에 Azure 접근 입력값 추가
- Azure skill 참고
- panic 발생 원인과 회피 방법을 `AGENTS.md` 규칙으로 추가

## Panic 및 개발 환경 조사

### 원인

- Codex panic은 application code 문제가 아니라 Codex TUI plugin store 문제로 판단했다.
- 로그 위치: `~/.codex/log/codex-tui.log`
- panic 문구: `core/src/plugins/store.rs:33:39: plugin cache root should be absolute: No such file or directory`
- 의미: Codex가 plugin cache root를 canonicalize하는 시점에 경로가 없거나 절대경로로 해석되지 않아 TUI가 panic 처리됨.
- 발생 가능 시점:
  - skill/plugin 설치 직후
  - subagent/plugin warm-up 직후
  - 긴 Docker/build/test command가 끝난 뒤 plugin manager refresh가 발생할 때

### 적용한 재발 방지책

- cache root 절대경로 생성 및 검증:

```bash
mkdir -p /home/kimwoonggon/.codex/plugins/cache /home/kimwoonggon/.codex/.tmp/plugins
readlink -f /home/kimwoonggon/.codex/plugins/cache
readlink -f /home/kimwoonggon/.codex/.tmp/plugins
```

- 확인된 절대경로:
  - `/home/kimwoonggon/.codex/plugins/cache`
  - `/home/kimwoonggon/.codex/.tmp/plugins`
- 이후 추가 skill/plugin 설치 및 subagent 생성은 중단했다.
- panic 이후에는 이전 background session을 신뢰하지 않고 Docker 상태, logs, health probe를 다시 확인했다.

### Docker dev stack 별도 원인

- 첫 Docker 실패:
  - `127.0.0.1:8080` port forward에서 Docker Desktop이 500 반환
  - 해결: `BACKEND_PUBLISH_PORT=18080`으로 우회
- 두 번째 Docker 실패:
  - 수동 compose 재시도 시 `POSTGRES_DATA_DIR`가 빠져 `/mnt/d/.../.docker-data/dev/postgres`로 fallback
  - postgres가 WSL `/mnt/d` bind mount에서 `chmod` 실패
  - 해결: `POSTGRES_DATA_DIR=$HOME/.woong-blog-docker/dev/postgres` 사용
- HTTPS cert 부재:
  - `nginx/local-https.conf`가 `.local-certs/localhost.pem`을 요구
  - 해결: HTTP 검증용 `NGINX_DEFAULT_CONF=./nginx/default.conf` 사용

### 안정적인 dev 검증 명령

```bash
POSTGRES_DATA_DIR=${HOME}/.woong-blog-docker/dev/postgres \
BACKEND_PUBLISH_PORT=18080 \
NGINX_BIND_HOST=127.0.0.1 \
NGINX_HTTP_PORT=13000 \
NGINX_HTTPS_PORT=13001 \
NGINX_DEFAULT_CONF=./nginx/default.conf \
./scripts/dev-up.sh
```

검증 URL:

```text
http://127.0.0.1:13000
```

## 백업 위치

코드/설정 수정 전 백업을 만들었고, lint가 repo 내부 backup을 스캔하지 않도록 repo 밖으로 이동했다.

- `../woong-blog-codex-backups-2026-04-18/2026-04-18-frontend-backup`
- `../woong-blog-codex-backups-2026-04-18/2026-04-18-azure-backup`
- `../woong-blog-codex-backups-2026-04-18/mermaid-2026-04-18`
- `../woong-blog-codex-backups-2026-04-18/AGENTS.md.bak-panic-rule-2026-04-18`

## 파일별 변경 내역

### Agent 운영 규칙

#### `AGENTS.md`

- 위치: `AGENTS.md:51-67`
- 추가 섹션: `## Codex Panic Prevention`
- 명세:
  - Codex/plugin panic을 serious blocker로 규정
  - 알려진 panic 문구와 원인 기록
  - skill/plugin 설치, subagent 생성, 긴 Docker/build/test 전 cache path preflight 필수화
  - `CODEX_HOME`, `CODEX_HOME_DIR`, plugin cache path는 절대경로만 허용
  - panic 후에는 `~/.codex/log/codex-tui.log`, cache path, Docker/process 상태를 다시 확인하도록 명시

#### `todolist-2026-04-18.md`

- 위치: `todolist-2026-04-18.md:69-223`
- 명세:
  - 프론트엔드 검색/editor/Azure backup 작업 계획 및 완료 상태 기록
  - Mermaid subagent 작업 기록 병합
  - Azure backup subagent 작업 기록 병합
  - panic/dev stack 원인 조사 및 재발 방지 기록 추가
  - AGENTS panic rule update 기록 추가

### 검색 정규화 - Frontend

#### `src/lib/search/normalized-search.ts`

- 위치: `src/lib/search/normalized-search.ts:1-26`
- 새 파일
- 명세:
  - `normalizeSearchText` 추가
    - `NFKC` normalize
    - lowercase
    - 문자/숫자 외 제거
  - `containsNormalizedSearch` 추가
  - `anyContainsNormalizedSearch` 추가
- 효과:
  - `T,B,N 안녕하세요`가 `TB`, `TBN`, `tbn`으로 검색 가능
  - 공백, 쉼표, punctuation, case 차이를 무시

#### `src/components/admin/AdminBlogTableClient.tsx`

- 위치:
  - import: `src/components/admin/AdminBlogTableClient.tsx:24`
  - blog matcher: `src/components/admin/AdminBlogTableClient.tsx:36-37`
  - URL helper: `src/components/admin/AdminBlogTableClient.tsx:45-55`
  - mount/url sync refs: `src/components/admin/AdminBlogTableClient.tsx:64-67`
  - search filtering: `src/components/admin/AdminBlogTableClient.tsx:75-82`
  - searchParams -> state sync: `src/components/admin/AdminBlogTableClient.tsx:117-138`
  - page sync: `src/components/admin/AdminBlogTableClient.tsx:140-172`
  - URL write skip on first mount and `replaceState`: `src/components/admin/AdminBlogTableClient.tsx:174-204`
- 명세:
  - title/tags 검색을 `anyContainsNormalizedSearch`로 변경
  - `router.replace` 기반 URL 동기화를 `window.history.replaceState`로 변경
  - 검색 input 변경 중 Next navigation/remount가 발생하지 않게 함
  - 첫 mount 시 URL write effect를 건너뜀
  - URL에서 들어온 external navigation만 state로 반영
  - page clamp는 microtask로 defer하여 React lint의 set-state-in-effect 오류 회피

#### `src/components/admin/AdminWorksTableClient.tsx`

- 위치:
  - import: `src/components/admin/AdminWorksTableClient.tsx:24`
  - work matcher: `src/components/admin/AdminWorksTableClient.tsx:36-37`
  - URL helper: `src/components/admin/AdminWorksTableClient.tsx:45-55`
  - mount/url refs: `src/components/admin/AdminWorksTableClient.tsx:64-66`
  - search filtering: `src/components/admin/AdminWorksTableClient.tsx:73-80`
  - searchParams -> state sync: `src/components/admin/AdminWorksTableClient.tsx:111-133`
  - page sync: `src/components/admin/AdminWorksTableClient.tsx:135-148`
  - URL write skip on first mount and `replaceState`: `src/components/admin/AdminWorksTableClient.tsx:150-180`
- 명세:
  - title/category/tags 검색을 정규화 검색으로 변경
  - admin blog와 동일한 URL 안정화 적용
  - 검색 중 input value가 빈 문자열로 되돌아가는 race를 수정

#### `src/components/admin/AdminDashboardCollections.tsx`

- 위치:
  - import: `src/components/admin/AdminDashboardCollections.tsx:11`
  - dashboard filter: `src/components/admin/AdminDashboardCollections.tsx:61-71`
- 명세:
  - dashboard works/blog cards 검색을 title-only 단순 includes에서 정규화 검색으로 변경
  - 검색 대상: title, category, excerpt, tags

### 검색 정규화 - Backend

#### `backend/src/WoongBlog.Api/Modules/Content/Common/Application/Support/ContentSearchText.cs`

- 위치: `backend/src/WoongBlog.Api/Modules/Content/Common/Application/Support/ContentSearchText.cs:1-49`
- 새 파일
- 명세:
  - `ContainsNormalized`
  - `AnyContainsNormalized`
  - private `Normalize`
- 동작:
  - `NormalizationForm.FormKC`
  - `ToLower(CultureInfo.InvariantCulture)`
  - `char.IsLetterOrDigit`만 유지
- 목적:
  - public blog/work 검색에서도 punctuation/case/spacing을 무시

#### `backend/src/WoongBlog.Api/Modules/Content/Blogs/Persistence/PublicBlogService.cs`

- 위치:
  - helper import: `PublicBlogService.cs:8`
  - base query/order: `PublicBlogService.cs:27-31`
  - unfiltered pagination path: `PublicBlogService.cs:34-45`
  - normalized search path: `PublicBlogService.cs:48-64`
  - `BuildPagedBlogs` extraction: `PublicBlogService.cs:67-86`
- 명세:
  - published blog query는 기존처럼 최신순 유지
  - query가 없으면 DB에서 기존 pagination 수행
  - query가 있으면 published list를 materialize 후 `ContentSearchText`로 filtering
  - title mode: title 검색
  - content mode: excerpt + contentJson 검색
  - pagination total/count는 filtered list 기준으로 계산

#### `backend/src/WoongBlog.Api/Modules/Content/Works/Persistence/PublicWorkService.cs`

- 위치:
  - helper import: `PublicWorkService.cs:5`
  - base query/order: `PublicWorkService.cs:30-34`
  - unfiltered pagination path: `PublicWorkService.cs:39-49`
  - normalized search path: `PublicWorkService.cs:50-67`
  - existing video/thumbnail mapping 유지: `PublicWorkService.cs:69-97`
- 명세:
  - public works title/content 검색도 punctuation/case/spacing 무시
  - title mode: title 검색
  - content mode: excerpt + contentJson 검색
  - existing thumbnail/video resolution은 그대로 유지

### Mermaid 렌더링

#### `src/lib/content/blog-content.ts`

- 위치:
  - HTML detection에 `mermaid-block` 추가: `blog-content.ts:10`
  - HTML attribute escape helper: `blog-content.ts:23-25`
  - code block flush 변경: `blog-content.ts:82-96`
  - HTML entity decode에 newline numeric entity 추가: `blog-content.ts:126-136`
  - fenced code language parse: `blog-content.ts:200-235`
  - unclosed code block flush: `blog-content.ts:296-298`
- 명세:
  - ```` ```mermaid ```` fence를 `<mermaid-block data-code="..."></mermaid-block>`로 변환
  - 일반 code fence는 `language-*` class 보존
  - 기존 markdown/html fallback logic은 유지

#### `src/lib/content/html-sanitizer.ts`

- 위치:
  - allowed tag: `html-sanitizer.ts:25`
  - allowed attribute: `html-sanitizer.ts:54`
- 명세:
  - `mermaid-block` tag 허용
  - `data-code` attribute 허용
  - 기존 script/event/javascript URL 제거 정책 유지

#### `src/components/content/MermaidRenderer.tsx`

- 위치: `src/components/content/MermaidRenderer.tsx:1-101`
- 새 파일
- 명세:
  - client component
  - `import('mermaid')` dynamic import
  - `startOnLoad: false`
  - `securityLevel: 'strict'`
  - dark mode면 Mermaid theme `dark`, 아니면 `default`
  - render 성공 시 SVG를 출력
  - render 실패 시 원본 code block fallback
  - empty/rendering state 표시

#### `src/components/content/InteractiveRenderer.tsx`

- 위치:
  - import: `InteractiveRenderer.tsx:6`
  - mermaid segment type: `InteractiveRenderer.tsx:16-20`
  - entity decode newline support: `InteractiveRenderer.tsx:23-33`
  - attribute extraction and regex: `InteractiveRenderer.tsx:76-83`
  - Mermaid split function: `InteractiveRenderer.tsx:83-110`
  - custom block detection: `InteractiveRenderer.tsx:147-151`
  - Mermaid render branch: `InteractiveRenderer.tsx:157-179`
- 명세:
  - public blog/work renderer에서 Mermaid block을 HTML segment와 분리
  - 주변 prose는 유지
  - Mermaid segment는 `MermaidRenderer`에 전달
  - 기존 work video, html-snippet, three-js-block 처리 유지

#### `src/components/admin/tiptap/MermaidBlock.ts`

- 위치: `src/components/admin/tiptap/MermaidBlock.ts:1-41`
- 새 파일
- 명세:
  - Tiptap custom node `mermaidBlock`
  - block/atom/draggable
  - `code` attribute를 `data-code`로 parse/render
  - React node view로 `MermaidComponent` 연결

#### `src/components/admin/tiptap/MermaidComponent.tsx`

- 위치: `src/components/admin/tiptap/MermaidComponent.tsx:1-61`
- 새 파일
- 명세:
  - editor 안에서 Mermaid code textarea 제공
  - 입력 변경 시 `props.updateAttributes({ code })`
  - 하단 preview에서 `MermaidRenderer` 사용
  - selected 상태면 ring 표시
  - state sync는 microtask로 defer

#### `src/components/admin/tiptap-editor/extensions.ts`

- 위치:
  - Mermaid import: `extensions.ts:14`
  - ResizableImage import: `extensions.ts:15`
  - ResizableImage extension 등록: `extensions.ts:40-46`
  - MermaidBlock 등록: `extensions.ts:66`
- 명세:
  - 기존 기본 image extension을 `ResizableImage`로 교체
  - MermaidBlock을 editor extension 목록에 추가
  - 기존 heading/code/link/html/3D/video 기능 유지

#### `src/components/admin/tiptap-editor/toolbar.tsx`

- 위치:
  - Workflow icon import: `toolbar.tsx:22`
  - Mermaid toolbar button: `toolbar.tsx:181-186`
  - hint text 갱신: `toolbar.tsx:188-193`
- 명세:
  - toolbar에서 Mermaid diagram 삽입 버튼 추가
  - 안내 문구에 Mermaid diagrams 포함

#### `src/components/admin/tiptap/Commands.ts`

- 위치: `src/components/admin/tiptap/Commands.ts:101-109`
- 명세:
  - slash command에 `Mermaid Diagram` 추가
  - shortcut: `m`, `d`
  - command: `insertContent({ type: 'mermaidBlock' })`

#### `src/components/admin/tiptap/CommandList.tsx`

- 위치:
  - Workflow icon import: `CommandList.tsx:20`
  - icon type에 `mermaid` 추가: `CommandList.tsx:23`
  - icon render: `CommandList.tsx:164`
- 명세:
  - slash command list에서 Mermaid icon 표시

#### `src/types/mermaid.d.ts`

- 위치: `src/types/mermaid.d.ts:1-16`
- 새 파일
- 명세:
  - `mermaid` module 타입 선언
  - `initialize`, `render` 타입 제공

### 이미지 resize / drag / move

#### `src/components/admin/tiptap/ResizableImageBlock.ts`

- 위치: `src/components/admin/tiptap/ResizableImageBlock.ts:1-42`
- 새 파일
- 명세:
  - Tiptap image extension 확장
  - block image로 동작
  - draggable true
  - `width`, `height` attribute parse/render
  - React node view로 `ResizableImageComponent` 연결

#### `src/components/admin/tiptap/ResizableImageComponent.tsx`

- 위치:
  - dimension parse/clamp: `ResizableImageComponent.tsx:6-20`
  - node component: `ResizableImageComponent.tsx:23-102`
  - node selection: `ResizableImageComponent.tsx:28-33`
  - resize pointer handling: `ResizableImageComponent.tsx:35-69`
  - selected outline + handle UI: `ResizableImageComponent.tsx:71-100`
- 명세:
  - 이미지 클릭 시 editor node selection 설정
  - selected 상태에서 ring 표시
  - resize handle 표시
  - pointer drag로 width/height update
  - aspect ratio 유지
  - persisted output은 표준 `<img width height>` 중심
  - draggable wrapper 사용으로 ProseMirror drag/move 흐름 유지

### Azure backup / restore

#### `scripts/azure-backup-lib.mjs`

- 위치: `scripts/azure-backup-lib.mjs:1-221`
- 새 파일
- 명세:
  - cron 상수: `Asia/Seoul`, `0 7 * * *`
  - blob prefix normalize: `azure-backup-lib.mjs:8-14`
  - backup id: `azure-backup-lib.mjs:16-18`
  - blob name: `azure-backup-lib.mjs:20-33`
  - shell quote: `azure-backup-lib.mjs:35-38`
  - cron entry build: `azure-backup-lib.mjs:40-53`
  - env file parsing: `azure-backup-lib.mjs:55-88`
  - CLI flag parsing: `azure-backup-lib.mjs:90-163`
  - backup config resolution: `azure-backup-lib.mjs:165-221`
  - `AZURE_BACKUP_CONTAINER`/`AZURE_BACKUP_PREFIX` 우선, 기존 `AZURE_STORAGE_CONTAINER`/`AZURE_STORAGE_PREFIX` fallback

#### `scripts/azure-backup.mjs`

- 위치: `scripts/azure-backup.mjs:1-221`
- 새 파일
- 명세:
  - `.env.prod` 또는 `APP_ENV_FILE` read
  - media archive: `tar -czf <temp>/media.tar.gz -C MEDIA_DATA_DIR .`
  - PostgreSQL dump: `docker compose exec -T db pg_dump -Fc`
  - Azure upload: `@azure/storage-blob` `BlobServiceClient.fromConnectionString`
  - container `createIfNotExists`
  - upload blob names:
    - `<prefix>/<backupId>/media.tar.gz`
    - `<prefix>/<backupId>/postgres.dump`
  - `--dry-run` 지원
  - temp dir cleanup

#### `scripts/azure-restore.mjs`

- 위치: `scripts/azure-restore.mjs:1-214`
- 새 파일
- 명세:
  - `--backup-id` 필수
  - 실제 restore는 `--confirm` 필수
  - Azure Blob download to temp files
  - media restore:
    - unsafe restore target `/` 또는 repo root 거부
    - media dir 삭제 후 tar extract
  - DB restore:
    - `docker compose exec -T db pg_restore --clean --if-exists --no-owner --no-privileges`
  - `--dry-run` 지원
  - temp dir cleanup

#### `scripts/install-azure-backup-cron.mjs`

- 위치: `scripts/install-azure-backup-cron.mjs:1-148`
- 새 파일
- 명세:
  - repo root 자동 확인
  - 기존 crontab read
  - marker block 기반으로 기존 backup block 교체
  - cron entry:
    - `CRON_TZ=Asia/Seoul`
    - `0 7 * * *`
    - `APP_ENV_FILE=.env.prod node scripts/azure-backup.mjs >> log 2>&1`
  - `--dry-run` 지원

#### `.env.prod.example`

- 위치: `.env.prod.example:30-36`
- 명세:
  - Azure backup 설정 추가
  - `AZURE_STORAGE_CONNECTION_STRING`
  - `AZURE_BACKUP_CONTAINER`
  - `AZURE_BACKUP_PREFIX`
  - `AZURE_BACKUP_LOG_FILE`
  - `AZURE_BACKUP_COMPOSE_FILE`
  - `AZURE_BACKUP_DB_SERVICE`

#### `package.json`

- 위치:
  - scripts: `package.json:12-14`
  - dependencies: `package.json:37`, `package.json:65`
- 명세:
  - `backup:azure`
  - `restore:azure`
  - `backup:azure:cron`
  - `@azure/storage-blob`
  - `mermaid`

#### `package-lock.json`

- 명세:
  - `npm install mermaid @azure/storage-blob` 결과
  - Azure Blob SDK와 Mermaid dependency tree 추가

#### `scripts/main-runtime-allowlist.txt`

- 위치: `scripts/main-runtime-allowlist.txt:23-26`
- 명세:
  - main runtime promotion 대상에 Azure backup/restore/cron scripts 포함

#### `README.md`

- 위치: `README.md:729-755`
- 명세:
  - Azure backup workflow 문서 추가
  - backup blob 구성 설명
  - backup 실행 명령
  - restore 실행 명령
  - cron 설치 명령
  - cron이 `07:00 Asia/Seoul` 사용함을 기록

#### `DEPLOYMENT.md`

- 위치: `DEPLOYMENT.md:160-190`
- 명세:
  - 운영 backup/restore 절차 추가
  - dry-run 안내
  - restore 시 `--confirm` 요구
  - 유지보수 창에서 restore 권장
  - cron 설치 안내

### 테스트 추가 및 수정

#### `src/test/normalized-search.test.ts`

- 위치: `src/test/normalized-search.test.ts:1-17`
- 새 파일
- 검증:
  - `T,B,N 안녕하세요`가 `TB`, `TBN`, `tbn`에 match
  - Korean/English text가 normalize 이후 검색 가능

#### `backend/tests/WoongBlog.Api.Tests/PublicQueryHandlerTests.cs`

- 위치:
  - work normalized title test: `PublicQueryHandlerTests.cs:189-205`
  - blog normalized title test: `PublicQueryHandlerTests.cs:245-261`
- 검증:
  - public works title search가 `T,B,N 안녕하세요`를 `tbn`으로 찾음
  - public blogs title search가 `T,B,N 안녕하세요`를 `TBN`으로 찾음

#### `tests/admin-search-pagination.spec.ts`

- 위치:
  - normalized helper: `admin-search-pagination.spec.ts:143-146`
  - fixture seed helper: `admin-search-pagination.spec.ts:148-188`
  - 기존 blog negative assertion 보정: `admin-search-pagination.spec.ts:201-205`
  - 기존 works negative assertion 보정: `admin-search-pagination.spec.ts:331-335`
  - new normalized/input stability test: `admin-search-pagination.spec.ts:357-388`
- 검증:
  - admin blog search input이 fast typing 중 reset되지 않음
  - admin works search input이 fast typing 중 reset되지 않음
  - `tbn`/`TBN`으로 punctuation 포함 제목 검색
  - dashboard works/blog collection 검색도 정규화 동작

#### `src/test/blog-content.test.ts`

- 위치: `src/test/blog-content.test.ts:26-34`
- 검증:
  - markdown Mermaid fence가 `<mermaid-block data-code="...">`로 변환됨

#### `src/test/interactive-renderer.test.tsx`

- 위치:
  - heavy renderer dependency mocks: `interactive-renderer.test.tsx:5-24`
  - dynamic import setup: `interactive-renderer.test.tsx:28-31`
  - Mermaid render test: `interactive-renderer.test.tsx:65-76`
- 검증:
  - Mermaid block이 public renderer에서 주변 prose를 유지하며 renderer로 전달됨

#### `src/test/tiptap-editor.test.tsx`

- 위치:
  - MermaidBlock mock: `tiptap-editor.test.tsx:156-158`
  - ResizableImage mock: `tiptap-editor.test.tsx:159-161`
- 검증:
  - Tiptap editor test environment가 새 extensions와 호환됨

#### `src/test/tiptap-resizable-image.test.tsx`

- 위치: `src/test/tiptap-resizable-image.test.tsx:1-61`
- 새 파일
- 검증:
  - image node selection 호출
  - resize handle pointer drag가 width/height update

#### `src/test/azure-backup-lib.test.ts`

- 위치: `src/test/azure-backup-lib.test.ts:1-83`
- 새 파일
- 검증:
  - env parser
  - CLI parser
  - blob name builder
  - backup id builder
  - cron entry formatting
  - shell quote
  - `AZURE_BACKUP_CONTAINER/PREFIX` 우선순위

### 기타 변경/주의 항목

#### `skills-lock.json`

- 위치: root `skills-lock.json`
- 명세:
  - `find-skills` lock entry 추가
  - 이 변경은 specialist skill 사용 요구사항 처리 중 생성된 skill metadata 변경이다.

#### `.agents/skills/find-skills/`

- 위치: `.agents/skills/find-skills/`
- 상태: untracked
- 명세:
  - 작업 시작 시 이미 worktree에 untracked로 존재하던 local skill copy로 확인됨
  - feature code 변경의 핵심 구현 파일은 아님

#### `implementation-summary-2026-04-18.md`

- 위치: repo root
- 명세:
  - 이 파일
  - 수행 작업 전체, 코드 위치, 명세, 검증 결과를 정리하기 위해 생성

## 검증 결과

### 통과한 검증

```bash
npm run typecheck
```

- 결과: 통과

```bash
npm run lint
```

- 결과: 0 errors
- 기존 warnings 5개는 남아 있음
  - `src/components/admin/WorkEditor.tsx`
  - `src/test/work-editor.test.tsx`
  - `tests/admin-search-pagination.spec.ts`
  - `tests/responsive-width-sweep.spec.ts`
  - `tests/ui-quality-a11y-advanced.spec.ts`

```bash
npm run build
```

- 결과: 통과

```bash
npx vitest run --no-file-parallelism --maxWorkers=1 \
  src/test/normalized-search.test.ts \
  src/test/blog-content.test.ts \
  src/test/interactive-renderer.test.tsx \
  src/test/tiptap-resizable-image.test.tsx \
  src/test/tiptap-editor.test.tsx \
  src/test/azure-backup-lib.test.ts
```

- 결과: 6 files / 30 tests 통과
- 병렬 thread pool에서는 jsdom/renderer 조합이 heap pressure를 만들 수 있어 single-worker로 검증

```bash
dotnet test backend/WoongBlog.sln
```

- 결과: 133 tests 통과
- restore 단계에서 기존 package vulnerability warning 출력됨

```bash
node --check scripts/azure-backup-lib.mjs
node --check scripts/azure-backup.mjs
node --check scripts/azure-restore.mjs
node --check scripts/install-azure-backup-cron.mjs
```

- 결과: 통과

```bash
node scripts/azure-backup.mjs --dry-run
node scripts/azure-restore.mjs --backup-id 20260418T000000Z --dry-run
node scripts/install-azure-backup-cron.mjs --dry-run
node scripts/azure-restore.mjs --backup-id 20260418T000000Z
```

- 결과:
  - dry-runs 통과
  - restore without `--confirm`은 의도대로 실패: `Refusing to restore without --confirm`

```bash
POSTGRES_DATA_DIR=${HOME}/.woong-blog-docker/dev/postgres \
BACKEND_PUBLISH_PORT=18080 \
NGINX_BIND_HOST=127.0.0.1 \
NGINX_HTTP_PORT=13000 \
NGINX_HTTPS_PORT=13001 \
NGINX_DEFAULT_CONF=./nginx/default.conf \
./scripts/dev-up.sh
```

- 결과: Docker dev stack 기동 성공

```bash
curl -fsS http://127.0.0.1:13000/api/health
```

- 결과: `{"status":"ok", ...}`

```bash
PLAYWRIGHT_EXTERNAL_SERVER=1 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:13000 \
npx playwright test tests/admin-search-pagination.spec.ts --project=chromium-authenticated --workers=1
```

- 결과: 8 tests 통과

### 현재 dev stack 상태

마지막 확인 기준 dev stack은 실행 중이었다.

- backend: `127.0.0.1:18080->8080`
- nginx: `127.0.0.1:13000->80`, `127.0.0.1:13001->443`
- frontend: internal `3000`
- db: internal `5432`

정리 명령:

```bash
BACKEND_PUBLISH_PORT=18080 \
NGINX_HTTP_PORT=13000 \
NGINX_HTTPS_PORT=13001 \
NGINX_DEFAULT_CONF=./nginx/default.conf \
docker compose -f docker-compose.dev.yml down --remove-orphans
```

## 현재 worktree 변경 파일 전체 목록

### 수정된 파일

- `.env.prod.example`
- `AGENTS.md`
- `DEPLOYMENT.md`
- `README.md`
- `backend/src/WoongBlog.Api/Modules/Content/Blogs/Persistence/PublicBlogService.cs`
- `backend/src/WoongBlog.Api/Modules/Content/Works/Persistence/PublicWorkService.cs`
- `backend/tests/WoongBlog.Api.Tests/PublicQueryHandlerTests.cs`
- `package-lock.json`
- `package.json`
- `scripts/main-runtime-allowlist.txt`
- `skills-lock.json`
- `src/components/admin/AdminBlogTableClient.tsx`
- `src/components/admin/AdminDashboardCollections.tsx`
- `src/components/admin/AdminWorksTableClient.tsx`
- `src/components/admin/tiptap-editor/extensions.ts`
- `src/components/admin/tiptap-editor/toolbar.tsx`
- `src/components/admin/tiptap/CommandList.tsx`
- `src/components/admin/tiptap/Commands.ts`
- `src/components/content/InteractiveRenderer.tsx`
- `src/lib/content/blog-content.ts`
- `src/lib/content/html-sanitizer.ts`
- `src/test/blog-content.test.ts`
- `src/test/interactive-renderer.test.tsx`
- `src/test/tiptap-editor.test.tsx`
- `tests/admin-search-pagination.spec.ts`
- `todolist-2026-04-18.md`

### 새 파일

- `backend/src/WoongBlog.Api/Modules/Content/Common/Application/Support/ContentSearchText.cs`
- `scripts/azure-backup-lib.mjs`
- `scripts/azure-backup.mjs`
- `scripts/azure-restore.mjs`
- `scripts/install-azure-backup-cron.mjs`
- `src/components/admin/tiptap/MermaidBlock.ts`
- `src/components/admin/tiptap/MermaidComponent.tsx`
- `src/components/admin/tiptap/ResizableImageBlock.ts`
- `src/components/admin/tiptap/ResizableImageComponent.tsx`
- `src/components/content/MermaidRenderer.tsx`
- `src/lib/search/normalized-search.ts`
- `src/test/azure-backup-lib.test.ts`
- `src/test/normalized-search.test.ts`
- `src/test/tiptap-resizable-image.test.tsx`
- `src/types/mermaid.d.ts`
- `implementation-summary-2026-04-18.md`

### 기존/주의 untracked 항목

- `.agents/skills/find-skills/`
  - 작업 시작 시 이미 untracked로 확인됨
  - feature runtime code는 아님

