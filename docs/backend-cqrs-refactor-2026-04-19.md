# Backend CQRS Refactor Notes - 2026-04-19

## Summary

이번 단계의 backend 변경 목표는 기존 Content 모듈이 의도했던 CQRS/Clean Architecture 방향을 더 명확하게 만드는 것이었다. 핵심은 `Admin*Service`/`Public*Service`처럼 actor 기준으로 너무 넓게 묶인 service를 제거하고, handler가 use-case orchestration을 소유하며, persistence는 좁은 command/query store로 분리하는 것이다.

대상 범위는 Content의 Blogs, Works, Pages가 중심이고, WorkVideo 관련 Domain dependency 정리와 public search 성능 개선도 포함됐다.

## Service 관점

### 제거한 broad service

다음 service interface/implementation은 제거 대상이 됐다.

- `IAdminBlogService`
- `IPublicBlogService`
- `AdminBlogService`
- `PublicBlogService`
- `IAdminWorkService`
- `IPublicWorkService`
- `AdminWorkService`
- `PublicWorkService`
- `IAdminPageService`
- `IPublicPageService`
- `AdminPageService`
- `PublicPageService`

이전 구조는 handler가 `IAdminBlogService.CreateAsync(command)`처럼 command 전체를 그대로 넘기고 service가 slug 생성, excerpt 생성, entity mutation, EF query, projection, SaveChanges까지 한 번에 담당했다. 이 구조는 service가 use-case와 persistence를 동시에 품는 문제가 있었다.

### 새로 만든 narrow store

actor service 대신 아래 store interface/implementation을 도입했다.

- `IBlogCommandStore` / `BlogCommandStore`
- `IBlogQueryStore` / `BlogQueryStore`
- `IWorkCommandStore` / `WorkCommandStore`
- `IWorkQueryStore` / `WorkQueryStore`
- `IPageCommandStore` / `PageCommandStore`
- `IPageQueryStore` / `PageQueryStore`

Command store는 mutation에 필요한 최소 연산만 가진다.

- slug 중복 확인
- update 대상 entity 로드
- add/remove
- 관련 child row 로드/삭제
- SaveChanges

Query store는 read model projection과 EF query만 담당한다.

- admin list/detail projection
- public list/detail projection
- pagination
- search column filtering
- asset/video lookup

### DI 위치 변경

기존 Content persistence service 등록은 `Infrastructure/Persistence/PersistenceServiceCollectionExtensions.cs`에 있었다. 이번 변경 후 Content store 등록은 각 module extension으로 이동했다.

- `BlogsModuleServiceCollectionExtensions`
- `WorksModuleServiceCollectionExtensions`
- `PagesModuleServiceCollectionExtensions`

이렇게 해서 중앙 persistence registration이 Content module 내부 구현을 직접 알지 않게 했고, module별 ownership이 더 명확해졌다.

## CQRS 관점

### 이전 흐름

이전 흐름은 대체로 다음 형태였다.

```text
Endpoint -> MediatR Command/Query Handler -> Admin/Public Service -> DbContext
```

문제는 handler가 대부분 service에 그대로 위임하는 thin wrapper였다는 점이다. CQRS의 command/query type은 있었지만 실제 use-case 책임은 service에 있었다.

### 변경 후 흐름

변경 후 흐름은 다음 형태다.

```text
Endpoint -> MediatR Command/Query Handler -> Command/Query Store -> DbContext
```

handler는 이제 use-case orchestration을 맡는다.

- command validation 이후의 mutation 흐름
- slug 생성
- excerpt 생성
- publish timestamp 규칙
- search field 값 세팅
- not found/result mapping
- 삭제 시 관련 child cleanup orchestration

store는 DB read/write primitive를 제공한다.

### Command side

Blog command handlers:

- `CreateBlogCommandHandler`
- `UpdateBlogCommandHandler`
- `DeleteBlogCommandHandler`

Work command handlers:

- `CreateWorkCommandHandler`
- `UpdateWorkCommandHandler`
- `DeleteWorkCommandHandler`

Page command handler:

- `UpdatePageCommandHandler`

이 handler들은 더 이상 `IAdmin*Service`에 command를 통째로 넘기지 않는다. 필요한 entity를 command store에서 가져오고, handler 내부에서 use-case state transition을 수행한 뒤 store에 저장을 요청한다.

### Query side

Blog query handlers:

- `GetAdminBlogsQueryHandler`
- `GetAdminBlogByIdQueryHandler`
- `GetBlogsQueryHandler`
- `GetBlogBySlugQueryHandler`

Work query handlers:

- `GetAdminWorksQueryHandler`
- `GetAdminWorkByIdQueryHandler`
- `GetWorksQueryHandler`
- `GetWorkBySlugQueryHandler`

Page query handlers:

- `GetAdminPagesQueryHandler`
- `GetPageBySlugQueryHandler`

Query handler는 request parameter 정규화, search mode 결정, page/pageSize normalization을 담당한다. 실제 EF projection과 related lookup은 query store가 담당한다.

## Handler 관점

### Blog handlers

`CreateBlogCommandHandler`는 다음 책임을 갖게 됐다.

- title 기반 unique slug 생성
- content JSON에서 excerpt text 추출
- excerpt 생성
- `Blog` entity 생성
- `SearchTitle`, `SearchText` 값 계산
- `PublishedAt`, `CreatedAt`, `UpdatedAt` 설정
- `AdminMutationResult` 반환

`UpdateBlogCommandHandler`는 다음 책임을 갖게 됐다.

- update 대상 blog 로드
- 없으면 `null`
- title 변경에 따른 unique slug 재계산
- excerpt/search fields 갱신
- publish 상태 전환 시 최초 `PublishedAt` 설정
- `AdminMutationResult` 반환

`DeleteBlogCommandHandler`는 다음 책임을 갖게 됐다.

- 삭제 대상 blog 로드
- 없으면 `AdminActionResult(false)`
- remove/save
- 있으면 `AdminActionResult(true)`

### Work handlers

`CreateWorkCommandHandler`는 다음 책임을 갖게 됐다.

- title 기반 unique slug 생성
- excerpt 생성
- thumbnail/icon/category/period/tags/content/allProperties 설정
- search fields 계산
- publish timestamp와 audit timestamp 설정
- `AdminMutationResult` 반환

`UpdateWorkCommandHandler`는 다음 책임을 갖게 됐다.

- update 대상 work 로드
- 없으면 `null`
- slug/excerpt/search fields 갱신
- thumbnail/icon/category/period/tags/content/allProperties 갱신
- publish 상태 전환 처리

`DeleteWorkCommandHandler`는 다음 책임을 갖게 됐다.

- work 존재 여부 확인
- `IWorkVideoCleanupService.EnqueueCleanupForWorkAsync` 호출
- work videos/upload sessions 로드
- related rows remove
- work remove/save

### Page handlers

`UpdatePageCommandHandler`는 page update orchestration을 service에서 handler로 이동했다.

- page 로드
- 없으면 `AdminActionResult(false)`
- title/content/updatedAt 갱신
- save

`GetAdminPagesQueryHandler`, `GetPageBySlugQueryHandler`는 page query store로 projection 책임을 위임한다.

## DTO 관점

### 유지한 API DTO/response shape

HTTP API의 request/response 계약은 의도적으로 크게 바꾸지 않았다.

