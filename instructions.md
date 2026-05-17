  # ASP.NET Core 백엔드의 Spring Boot 전환 수행 계획

  ## Summary

  - 목표는 Next.js 프론트 기능을 유지한 채 dev 브랜치의 ASP.NET Core 백엔드를 Spring Boot로 교체하는 것이다.
  - 전환 방식은 “API 계약 고정 → Java 테스트 선작성 → Spring 구현 → 기존 C#/프론트 테스트와 대조” 순서로 진행한다.
  - 기준 스택은 Java 21 LTS, Spring Boot 3.5.x 최신 패치 라인, Maven wrapper, PostgreSQL, Flyway, JUnit 5, MockMvc, Testcontainers, Ja
    CoCo로 한다. Spring 공식 문서는 현재 stable 라인으로 4.0.6과 3.5.14를 함께 제공하지만, 설치된 skill과 안정성을 위해 3.5.x를 선택한
    다. Source: https://docs.spring.io/spring-boot/reference/index.html
  - 기존 /api/*, /media/*, cookie/BFF auth, CSRF, PostgreSQL 데이터, Playwright/Pact 계약은 깨뜨리지 않는다.

  ## Key Changes

  - backend/ 아래 Spring Boot 프로젝트를 새로 구성하고, 기존 .NET 백엔드는 전환 완료 전까지 비교 기준으로 유지한다.
  - Maven multi-module은 쓰지 않고 단일 Spring Boot app으로 시작한다. package는 feature 기준으로 둔다:
      - content.blogs
      - content.works
      - content.pages
      - site
      - identity
      - media
      - ai
      - diagnostics
      - common
  - Spring Boot 설정:
      - server.port=8080
      - server.forward-headers-strategy=framework
      - spring.jpa.hibernate.ddl-auto=validate
      - Flyway가 schema ownership을 가진다.
      - /app/media는 유지한다.
  - Docker/compose 계약:
      - service name backend 유지
      - internal port 8080 유지
      - INTERNAL_API_ORIGIN=http://backend:8080 유지
      - nginx의 /api/, /media/ proxy 유지
  - env 치환:
      - ASPNETCORE_ENVIRONMENT → SPRING_PROFILES_ACTIVE
      - ASPNETCORE_URLS → SERVER_PORT=8080
      - ConnectionStrings__Postgres → SPRING_DATASOURCE_URL, SPRING_DATASOURCE_USERNAME, SPRING_DATASOURCE_PASSWORD
      - Npgsql pool 옵션 → Hikari pool 옵션

  ## Implementation Plan

  - Phase 0: Contract freeze
      - ASP.NET 백엔드를 기준 서버로 실행한다.
      - public API, auth/session/CSRF, admin CRUD, upload/video, AI fake-provider 응답을 HTTP snapshot 또는 Pact/JSON fixture로 고정한
        다.
      - volatile field는 createdAt, elapsed headers, generated ids처럼 명시된 필드만 ignore한다.
  - Phase 1: Spring skeleton
      - Maven wrapper, Spring Boot app, profiles, health endpoint, global error handler, JSON naming policy, security headers filter를
        만든다.
      - 첫 테스트는 /api/health, anonymous /api/auth/session, security headers, forwarded headers 동작부터 작성한다.
  - Phase 2: Database migration
      - 기존 PostgreSQL schema를 Flyway baseline으로 옮긴다.
      - quoted PascalCase table/column, jsonb, text[], pg_trgm, GIN/trigram index, unique/cascade 제약을 그대로 보존한다.
      - SchemaPatches는 읽기 호환만 유지하고 신규 변경은 Flyway로만 관리한다.
  - Phase 3: Public read APIs
      - /api/public/site-settings, /resume, /pages/{slug}, /blogs, /blogs/{slug}, /blogs/{slug}/context, /works, /works/{slug}, /works/
        {slug}/context, /home 순서로 구현한다.
      - Pact provider와 Playwright public smoke가 통과해야 다음 phase로 간다.
  - Phase 4: Auth/Admin
      - Spring Security로 Google OIDC, cookie session, DB-backed AuthSession, admin email role mapping, logout, local test-login을 구현
        한다.
      - /api/auth/csrf는 { requestToken, headerName }을 반환하고, mutation의 missing/invalid CSRF는 기존처럼 400을 반환한다.
      - admin dashboard, members, pages/site settings, blogs/works CRUD 순서로 구현한다.
  - Phase 5: Media/Work Video
      - POST /api/uploads, DELETE /api/uploads?id=..., /media/* serving, R2/local fallback을 구현한다.
      - Work video는 HLS flow를 우선한다: hls-job, YouTube add, reorder, delete, videosVersion optimistic check.
      - ffmpeg/ffprobe, master.m3u8, VTT/sprite, cleanup worker를 기존 동작과 맞춘다.
  - Phase 6: AI/Diagnostics/Load test
      - AI runtime-config, blog-fix, batch jobs, Codex CLI, OpenAI/Azure OpenAI provider, timeout/allowed model validation을 구현한다.
      - real load-test endpoints와 k6 runner를 Spring service로 옮긴다.
      - X-App-Elapsed-Ms, X-Db-Command-Elapsed-Ms, X-Db-Command-Count는 유지하거나 preflight 스크립트와 함께 명시적으로 변경한다.
  - Phase 7: CI/cutover
      - dotnet test jobs를 Maven/JUnit tag jobs로 교체한다.
      - Dockerfile은 Java runtime으로 교체하되 ffmpeg, node, codex, k6가 필요한 phase까지 유지한다.
      - Spring-backed compose stack에서 Pact, Playwright core, auth/admin smoke, runtime preflight를 통과하면 ASP.NET 백엔드를 제거한
        다.

  ## TDD And Test Plan

  - 모든 기능은 Red → Green → Refactor 순서로 진행한다.
  - 기존 C# 테스트가 있는 기능은 Java 구현 전에 동등한 Java 테스트를 먼저 만든다.
  - 기존 C# 테스트가 부족한 기능은 구현 전에 characterization test를 추가한다.
  - JUnit tags:
      - @Tag("unit"): pure domain/service/helper
      - @Tag("web"): @WebMvcTest, controller/filter/error response
      - @Tag("component"): service + repository fake/external fake
      - @Tag("integration"): @SpringBootTest + PostgreSQL Testcontainers
      - @Tag("contract"): Pact provider
  - 필수 테스트 시나리오:
      - public list/detail pagination, search, 404/null semantics
      - admin anonymous 401, non-admin 403, admin success
      - CSRF missing 400, valid token success, retry after stale token
      - PostgreSQL migration idempotence, indexes, jsonb, cascade, unique constraints
      - media upload validation: bucket, size, MIME, extension, MP4 ftyp
      - work video optimistic version conflict, reorder collision avoidance, HLS cleanup
      - existing Playwright public/auth/admin smoke with Spring backend
  - JaCoCo gate:
      - 초기에는 line coverage hard gate보다 parity gate를 우선한다.
      - Phase 4 이후 Java backend 전체 80% 라인을 목표로 하고, public/auth/admin 핵심 패키지는 branch coverage를 별도로 본다.

  ## Assumptions

  - Spring Boot는 3.5.x를 사용한다. 4.x는 stable이지만 이번 전환에서는 리스크가 더 크므로 제외한다.
  - 빌드 도구는 Maven wrapper로 고정한다.
  - 프론트 API 경로와 payload shape는 변경하지 않는다.
  - JWT 전환은 하지 않는다. 기존 cookie/BFF + CSRF 계약을 유지한다.
  - 운영 DB는 그대로 유지하고, destructive migration은 금지한다.
  - 기존 C# 백엔드는 Spring parity가 증명될 때까지 비교 기준으로 남긴다.