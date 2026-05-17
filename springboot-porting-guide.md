Java Spring으로 포팅할 때도 CQRS 식으로 가는 게 좋다.
다만 C# MediatR를 1:1로 흉내 내려고 Java용 Mediator 라이브러리를 꼭 넣을 필요는 없다.

현재 코드가 이미 이런 구조야.

ASP.NET Core Endpoint
  ↓
MediatR
  ↓
CommandHandler / QueryHandler
  ↓
QueryStore / CommandStore / Service
  ↓
EF Core / 외부 AI / 파일 / 기타 인프라

예를 들어 GetBlogsQueryHandler는 요청값을 정규화하고 검색 모드를 정한 뒤 IBlogQueryStore로 조회를 위임하고 있다. 즉 Handler가 “조회 유스케이스 흐름”을 맡고, DB 조회 세부는 Store가 맡는 구조다.

또 FixBlogHtmlCommandHandler는 HTML 입력 검증 후 IBlogAiFixService에 AI 수정 작업을 위임한다. 이것도 Handler가 직접 AI 호출 세부를 구현하지 않고, 유스케이스 흐름만 잡는 좋은 형태다.

GetHomeQueryHandler도 홈 화면을 구성하기 위해 shell, featured works, recent posts를 조회해서 HomeDto로 조립한다. 이건 “홈 화면 조회”라는 Query 유스케이스로 분리되어 있다.

그래서 Java 포팅도 이렇게 가는 게 자연스럽다.

Spring Controller
  ↓
CommandHandler / QueryHandler 또는 UseCase
  ↓
CommandStore / QueryStore / Domain Service
  ↓
JpaRepository / QueryDSL / 외부 API / Storage
내 추천 결론

이 프로젝트는 단순 CRUD 블로그가 아니다.

너의 기존 구조를 보면:

- 공개 블로그/워크 조회
- 관리자용 생성/수정/삭제
- AI HTML 수정/보강
- 배치 작업
- 홈 화면 조합 조회
- 비디오/HLS/R2 같은 인프라성 기능
- 인증/관리자 기능

이런 성격이 있어서 그냥 Spring에서 흔한

Controller → BlogService → BlogRepository

로 뭉개면 나중에 BlogService, AiService, WorkService가 금방 커질 가능성이 높다.

따라서 Java에서는 이렇게 가져가는 게 좋다.

Controller
  ↓
CreateBlogCommandHandler
UpdateBlogCommandHandler
DeleteBlogCommandHandler
GetBlogsQueryHandler
GetBlogDetailQueryHandler
FixBlogHtmlCommandHandler
GetHomeQueryHandler
  ↓
Store / Service / Repository
단, Java에서는 MediatR 같은 Dispatcher는 처음부터 안 써도 됨

C#에서는 이런 느낌이지.

await sender.Send(new GetBlogsQuery(...));

Java Spring에서는 처음부터 이렇게 해도 충분하다.

@RestController
@RequestMapping("/api/public/blogs")
public class BlogPublicController {

    private final GetBlogsQueryHandler getBlogsQueryHandler;

    public BlogPublicController(GetBlogsQueryHandler getBlogsQueryHandler) {
        this.getBlogsQueryHandler = getBlogsQueryHandler;
    }

    @GetMapping
    public PagedBlogsDto getBlogs(
            @RequestParam int page,
            @RequestParam int pageSize,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String searchMode
    ) {
        return getBlogsQueryHandler.handle(
            new GetBlogsQuery(page, pageSize, query, searchMode)
        );
    }
}

Handler:

@Service
public class GetBlogsQueryHandler {

    private final BlogQueryStore blogQueryStore;

    public GetBlogsQueryHandler(BlogQueryStore blogQueryStore) {
        this.blogQueryStore = blogQueryStore;
    }

    public PagedBlogsDto handle(GetBlogsQuery request) {
        int pageSize = Math.max(1, request.pageSize());
        int page = Math.max(1, request.page());

        String normalizedQuery = ContentSearchText.normalize(request.query());
        ContentSearchMode searchMode = ContentSearchMode.from(request.searchMode());

        return blogQueryStore.getPublishedPage(
            page,
            pageSize,
            normalizedQuery == null || normalizedQuery.isBlank() ? null : normalizedQuery,
            searchMode
        );
    }
}

이게 C# MediatR의 구조적 장점은 유지하면서, Java Spring스럽게 단순화한 방식이다.

Java 포팅 시 패키지 구조 추천

너의 현재 C# 구조를 Java로 옮기면 이런 식이 좋다.