- `CreateBlogRequest`
- `UpdateBlogRequest`
- `CreateWorkRequest`
- `UpdateWorkRequest`
- `UpdatePageRequest`
- `UpdateSiteSettingsRequest`
- admin/public list/detail DTO들

프론트엔드와 API contract 변경을 최소화하기 위해 endpoint path와 주요 JSON shape는 유지했다.

### DTO ownership 개선

일부 카드 DTO의 위치가 정리됐다.

- `BlogCardDto`는 blog list/read model 쪽에 가까운 위치로 이동
- `WorkCardDto`는 work list/read model 쪽에 가까운 위치로 이동
- `HomeDto`는 composition 결과로서 해당 DTO들을 참조한다

이 변경의 목적은 Composition module이 card DTO를 소유하던 구조를 줄이고, Blog/Work의 public read model이 자기 DTO를 더 직접 소유하게 하는 것이다.

### Store interface가 command/query DTO를 직접 받지 않게 함

새 abstraction은 `CreateBlogCommand`, `UpdateWorkCommand` 같은 MediatR request type을 parameter로 받지 않는다. command/query object를 persistence layer로 흘리는 대신 handler가 primitive/entity state로 풀어 store를 호출한다.

예:

```text
Before: IAdminBlogService.CreateAsync(CreateBlogCommand command)
After:  IBlogCommandStore.Add(Blog blog)
```

이로써 Application request type과 persistence adapter 사이 coupling이 줄었다.

## Database 관점

### Search columns 추가

`Blog`와 `Work` entity에 다음 컬럼을 추가했다.

- `SearchTitle`
- `SearchText`

목적은 public list search에서 `ContentJson`/excerpt/title 전체 row를 메모리로 가져와 C#에서 필터링하던 구조를 DB filtering 구조로 바꾸는 것이다.

### DbContext search field synchronization

`WoongBlogDbContext.SaveChanges`와 `SaveChangesAsync`를 override했다.

저장 전 `Blog`, `Work`의 added/modified entries를 확인해 다음을 동기화한다.

- `SearchTitle = ContentSearchText.Normalize(Title)`
- `SearchText = ContentSearchText.BuildIndex(Excerpt, ExtractExcerptText(ContentJson))`

이렇게 해서 handler가 값을 세팅하더라도 seed나 다른 update path에서 누락될 가능성을 줄였다.

### EF model indexes

`WoongBlogDbContext.OnModelCreating`에 다음 index를 추가했다.

- `Blog(Published, PublishedAt)`
- `Blog(SearchTitle)`
- `Work(Published, PublishedAt)`
- `Work(SearchTitle)`

EF model contract test에서 이 index 존재를 검증하도록 했다.

### Schema patch 추가

`DatabaseBootstrapper`에 schema patch를 추가했다.

Patch ID:

```text
20260419_content_search_fields
```

Patch 내용:

- `pg_trgm` extension 생성
- `Blogs.SearchTitle`, `Blogs.SearchText` 추가
- `Works.SearchTitle`, `Works.SearchText` 추가
- 기존 rows backfill
- `Published, PublishedAt` index 생성
- `SearchTitle`, `SearchText` GIN trigram index 생성

생성되는 DB index:

- `IX_Blogs_Published_PublishedAt`
- `IX_Works_Published_PublishedAt`
- `IX_Blogs_SearchTitle_Trgm`
- `IX_Blogs_SearchText_Trgm`
- `IX_Works_SearchTitle_Trgm`
- `IX_Works_SearchText_Trgm`

### Public search query 개선

이전에는 검색어가 있으면 published rows를 모두 가져온 뒤 C#에서 `ContentSearchText`로 filtering했다.

변경 후:

- `GetBlogsQueryHandler`가 search query를 normalize
- `BlogQueryStore`가 `SearchTitle.Contains(normalizedQuery)` 또는 `SearchText.Contains(normalizedQuery)`로 DB query 구성
- `GetWorksQueryHandler`와 `WorkQueryStore`도 동일한 방식 적용

이로써 large row set을 application memory에 올리는 부하를 줄였다.

## Domain 관점

### Blog/Work domain entity 변경

`Blog`, `Work`에 검색 전용 필드를 추가했다.

- `SearchTitle`
- `SearchText`

이 필드는 user-facing DTO가 아니라 persistence/search optimization을 위한 domain entity field다.

### WorkVideo constants 이동

기존 `WorkVideoConstants.cs`는 `Modules.Content.Works.Application.WorkVideos` namespace에 있었고, Domain entity가 Application namespace를 using했다.

변경 후:

- `WorkVideoConstants.cs`를 `Domain.Entities` namespace로 이동
- `WorkVideoUploadSession`
- `VideoStorageCleanupJob`

위 entity들이 더 이상 Application namespace를 참조하지 않는다.

포함된 constants:

- `WorkVideoSourceTypes`
- `WorkVideoUploadSessionStatuses`
- `VideoStorageCleanupJobStatuses`
- `WorkVideoHlsSourceKey`

### Thumbnail resolver 위치 조정

`WorkThumbnailUrlResolver`는 persistence 폴더에서 `Modules.Content.Works.Application.Support`로 이동했다. 이 resolver는 public/admin read model projection에서 thumbnail URL을 결정하는 application support logic에 가깝다.

역할:

- explicit thumbnail asset 우선
- non-YouTube video 우선
- YouTube thumbnail fallback
- content HTML 첫 image fallback

## Architecture boundary tests 관점

`ArchitectureBoundaryTests`를 강화했다.

추가/강화한 관점:

- Content handler가 제거된 actor facade service에 의존하지 않음
- Content application abstraction이 MediatR request type을 parameter로 받지 않음
- Domain source가 `WoongBlog.Api.Modules.*`, `Application`, `Infrastructure` using을 갖지 않음
- Public content query persistence가 in-memory search filtering으로 회귀하지 않음

이 테스트들은 이번 구조 변경의 회귀 방지 역할을 한다.

## Persistence contract tests 관점

`PersistenceContractTests`에 search schema contract를 추가했다.

검증 대상:

- `Blog.SearchTitle`
- `Blog.SearchText`
- `Work.SearchTitle`
- `Work.SearchText`
- `Blog(Published, PublishedAt)` index
- `Work(Published, PublishedAt)` index
- `Blog.SearchTitle` index
- `Work.SearchTitle` index

기존 jsonb, slug unique, profile/session uniqueness contract는 유지했다.

## Public query tests 관점

`PublicQueryHandlerTests`는 기존 service helper 대신 새 query store를 사용하도록 갱신했다.

변경:

- `PublicBlogService` 대신 `BlogQueryStore`
- `PublicWorkService` 대신 `WorkQueryStore`

테스트 목적:

- published filtering
- pagination
- normalized title search
- content search
- asset/video URL resolution

## Module registration 관점

Content module 등록 책임이 module extension으로 이동했다.

Blog:

```text
AddBlogsModule()
  IBlogCommandStore -> BlogCommandStore
  IBlogQueryStore -> BlogQueryStore
```

Works:

```text
AddWorksModule()
  IWorkCommandStore -> WorkCommandStore
  IWorkQueryStore -> WorkQueryStore
  IWorkVideoCommandStore -> WorkVideoCommandStore
  IWorkVideoQueryStore -> WorkVideoQueryStore
  IWorkVideoCleanupService -> WorkVideoService
  IVideoObjectStorage -> Local/R2 storage
  IWorkVideoPlaybackUrlBuilder -> WorkVideoPlaybackUrlBuilder
  IVideoTranscoder -> FfmpegVideoTranscoder
  IWorkVideoStorageSelector -> WorkVideoStorageSelector
  IWorkVideoFileInspector -> WorkVideoFileInspector
  IWorkVideoHlsWorkspace -> WorkVideoHlsWorkspace
  IWorkVideoHlsOutputPublisher -> WorkVideoHlsOutputPublisher
```

Pages:

```text
AddPagesModule()
  IPageCommandStore -> PageCommandStore
  IPageQueryStore -> PageQueryStore
```

## 2026-04-20 구현 반영 - AI와 WorkVideo

이 섹션은 Content에서 적용한 CQRS 규칙을 AI와 WorkVideo에 실제로 적용한 내용을 정리한다. 핵심은 service를 무조건 없애는 것이 아니다. 여러 use case를 한꺼번에 처리하던 넓은 facade service는 제거하고, 공통성이 높고 응집된 policy/support/service는 handler가 DI로 받아 사용하도록 분리했다.

## AI 모듈

### 이전 흐름

이전 AI 흐름은 대체로 다음 형태였다.

```text
AI Endpoint -> IAiAdminService -> DbContext / IBlogAiFixService / batch state 변경
```

또는 command/query handler가 있더라도 실제 책임은 대부분 `AiAdminService`에 있었다.

```text
AI Endpoint -> MediatR Handler -> AiAdminService -> DbContext / IBlogAiFixService
```

문제는 `AiAdminService`가 너무 많은 use case를 한 곳에서 처리했다는 점이다.

- runtime config 조회
- single blog HTML fix
- work HTML enrich
- batch job 생성
- batch job 목록/상세 조회
- batch job apply
- batch job cancel/clear/remove
- batch item 상태 전환
- blog content/excerpt 갱신
- HTTP에 가까운 result 의미 구성

즉 CQRS command/query type은 있었지만, handler가 얇은 wrapper가 되고 실제 use-case 책임은 service에 남아 있었다.

### 제거한 service

다음 broad service를 제거했다.

- `IAiAdminService`
- `AiAdminService`

`IBlogAiFixService`는 제거하지 않았다. 이 interface는 외부 AI provider 호출을 감싸는 infrastructure adapter 성격이기 때문에 유지하는 것이 맞다.

### 변경 후 흐름

변경 후 AI endpoint 흐름은 다음 형태다.

```text
AI Endpoint -> MediatR Command/Query Handler -> IAiBlogFixBatchStore / IBlogAiFixService / Policy
```

HTTP mapping은 endpoint boundary에만 남겼다.

```text
Handler -> AiActionResult<T> -> AiHttpResultMapper -> IResult
```

- `AiActionResult<T>`는 application result다.
- `AiHttpResultMapper`만 API layer에서 `AiActionResult<T>`를 HTTP result로 바꾼다.
- AI application handler는 `IResult`, `StatusCodes` 같은 ASP.NET HTTP 타입을 직접 노출하지 않는다.

### Command side

AI command handlers:

- `FixBlogHtmlCommandHandler`
- `FixBlogBatchCommandHandler`
- `EnrichWorkHtmlCommandHandler`
- `CreateBlogFixBatchJobCommandHandler`
- `ApplyBlogFixBatchJobCommandHandler`
- `CancelBlogFixBatchJobCommandHandler`
- `CancelQueuedBlogFixBatchJobsCommandHandler`
- `ClearCompletedBlogFixBatchJobsCommandHandler`
- `RemoveBlogFixBatchJobCommandHandler`

이 handler들이 맡는 책임은 다음과 같다.

- HTML 입력 검증
- AI provider 호출 요청 구성
- batch 대상 blog 선택
- provider/model/reasoning/custom prompt 정규화
- selection key 생성
- 중복 active job 재사용
- job/item 생성
- apply 시 blog `ContentJson`, excerpt, updated timestamp 갱신
- cancel/clear/remove 상태 전환
- API boundary로 넘길 application result 구성

### Query side

AI query handlers:

- `GetAiRuntimeConfigQueryHandler`
- `ListBlogFixBatchJobsQueryHandler`
- `GetBlogFixBatchJobQueryHandler`

이 handler들은 다음을 담당한다.

- runtime provider/model 설정 조회
- batch job count 조회
- 최근 batch job 목록 조회
- batch job 상세와 item projection 조회
- response DTO mapping 호출

### Store side

새 persistence boundary:

- `IAiBlogFixBatchStore`
- `AiBlogFixBatchStore`

store는 DB read/write primitive를 제공한다.

- blog fix 대상 조회
- batch job/item 생성
- active/queued/running/completed job 조회
- job item 조회
- target blog update용 entity 로드
- job/item 삭제
- `SaveChangesAsync`

현재는 batch 관련 query와 command가 한 store에 모여 있다. 기능이 더 커지면 다음처럼 분리할 수 있다.

- `IAiBatchTargetQueryStore`
- `IAiBatchJobCommandStore`
- `IAiBatchJobQueryStore`

### Policy and support side

새 policy/support:

- `AiRuntimePolicy`
- `AiBatchJobProgressPolicy`
- `AiBatchJobResponseMapper`
- `AiBatchWorkerPolicy`
- `IBlogFixApplyPolicy` / `BlogFixApplyPolicy`

각 책임은 다음과 같다.

- provider/model/reasoning/custom prompt 정규화
- selection key 생성
- queued/running/completed/failed/cancelled/applied 상태 전환 규칙
- job/item count refresh/finalize 규칙
- response DTO mapping
- auto-apply 시 blog content/excerpt와 item status 갱신

### Background processing side

이전 batch processor는 background loop와 job 실행 세부사항이 섞여 있었다.

변경 후 흐름은 다음과 같다.

```text
AiBatchJobProcessor
  -> signal wait
  -> IAiBatchJobScheduler
  -> IAiBatchJobRunner
  -> IAiBatchJobItemDispatcher
  -> IAiBatchJobItemProcessor
```

역할 분리:

- `AiBatchJobProcessor`
  - background loop
  - signal wait
  - scoped scheduler 호출
- `AiBatchJobScheduler`
  - running job reset
  - queued job 조회
  - running 전환
  - runner 호출
- `AiBatchJobRunner`
  - job 하나의 pending item queue drain
  - worker count 적용
- `AiBatchJobItemDispatcher`
  - item별 scoped dependency 생성
  - cancel check
  - item processor 호출
  - job count refresh
  - job finalize
- `AiBatchJobItemProcessor`
  - item 하나 처리
  - blog 로드
  - `IBlogAiFixService` 호출
  - success/fail 기록
  - auto-apply 적용

### Scope factory 정리

AI application layer에서는 다음 직접 사용을 제거했다.

- `IServiceScopeFactory`
- `CreateScope`
- `GetRequiredService`

이 규칙은 architecture test로 막는다. scoped lifetime이 필요한 병렬 item 처리는 infrastructure boundary인 `AiBatchJobItemDispatcher`에 격리했다.

### 남은 주의점

- queued job pick과 running 전환은 현재 store 조회 후 save 흐름이다. 여러 process나 여러 worker instance가 동시에 뜨면 atomic claim 또는 DB-level concurrency guard가 필요하다.
- `IAiBlogFixBatchStore`는 아직 target query, job command, job query 역할을 함께 가진다. batch 기능이 더 커지면 store를 더 쪼개야 한다.
- `AiBatchJobRunner`는 지금 queue drain 중심으로 가벼워졌지만, worker scheduling 정책이 커지면 별도 policy/service로 분리할 수 있다.

## WorkVideo 모듈

### 이전 흐름

이전 WorkVideo 흐름은 대체로 다음 형태였다.

```text
WorkVideo Endpoint -> IWorkVideoService -> DbContext / Storage / ffmpeg / cleanup
```

문제는 `IWorkVideoService`가 여러 endpoint use case를 한꺼번에 처리했다는 점이다.

- upload URL 발급
- local upload
- HLS upload와 ffmpeg 변환
- uploaded object confirm
- YouTube video 추가
- video reorder
- video delete
- cleanup enqueue
- mutation result projection
- HTTP status에 가까운 결과 구성

즉 endpoint는 `IWorkVideoService`에 위임하고, service가 persistence, storage, validation, side effect, result mapping을 함께 들고 있었다.

### 제거하거나 축소한 service

제거한 broad interface:

- `IWorkVideoService`

교체한 result:

- `WorkVideoServiceResult<T>`

남긴 narrow service:

- `IWorkVideoCleanupService`
- `WorkVideoService`

`WorkVideoService` class는 남아 있지만 역할은 cleanup 전용으로 축소했다.

- work 삭제 시 관련 video cleanup job enqueue
- pending cleanup job 처리
- expired upload session 정리

### 변경 후 흐름

변경 후 WorkVideo endpoint 흐름은 다음 형태다.

```text
WorkVideo Endpoint -> MediatR Command Handler -> IWorkVideoCommandStore / IWorkVideoQueryStore / Storage support
```

endpoint는 HTTP boundary만 담당한다.

- route binding
- auth policy
- request DTO binding
- `WorkVideoResult<T>`를 HTTP result로 변환

handler는 use-case orchestration을 담당한다.

- version conflict 확인
- not found 처리
- validation
- mutation
- cleanup enqueue
- mutation projection 조회

store는 DB primitive와 projection을 담당한다.

### Command side

WorkVideo command handlers:

- `IssueWorkVideoUploadCommandHandler`
- `UploadLocalWorkVideoCommandHandler`
- `ConfirmWorkVideoUploadCommandHandler`
- `AddYouTubeWorkVideoCommandHandler`
- `ReorderWorkVideosCommandHandler`
- `DeleteWorkVideoCommandHandler`
- `StartWorkVideoHlsJobCommandHandler`

각 handler의 책임은 다음과 같다.

`IssueWorkVideoUploadCommandHandler`:

- work 존재 여부 확인
- videos version conflict 확인
- file validation
- max video count 확인
- storage backend 선택
- upload session 생성
- upload target 생성

`UploadLocalWorkVideoCommandHandler`:

- upload session 확인
- local storage 여부 확인
- file validation
- direct upload 저장
- session uploaded 처리

`ConfirmWorkVideoUploadCommandHandler`:

- work/session/version 확인
- object 존재/content-type/size 확인
- MP4 prefix validation
- `WorkVideo` row 생성
- session confirmed 처리
- videos version 증가

`AddYouTubeWorkVideoCommandHandler`:

- work/version/max-count 확인
- YouTube URL/ID 정규화
- `WorkVideo` row 생성
- videos version 증가

`ReorderWorkVideosCommandHandler`:

- work/version 확인
- reorder payload가 모든 video를 정확히 포함하는지 검증
- sort order update
- videos version 증가

`DeleteWorkVideoCommandHandler`:

- work/version/video 존재 여부 확인
- cleanup job enqueue
- video row 삭제
- remaining videos sort order 재정렬
- videos version 증가

`StartWorkVideoHlsJobCommandHandler`:

- file/work/version/max-count 확인
- storage 선택
- HLS workspace 생성
- MP4 inspection
- HLS segmentation
- HLS output publish
- HLS `WorkVideo` row 생성

### Store side

새 persistence boundary:

- `IWorkVideoCommandStore`
- `WorkVideoCommandStore`
- `IWorkVideoQueryStore`
- `WorkVideoQueryStore`

`IWorkVideoCommandStore`는 mutation primitive를 담당한다.

- work/update 대상 로드
- upload session 로드/추가/상태 변경
- video count 조회
- next sort order 조회
- video row 추가/삭제/reorder
- cleanup job enqueue
- expired session 조회
- pending cleanup job 조회
- `SaveChangesAsync`

`IWorkVideoQueryStore`는 mutation 후 response projection을 담당한다.

- `GetMutationResultAsync`
- `WorkVideosMutationResult`
- `WorkVideoDto`

### Support and adapter side

새 support/adapter:

- `IWorkVideoStorageSelector`
- `IVideoTranscoder` / `FfmpegVideoTranscoder`
- `IWorkVideoFileInspector`
- `IWorkVideoHlsWorkspace`
- `IWorkVideoHlsOutputPublisher`
- `WorkVideoPolicy`

각 책임은 다음과 같다.

- `IWorkVideoStorageSelector`: local/R2 등 현재 사용할 video storage 선택
- `IVideoTranscoder`: ffmpeg HLS segmentation 실행
- `IWorkVideoFileInspector`: MP4 prefix와 `ftyp` validation
- `IWorkVideoHlsWorkspace`: HLS 임시 workspace와 source file 관리
- `IWorkVideoHlsOutputPublisher`: HLS output directory를 object storage로 publish
- `WorkVideoPolicy`: YouTube ID 정규화, file validation, HLS constants

### Result mapping

`WorkVideoServiceResult<T>`가 갖고 있던 HTTP status code 개념은 제거했다.

새 application result:

- `WorkVideoResult<T>`
- `WorkVideoResultStatus`

status 값:

- `Success`
- `BadRequest`
- `NotFound`
- `Conflict`
- `Unsupported`

HTTP status mapping은 `WorkVideoEndpoints.ToResult`에서만 수행한다. architecture test도 `WorkVideoResult<T>`가 `StatusCodes.*`에 의존하지 않도록 검증한다.

### 파일 구조 정리

이전에는 WorkVideo command handlers와 policy가 `WorkVideoCommandHandlers.cs` 한 파일에 같이 있었다.

변경 후:

- endpoint action별 command handler 파일로 분리
- `WorkVideoPolicy.cs` 별도 분리
- `WorkVideoCommandHandlers.cs` 제거

이 변경은 동작 변경이 아니라 탐색 비용과 파일 비대화를 줄이기 위한 구조 정리다.

### 남은 주의점

- `StartWorkVideoHlsJobCommandHandler`는 여전히 밀도가 높다. HLS use case 자체가 storage selection, workspace, MP4 inspection, transcoding, output publish, row creation을 한 번에 조율해야 하기 때문이다.
- `IWorkVideoCommandStore`는 work/video/session/cleanup mutation primitive를 함께 가진다. cleanup/session 쪽이 더 커지면 store를 나눌 수 있다.
- `IWorkVideoCleanupService`는 좁아졌지만 여전히 service boundary다. cleanup job processing이 복잡해지면 background use case도 command handler로 표현할 수 있다.