com.woongblog
 ├─ api
 │   ├─ publicapi
 │   │   ├─ BlogPublicController.java
 │   │   ├─ WorkPublicController.java
 │   │   └─ HomeController.java
 │   │
 │   └─ admin
 │       ├─ BlogAdminController.java
 │       ├─ WorkAdminController.java
 │       └─ AiAdminController.java
 │
 ├─ application
 │   ├─ content
 │   │   ├─ blogs
 │   │   │   ├─ getblogs
 │   │   │   │   ├─ GetBlogsQuery.java
 │   │   │   │   └─ GetBlogsQueryHandler.java
 │   │   │   ├─ getblogdetail
 │   │   │   ├─ createblog
 │   │   │   ├─ updateblog
 │   │   │   └─ deleteblog
 │   │   │
 │   │   └─ works
 │   │
 │   ├─ composition
 │   │   └─ gethome
 │   │       ├─ GetHomeQuery.java
 │   │       └─ GetHomeQueryHandler.java
 │   │
 │   └─ ai
 │       ├─ blogfix
 │       │   ├─ FixBlogHtmlCommand.java
 │       │   └─ FixBlogHtmlCommandHandler.java
 │       └─ batchjobs
 │
 ├─ domain
 │   ├─ blog
 │   │   └─ Blog.java
 │   ├─ work
 │   │   └─ Work.java
 │   └─ site
 │
 └─ infrastructure
     ├─ persistence
     │   ├─ jpa
     │   ├─ query
     │   └─ store
     ├─ ai
     ├─ storage
     └─ security

핵심은 이거야.

application = 유스케이스
domain = 핵심 모델/규칙
infrastructure = DB, 외부 API, 파일, AI, R2, ffmpeg 같은 실제 구현
api = HTTP 입출력
C# → Java 매핑표
MediatR IRequest<T>
→ Java record Command / Query

IRequestHandler<TRequest, TResult>
→ @Service Handler with handle(...)

IBlogQueryStore
→ BlogQueryStore interface

BlogQueryStore EF 구현체
→ BlogQueryStoreImpl + JPA/QueryDSL/EntityManager

DbContext
→ JpaRepository / EntityManager / QueryDSL

Application project
→ application package/module

Infrastructure project
→ infrastructure package/module

Minimal API endpoint / Controller
→ @RestController

예를 들면:

public record GetBlogsQuery(...) : IRequest<PagedBlogsDto>;

Java:

public record GetBlogsQuery(
    int page,
    int pageSize,
    String query,
    String searchMode
) {
}

C#:

public class GetBlogsQueryHandler 
    : IRequestHandler<GetBlogsQuery, PagedBlogsDto>

Java:

@Service
public class GetBlogsQueryHandler {
    public PagedBlogsDto handle(GetBlogsQuery query) {
        ...
    }
}
언제 Service로 빼고, 언제 Handler에 둘까?

네 프로젝트 포팅 기준으로는 이렇게 잡으면 된다.

Handler에 둬도 되는 것
- page/pageSize 보정
- 검색어 normalize
- request → domain/entity 변환
- NotFound 체크
- 권한 체크 호출
- Store/Service 호출 순서 조립
- 결과 DTO 조립

현재 GetBlogsQueryHandler가 딱 이런 형태다. 검색어 normalize, searchMode 결정, queryStore 호출 정도를 Handler가 담당한다.

Service로 빼야 하는 것
- AI 호출
- HTML 수정/보정 로직
- slug 중복 생성
- 이미지 저장
- 비디오 인코딩
- R2/S3 업로드
- 권한 정책
- 복잡한 발행 정책
- 여러 Handler에서 반복되는 규칙

현재 FixBlogHtmlCommandHandler도 AI 수정 세부는 IBlogAiFixService에 맡긴다. 이 방향을 Java에서도 유지하면 된다.

Java에서 굳이 Mediator를 만들지 말라는 이유

Java Spring에서 이런 식으로 Dispatcher를 직접 만들 수도 있다.

commandBus.send(command);
queryBus.ask(query);

그런데 처음부터 이걸 만들면 오히려 복잡해질 수 있다.

Spring은 이미 DI가 강력해서 Controller가 Handler를 직접 주입받아도 충분하다.

좋은 시작점:
Controller → Handler 직접 호출

나중에 필요하면:
Controller → CommandBus / QueryBus → Handler

즉, Java 포팅 1차 목표는 이게 좋다.

MediatR 구조의 의도는 유지한다.
하지만 MediatR 자체를 흉내 내는 프레임워크는 당장 만들지 않는다.
추천하는 최종 방향

너의 Java Spring 포팅은 이렇게 가는 게 가장 좋다.

1. Controller는 HTTP 변환만 한다.
2. 유스케이스마다 CommandHandler / QueryHandler를 만든다.
3. 읽기와 쓰기 Store를 나눈다.
4. 복잡한 기능은 Service/Policy로 뺀다.
5. JPA Repository를 Controller나 Handler에 마구 노출하지 않는다.
6. 처음에는 CommandBus/Mediator 없이 Handler 직접 주입으로 시작한다.
7. Handler가 많아지고 공통 pipeline이 필요해지면 그때 CommandBus를 도입한다.

한 줄로 말하면:

네 프로젝트는 Spring에서도 CQRS 스타일로 포팅하는 게 맞다. 다만 Java에서는 MediatR 복제가 아니라 Controller → Handler/UseCase → Store/Service 구조로 단순하게 시작하는 게 좋다.