## Files added

### Content abstractions

- `IBlogCommandStore.cs`
- `IBlogQueryStore.cs`
- `IWorkCommandStore.cs`
- `IWorkQueryStore.cs`
- `IPageCommandStore.cs`
- `IPageQueryStore.cs`

### Persistence adapters

- `BlogCommandStore.cs`
- `BlogQueryStore.cs`
- `WorkCommandStore.cs`
- `WorkQueryStore.cs`
- `PageCommandStore.cs`
- `PageQueryStore.cs`

### Domain/support

- `Domain/Entities/WorkVideoConstants.cs`
- `Content/Common/Application/Support/ContentSearchMode.cs`
- `Content/Works/Application/Support/WorkThumbnailUrlResolver.cs`

## Files removed

- `IAdminBlogService.cs`
- `IPublicBlogService.cs`
- `AdminBlogService.cs`
- `PublicBlogService.cs`
- `IAdminWorkService.cs`
- `IPublicWorkService.cs`
- `AdminWorkService.cs`
- `PublicWorkService.cs`
- `IAdminPageService.cs`
- `IPublicPageService.cs`
- `AdminPageService.cs`
- `PublicPageService.cs`
- old `WorkVideoConstants.cs` under Application WorkVideos namespace
- old `WorkThumbnailUrlResolver.cs` under Persistence namespace

## Behavior preserved

The refactor aimed to preserve external behavior.

Preserved:

- admin blog/work/page endpoint paths
- public blog/work/page endpoint paths
- request DTO names and JSON shape
- admin mutation result shape
- public list/detail DTO shape as consumed by frontend
- Work video upload/playback behavior
- existing seed behavior

## Known tradeoffs

- `SearchTitle` and `SearchText` are denormalized fields. This adds write-side synchronization complexity but reduces read-side search cost.
- `WoongBlogDbContext` now references Content support helpers for search synchronization. This is pragmatic in a single-project architecture but would need a domain/application service if the codebase later becomes multi-project Clean Architecture.
- Raw SQL schema patch remains consistent with the repository's current `SchemaPatches` approach instead of introducing EF migrations.

## 후속 방향 - cross-module handler/service split

2026-04-20 review note: Content refactor 방향은 좋지만 같은 규칙이 Blog/Work/Page에서 멈추면 안 된다. 다음 pass에서는 Content를 기준 구현으로 보고, AI, Media, Site, Identity, Composition, WorkVideo 중 service가 너무 많은 책임을 가진 flow에 같은 책임 분리 규칙을 적용한다.

목표는 "모든 service 제거"가 아니다. 기준은 다음과 같다.

- Endpoint는 HTTP binding, auth policy 선택, request DTO binding, HTTP result mapping을 맡는다.
- Command/query handler는 use-case orchestration, state transition rule, failure/result semantics를 맡는다.
- Command/query store는 persistence primitive와 projection query를 맡는다.
- Infrastructure adapter는 AI provider 호출, local/R2 storage, ffmpeg/HLS 처리, cookie sign-in, clock/file-system interaction 같은 외부 side effect를 맡는다.
- Pure policy/support service는 HTTP, EF, 외부 시스템에 의존하지 않는 deterministic logic이면 유지해도 된다.

다음 refactor에서 제거해야 할 red flag:

- Application service method returns `IResult`.
- Service accepts an API request DTO or MediatR command wholesale and mutates persistence directly.
- Handler is only a thin wrapper over `SomeBroadService.DoEverythingAsync`.
- One service combines validation, EF query, file-system write/delete, third-party call, projection, and response shaping.
- Persistence adapter depends on API contracts rather than primitive parameters, domain entities, or projection DTOs.

### AI 모듈 현재 상태

현재 구현 흐름:

```text
Endpoint -> MediatR AI handlers -> IAiBlogFixBatchStore + IBlogAiFixService + AiBatchJobSignal
```

`IAiAdminService`는 제거됐다. AI endpoints는 MediatR command/query handler를 호출하고, batch persistence는 `IAiBlogFixBatchStore`를 통해 흐른다.

구현된 slice:

- `GetAiRuntimeConfigQueryHandler`: options와 `IBlogAiFixService` capability metadata에서 provider/model 기본값을 만든다.
- `FixBlogHtmlCommandHandler`: HTML 검증, `IBlogAiFixService` 호출, response DTO 반환을 맡는다. EF store가 필요 없다.
- `EnrichWorkHtmlCommandHandler`: work enrichment에도 같은 패턴을 적용한다.
- `CreateBlogFixBatchJobCommandHandler`: `IAiBlogFixBatchStore`로 대상 blog를 고르고, selection key 생성, job/item 생성, `AiBatchJobSignal` notify를 맡는다.
- `ListBlogFixBatchJobsQueryHandler`, `GetBlogFixBatchJobQueryHandler`: `IAiBlogFixBatchStore` projection을 사용한다.
- `ApplyBlogFixBatchJobCommandHandler`: job/item과 target blog를 로드하고, content/excerpt update를 적용한 뒤 aggregate를 refresh한다.
- `CancelBlogFixBatchJobCommandHandler`, `CancelQueuedBlogFixBatchJobsCommandHandler`, `ClearCompletedBlogFixBatchJobsCommandHandler`, `RemoveBlogFixBatchJobCommandHandler`: status transition rule은 handler/policy에 두고 persistence operation은 store에 둔다.

`IBlogAiFixService`는 외부 AI capability adapter라 유지한다. `IAiBlogFixBatchStore`는 현재 하나의 batch store boundary로 둔다. 더 커지면 target query, job command, job query store로 나눈다.

### Media 모듈 현재 상태

현재 흐름:

```text
Endpoint -> MediatR media command handlers -> IMediaAssetCommandStore + IMediaAssetStorage + IMediaAssetUploadPolicy
```

`MediaAssetService`는 제거됐다. Upload/delete flow는 command handler, command store, storage adapter, upload policy를 사용한다.

구현/유지할 목표:

- `UploadAssetCommandHandler`: bucket normalization, upload validation 결과, profile id 추출 규칙, 저장 orchestration을 맡는다.
- `DeleteAssetCommandHandler`: not-found 의미와 delete 순서를 맡는다.
- `IMediaAssetCommandStore`: `AddAssetAsync`, `GetAssetForDeleteAsync`, `RemoveAssetAsync`, `SaveChangesAsync`.
- `IMediaObjectStorage`: `SaveAsync`, `DeleteIfExistsAsync`. local storage는 adapter고, future R2/S3도 adapter로 붙인다.
- `MediaUploadPolicy`: MIME type, size, extension, bucket constraint에 대한 pure validation.

For safety, the first implementation should keep current external response shape but add integration tests around "file written and asset row persisted" and "delete removes both row and file." If true atomicity is required later, add an outbox/cleanup job instead of trying to make file-system writes transactional with EF.

### WorkVideo 모듈 현재 상태

2026-04-20 구현으로 WorkVideo는 future candidate가 아니라 완료된 CQRS slice가 됐다. `WorkVideoService`는 `IWorkVideoCleanupService` 역할만 남고, endpoint mutation은 command handler로 이동했다.

완료된 목표:

- endpoint action별 command handler를 둔다: `IssueWorkVideoUploadCommandHandler`, `UploadLocalWorkVideoCommandHandler`, `ConfirmWorkVideoUploadCommandHandler`, `AddYouTubeWorkVideoCommandHandler`, `ReorderWorkVideosCommandHandler`, `DeleteWorkVideoCommandHandler`, `StartWorkVideoHlsJobCommandHandler`.
- `IWorkVideoCommandStore`, `IWorkVideoQueryStore`가 work/session/video row operation과 mutation projection을 맡는다.
- `IVideoObjectStorage`는 외부 storage adapter로 남는다.
- `IVideoTranscoder`가 ffmpeg/HLS segmentation을 감싼다.
- `IWorkVideoFileInspector`, `IWorkVideoHlsWorkspace`, `IWorkVideoHlsOutputPublisher`가 MP4 validation, temp workspace management, HLS output publishing을 분리한다.
- `WorkVideoResult<T>`/`WorkVideoResultStatus`가 HTTP status를 들고 있던 service result를 대체한다. HTTP mapping은 `WorkVideoEndpoints.ToResult`에만 있다.

남은 cleanup은 작다. `WorkVideoPolicy`는 이미 별도 파일이고 HTTP, EF, storage, ffmpeg에 의존하지 않는 pure helper다.

### Site module candidates

Current shape still has actor-style services:

- `IAdminSiteSettingsService` / `AdminSiteSettingsService`
- `IPublicSiteService` / `PublicSiteService`

The command handler currently delegates the entire `UpdateSiteSettingsCommand` to `AdminSiteSettingsService`. This repeats the pre-refactor Content pattern.

Recommended target:

- `UpdateSiteSettingsCommandHandler` loads singleton settings through `ISiteSettingsCommandStore`, applies partial update semantics, sets `UpdatedAt`, and saves.
- `GetAdminSiteSettingsQueryHandler`, `GetSiteSettingsQueryHandler`, and `GetResumeQueryHandler` use `ISiteSettingsQueryStore` projections.
- Resume asset lookup should be a query-store method such as `GetResumeAssetAsync` instead of being hidden in `PublicSiteService`.

### Composition module candidates

Composition queries are read-side orchestration, so broad services are less risky than broad command services. Still, `PublicHomeService` owns home page lookup, site settings lookup, asset lookup, featured works, work videos, recent posts, thumbnail resolution, and DTO construction.

Recommended target:

- `GetHomeQueryHandler` should orchestrate multiple narrow read stores: page summary, site settings summary, featured works, recent posts, and asset lookup.
- `GetDashboardSummaryQueryHandler` can use `IAdminDashboardQueryStore` because it is a simple read projection.
- Keep composition DTO construction in the handler or a pure mapper. Do not let a persistence service become the hidden owner of the home page use case.

This can reuse the existing Content query stores where practical. If cross-module query composition becomes too chatty, introduce a dedicated read-model store for the home projection, but keep it query-only.

### Identity/Auth module candidates

Identity has two kinds of code that should be treated differently.

Acceptable service boundary:

- `IdentityInteractionService` may remain a service where it wraps ASP.NET authentication details, cookie properties, and `AuthRecorder` integration. Those are framework interactions, not plain persistence.

Refactor candidates:

- Admin member listing should move from `IAdminMemberService` to `IAdminMemberQueryStore`, with `GetAdminMembersQueryHandler` owning the read use case.
- Test login profile lookup can be separated into an `IIdentityProfileQueryStore` so `IdentityInteractionService` focuses on authentication/session interaction.
- Logout and test-login can become commands if endpoint logic grows, but do not over-model `GetSession` and `GetCsrf`; those are thin HTTP/framework reads and can stay endpoint-local.

### Refactor order

Recommended order by risk/reward:

1. Site settings: small scope, mirrors Content update/query split, low side-effect risk.
2. Composition read stores: improves clarity without changing behavior.
3. Identity admin members: simple query split.
4. AI admin/batch handlers: high payoff because `IAiAdminService` mixes HTTP, EF, AI, and batch state transitions.
5. Media asset upload/delete: side-effect boundary requires careful integration tests.
6. WorkVideo: largest side-effect surface; do after Media storage boundaries are stable.

Each slice should follow the same TDD cadence:

```text
one behavior test -> minimum handler/store change -> refactor -> architecture boundary assertion
```

## Backend test strategy expansion

The backend test plan should distinguish behavioral tests by layer instead of treating every backend test as one generic xUnit suite.

### Project layout target

Current state is a single `backend/tests/WoongBlog.Api.UnitTests, WoongBlog.Api.IntegrationTests, WoongBlog.Api.ArchitectureTests` project with endpoint, persistence, architecture, service, and validator tests. Keep it during migration, but move toward:

```text
backend/tests/WoongBlog.Api.UnitTests
backend/tests/WoongBlog.Api.IntegrationTests
backend/tests/WoongBlog.Api.ContractTests
backend/tests/WoongBlog.Api.ArchitectureTests
```

If splitting projects is too much for the first pass, use xUnit traits/categories first and split projects later. The important part is that CI can run fast tests before slower Docker-backed integration/contract tests.

### Unit tests

Purpose: verify pure behavior and handler orchestration without ASP.NET hosting or real external services.

Good targets:

- command/query validators
- pure policies: slug generation, provider/model normalization, media validation, video validation, search normalization
- handler state transition rules using fake stores/adapters
- DTO mapper/projection helpers where they contain non-trivial rules
- `AuthRedirectUriResolver`, content text extraction, thumbnail resolution

Avoid:

- mocking private methods
- testing EF query syntax in unit tests
- asserting that a handler called a specific internal method when the observable result is enough

### Integration tests

Purpose: verify ASP.NET routing, auth policies, DI, EF model behavior, schema patches, persistence queries, file upload behavior, and hosted/background interactions.

Good targets:

- Minimal API endpoint behavior through `WebApplicationFactory`
- admin auth and CSRF/session flows
- media upload/delete with test media root
- AI batch job status transitions with fake AI provider
- WorkVideo upload/session/reorder/delete with fake storage and fake transcoder
- PostgreSQL-specific schema and index behavior through Docker compose where in-memory EF would hide issues
- module registration/startup composition

The existing `PersistenceContractTests` should be renamed conceptually as persistence/schema contract tests. They are valuable, but they are not Pact HTTP contract tests.

### Pact.NET contract tests

Interpretation: `pack.net` in the request maps to Pact.NET/PactNet because the intended feature is contract testing.

Use Pact for HTTP API contract boundaries between the Next.js frontend/API client and ASP.NET provider. Pact is most useful for stable request/response contracts; it should not replace Playwright for browser behavior or integration tests for multipart/file-system side effects.

Recommended first contract scope:

- `GET /api/public/site-settings`
- `GET /api/public/home`
- `GET /api/public/blogs`
- `GET /api/public/blogs/{slug}`
- `GET /api/public/works`
- `GET /api/public/works/{slug}`
- `GET /api/public/pages/{slug}`
- `GET /api/auth/session`
- selected admin read endpoints after auth test-state setup

Defer or keep integration-only at first:

- multipart upload contracts
- HLS/video flows
- AI batch mutations with long-running background behavior

Provider verification target:

- Add `backend/tests/WoongBlog.Api.ContractTests`.
- Add `PactNet` and `PactNet.Output.Xunit` to that test project.
- Start the ASP.NET provider on a real local TCP socket for Pact verification. Do not use `WebApplicationFactory`/in-memory `TestServer` for Pact.NET provider verification because Pact.NET's verifier calls the provider from native code outside the in-memory ASP.NET test server.
- Use Pact provider states to seed specific rows: published blog exists, published work exists, site settings configured, admin session available, empty result state.
- Verify Pact files from `tests/contracts/pacts` or from a Pact Broker/PactFlow once CI is ready.

Consumer contract target:

- The real consumer is the Next.js/frontend API layer, so the long-term consumer pact generation should happen in the frontend test stack with Pact JS or generated Pact files from the typed API client tests.
- If the team wants a .NET-only first step, create a small .NET consumer harness for the highest-value public API contracts, but treat it as a bootstrap. It should not pretend to cover the TypeScript frontend client forever.

Contract authoring rules:

- Use matchers for ids, timestamps, URLs, optional fields, and arrays.
- Assert JSON shape and business-required fields, not exact seed values unless the exact value is the contract.
- Keep Pact contracts focused on compatibility; put business edge cases in unit/integration tests.
- Publish provider verification results only from CI.

Pact.NET package choice:

- Prefer `PactNet` from the `pact-foundation` NuGet owner.
- Avoid deprecated OS-specific packages such as `PactNet.Windows`, `PactNet.Linux.x64`, and `PactNet.OSX`.
- Pin the package version centrally once introduced; as of the 2026-04-20 source check, NuGet lists `PactNet` latest as `5.0.1`.

### SonarAnalyzer.CSharp test project plan

2026-04-20 correction: do not introduce SonarQube server/scanner CI for this repository now. The intended static analysis addition is `SonarAnalyzer.CSharp` as a compile-time analyzer package on backend test projects after the CQRS refactor settles.

Recommended backend test project shape after WorkVideo store and AI batch processor cleanup are complete:

```text
backend/tests/WoongBlog.Api.UnitTests
backend/tests/WoongBlog.Api.IntegrationTests
backend/tests/WoongBlog.Api.ArchitectureTests
backend/tests/WoongBlog.Api.ContractTests
```

Rules:

- Split tests by dependency shape at the time of the split, not by a fixed stale file-name list.
- Unit tests must not use `WebApplicationFactory`, `HttpClient`, endpoint routing, auth middleware, real upload side effects, or real DB providers.
- Integration tests own Minimal API, DI, auth, EF persistence, file/storage side effects, and existing `CustomWebApplicationFactory`/`TestAuthHandler`.
- Architecture tests own assembly/source dependency rules and can add `NetArchTest.Rules`.
- Contract tests remain Pact.NET provider verification and stay separate from integration tests.
- Add `SonarAnalyzer.CSharp 10.15.0.120848` to each backend test project as an analyzer package.
- Remove any `sonar-scan` CI job and keep Pact provider verification as the only contract-quality job until actual consumer pact files exist.

### New architecture tests to add with each slice

Add boundary tests incrementally as modules are refactored:

- Application services must not return `IResult`.
- Persistence stores must not accept API request DTOs or MediatR command/query types.
- Endpoint files should depend on `ISender` for use cases except deliberately thin framework endpoints such as CSRF/session.
- Domain entities must not reference `Modules.*.Application`, `Infrastructure`, or ASP.NET packages.
- Query stores can return projection DTOs; command stores should expose persistence primitives and avoid HTTP status/result concepts.
- AI/Media/Video infrastructure adapters can depend on external libraries, but handlers should depend on interfaces.

## 2026-04-20 implementation update - cross-module CQRS pass

The follow-up direction above has now been applied beyond Content. The most important correction from this pass is that the goal was not to move service methods into handlers mechanically. The goal was to remove broad services that mixed HTTP, EF, external side effects, status transitions, and response shaping.

### Site, Composition, and Identity

The low-risk read/update modules now follow the Content reference shape more closely.

Implemented shape:

```text
Endpoint -> MediatR Handler -> Command/Query Store -> DbContext
```

Changes:

- Site settings now use `ISiteSettingsCommandStore` and `ISiteSettingsQueryStore`.
- `UpdateSiteSettingsCommandHandler` owns partial-update semantics, not-found behavior, `UpdatedAt`, and save orchestration.
- Public/admin site settings and resume queries use query-store projections.
- Composition read orchestration now uses `IHomeQueryStore` and `IAdminDashboardQueryStore`.
- `GetHomeQueryHandler` composes the home DTO from page, site settings, featured works, recent posts, and asset/video projection inputs.
- Admin members now use `IAdminMemberQueryStore`.

Removed broad services:

- `IAdminSiteSettingsService`
- `IPublicSiteService`
- `IAdminDashboardService`
- `IPublicHomeService`
- `IAdminMemberService`

Kept intentionally:

- `IdentityInteractionService`, because it wraps ASP.NET authentication/cookie interaction and `AuthRecorder`. This is a framework adapter boundary, not plain persistence orchestration.

### AI module

Previous shape:

```text
Endpoint -> MediatR AI handlers -> IAiBlogFixBatchStore + IBlogAiFixService + AiBatchJobSignal
```

Current shape:

```text
Endpoint -> MediatR Handler -> IAiBlogFixBatchStore + IBlogAiFixService + AiBatchJobSignal
```

Changes:

- `IAiAdminService` and `AiAdminService` were removed.
- AI endpoints call `ISender` and map `AiActionResult<T>` to HTTP only at the API boundary.
- `GetAiRuntimeConfigQueryHandler` owns runtime config response construction.
- `FixBlogHtmlCommandHandler` and `EnrichWorkHtmlCommandHandler` validate HTML and call `IBlogAiFixService`.
- Blog batch job create/list/detail/apply/cancel/clear/remove flows are represented as MediatR commands/queries.
- `IAiBlogFixBatchStore` / `AiBlogFixBatchStore` owns blog target lookup, job/item persistence, aggregate reads, and save primitives.
- `AiRuntimePolicy` owns provider/model/reasoning/custom prompt/selection-key normalization.
- `AiBatchJobProgressPolicy` owns batch item/job status transitions and aggregate count refresh.
- `AiBatchJobProcessor` no longer depends directly on `WoongBlogDbContext`; it works through `IAiBlogFixBatchStore` and shared progress policy.

What this fixed:

- HTTP result creation left the application service layer.
- API DTOs no longer flow into persistence adapters as service input.
- Handler and background processor now share the same batch progress rules instead of duplicating count/status math.

### Media module

Previous shape:

```text
Endpoint -> MediatR media command handlers -> IMediaAssetCommandStore + IMediaAssetStorage + IMediaAssetUploadPolicy
```

Current shape:

```text
Endpoint -> MediatR Command Handler -> IMediaAssetCommandStore + IMediaAssetStorage + IMediaAssetUploadPolicy
```

Changes:

- `IMediaAssetService` and `MediaAssetService` were removed.
- `UploadAssetCommandHandler` owns upload orchestration, profile id extraction, storage write, asset row creation, and response shaping.
- `DeleteMediaAssetCommandHandler` owns delete semantics and store/storage coordination.
- `IMediaAssetCommandStore` owns asset persistence primitives.
- `IMediaAssetStorage` owns physical file-system side effects.
- `IMediaAssetUploadPolicy` owns deterministic upload validation.

What this fixed:

- File-system writes and EF persistence are separately testable.
- Upload validation is pure policy logic.
- Endpoints no longer call a broad media application service directly.

### WorkVideo module

Intermediate shape after the first pass:

```text
Endpoint -> MediatR WorkVideo command handlers -> IWorkVideoCommandStore + IWorkVideoQueryStore + storage selector + storage adapter + transcoder
```

This was not enough because it merely wrapped a broad service. The final pass moved endpoint use-case orchestration into command handlers.

Current endpoint mutation shape:

```text
Endpoint -> MediatR Command Handler -> IWorkVideoCommandStore + IWorkVideoQueryStore + IWorkVideoStorageSelector + IVideoObjectStorage + IVideoTranscoder
```

Changes:

- Upload URL, local upload, HLS upload, confirm upload, YouTube add, reorder, and delete endpoints all go through command handlers.
- Those command handlers now orchestrate stores/adapters directly instead of calling `IWorkVideoService`.
- `IWorkVideoCommandStore` owns tracked work/video/session/cleanup mutation primitives.
- `IWorkVideoQueryStore` owns `WorkVideosMutationResult` projection.
- `IVideoTranscoder` / `FfmpegVideoTranscoder` owns HLS segmentation.
- `IWorkVideoStorageSelector` owns local/R2 storage selection.
- `IWorkVideoCleanupService` remains as a narrow cleanup/background/delete-work boundary only.

Kept intentionally:

- `WorkVideoService`, but now only as `IWorkVideoCleanupService` implementation for:
  - enqueue cleanup for all videos when deleting a work
  - process cleanup jobs
  - expire upload sessions

What this fixed:

- Endpoint command handlers are no longer thin wrappers over a broad service.
- EF row operations are behind stores.
- Storage and transcoding are adapter boundaries.
- The remaining service has a narrow background-cleanup responsibility.

### Test project split and static analysis

Backend tests are now physically split after CQRS boundaries stabilized:

```text
backend/tests/WoongBlog.Api.UnitTests
backend/tests/WoongBlog.Api.IntegrationTests
backend/tests/WoongBlog.Api.ArchitectureTests
backend/tests/WoongBlog.Api.ContractTests
```

The old `WoongBlog.Api.UnitTests, WoongBlog.Api.IntegrationTests, WoongBlog.Api.ArchitectureTests` project was removed after the split.

Layer ownership:

- Unit tests: pure helpers, validators, policies, and handler/store behavior without ASP.NET hosting.
- Integration tests: Minimal API, `WebApplicationFactory`, auth, DI, EF, upload/file side effects, AI, media, WorkVideo.
- Architecture tests: dependency rules and source/assembly boundaries.
- Contract tests: Pact.NET provider verification; currently clean-skips when no pact JSON files exist.

Static analysis correction:

- SonarQube server/scanner CI was removed.
- `SonarAnalyzer.CSharp` is used as a compile-time analyzer package in the split test projects.

## Remaining gaps after 2026-04-20 pass

The CQRS/service split is materially better, but not finished in every dimension.

### Pact contracts are infrastructure-only

Pact.NET provider verification exists, but there are no real consumer pact JSON files yet.

Remaining work:

- Generate frontend/API-client consumer pacts for stable read endpoints.
- Start with public home/site/blog/work/page/auth session contracts.
- Keep upload, HLS/video mutation, and AI batch mutation out of Pact until those APIs are intentionally frozen.

### WorkVideo command handlers contain substantial orchestration

This is acceptable for the current CQRS target because handlers own use-case orchestration. The worst file-level bloat was reduced by splitting `WorkVideoCommandHandlers.cs` into endpoint-action handler files and moving pure rules to `WorkVideoPolicy.cs`. However, HLS remains a dense use case because it must coordinate validation, storage selection, workspace, MP4 inspection, ffmpeg segmentation, output publishing, and row creation.

Possible later extraction:

- add focused unit tests for `WorkVideoPolicy`
- split HLS orchestration further only if the support abstractions or tests reveal duplicated rules

### AI batch runner is less coupled but store boundary is still broad

The AI application layer no longer directly uses `IServiceScopeFactory` or service locator resolution. Background-scoped work is isolated in infrastructure boundaries:

- `AiBatchJobProcessor`
- `AiBatchJobItemDispatcher`

Remaining work:

- review queued-job claim semantics if more than one background worker/process can run
- consider splitting `IAiBlogFixBatchStore` into target query, job command, and job query stores if batch features continue growing
- consider smaller runner/finalizer/cancellation policies if `AiBatchJobRunner` grows beyond queue draining

### Cleanup service is still a service boundary

`IWorkVideoCleanupService` remains intentionally because it is background-worker/delete-work cleanup orchestration. It is narrow now, but still a service.

Watch point:

- If cleanup grows, split it into `IWorkVideoCleanupCommandStore` plus `ProcessVideoCleanupJobsCommandHandler` and `ExpireWorkVideoUploadSessionsCommandHandler`.

### Identity interaction remains broad but framework-bound

`IdentityInteractionService` remains because it coordinates authentication framework behavior, cookies, redirect resolution, and `AuthRecorder`.

Watch point:

- If profile lookup or member/session persistence grows inside it, introduce identity query/command stores and keep the service as only the ASP.NET auth adapter.

### Integration tests still mostly use in-memory EF

The split project includes Testcontainers dependencies, but the existing integration tests still primarily use the current in-memory `WebApplicationFactory`.

Remaining work:

- move PostgreSQL-specific schema/index tests to Testcontainers
- keep in-memory tests for fast endpoint behavior where provider-specific behavior is irrelevant

### Analyzer warnings are visible but not yet cleaned up

`SonarAnalyzer.CSharp` now emits warnings in test projects, especially around DTO-like private payload types and cancellation-token analyzer warnings.

Remaining work:

- decide which analyzer warnings should be fixed vs suppressed in test projects
- prefer targeted suppressions for DTO deserialization payloads and integration-test cancellation patterns where appropriate

### Feature flow map is stale for implemented modules

`docs/test260419-feature-flow-map.md` still contains rows that mention old shapes such as old AI and WorkVideo service-call shapes.

Remaining work:

- regenerate or patch the flow map so handler/store columns reflect the new AI, Media, Site, Composition, Identity, and WorkVideo shapes.

### Source notes checked on 2026-04-20

- Pact.NET official docs: `https://docs.pact.io/implementation_guides/net`
- Pact.NET GitHub README: `https://github.com/pact-foundation/pact-net`
- NuGet pact-foundation profile: `https://www.nuget.org/profiles/pact-foundation`
- SonarAnalyzer.CSharp NuGet package: `https://www.nuget.org/packages/SonarAnalyzer.CSharp`

## Verification performed

Backend:

```text
dotnet test backend/WoongBlog.sln
139 passed
```

Frontend/browser smoke after backend change:

```text
npm run typecheck
npm run lint
npx vitest run src/test/admin-bulk-table.test.tsx
focused Docker-backed Playwright subset
```

Docker/Postgres schema smoke:

- backend health OK
- nginx health OK
- `SchemaPatches` contains `20260419_content_search_fields`
- `Blogs`/`Works` contain `SearchTitle` and `SearchText`
- trigram indexes exist for Blog/Work search fields
