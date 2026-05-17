# Spring Backend Migration

## Purpose

Replace the previous ASP.NET Core API behind the existing Next.js app with a Java 21 / Spring Boot 3.5 backend while preserving the browser-visible `/api/*` and `/media/*` contract, Docker/nginx topology, PostgreSQL persistence, and test discipline.

## Current Implementation

- Backend stack: Java 21, Spring Boot `3.5.9`, Maven wrapper, Spring MVC, Spring Security, Validation, JDBC/JPA starter, Flyway, PostgreSQL, Actuator, JUnit 5, MockMvc, Testcontainers, JaCoCo.
- Runtime shape: frontend still calls `INTERNAL_API_ORIGIN=http://backend:8080`; nginx still proxies `/api/*` and `/media/*` to the backend.
- Database ownership: Flyway creates the current PostgreSQL schema for content, auth sessions, media/assets, work videos, AI batch jobs, diagnostics, and page views.
- Runtime image: `backend/Dockerfile` builds a Spring Boot jar on Java 21 and preserves operational tools from the old backend image: `ffmpeg`, `ffprobe`, Node/npm, Codex CLI, and k6.

## Architecture Direction

The Java port should preserve the intent of the C# MediatR structure without adding a Java mediator framework up front.

Target flow:

```text
Spring @RestController
  -> CommandHandler / QueryHandler or UseCase
  -> CommandStore / QueryStore / Domain Service
  -> JDBC/JPA/QueryDSL/external API/storage/ffmpeg/Codex/R2
```

This keeps the useful CQRS boundaries:

- Controllers translate HTTP into command/query records only.
- Handlers own use-case flow: paging normalization, search-mode selection, not-found checks, store/service orchestration, and DTO assembly.
- Stores own persistence-specific reads/writes.
- Services own external or complex behavior such as AI, storage, slug policy, video processing, authorization policy, and provider integration.

Do not introduce a `CommandBus`, `QueryBus`, or mediator library unless repeated cross-cutting pipeline concerns appear. Direct Spring constructor injection of handlers is the current default.

## Current CQRS Porting State

- Content public/admin HTTP routes now use application handlers under `com.woongblog.application.content`, `application.site`, and `application.composition`.
- AI routes now use command/query handlers under `application.ai`; the handlers delegate provider/runtime details to `AiService`.
- Work-video/media routes now use command handlers and `WorkVideoStore` under `application.media`; the controller no longer owns JDBC or media orchestration.
- `ContentService` currently acts as the JDBC-backed adapter implementing query/command store interfaces. This is intentional as a safe migration step; it preserves verified SQL behavior while moving HTTP flow to handlers.
- Follow-up refactors should split the adapter physically into feature stores, for example `JdbcBlogQueryStore`, `JdbcBlogCommandStore`, `JdbcWorkQueryStore`, and `JdbcSiteSettingsStore`.

Example mapping:

| ASP.NET Core | Spring Boot |
|---|---|
| `IRequest<T>` | Java `record` command/query |
| `IRequestHandler<TRequest,TResult>` | `@Service` handler with `handle(...)` |
| `IBlogQueryStore` | `BlogQueryStore` interface |
| EF store implementation | JDBC/JPA/QueryDSL store implementation |
| Minimal API endpoint/controller | `@RestController` |

## Route Contract To Preserve

Public read endpoints:

- `GET /api/health`
- `GET /api/public/home`
- `GET /api/public/site-settings`
- `GET /api/public/resume`
- `GET /api/public/pages/{slug}`
- `GET /api/public/blogs`
- `GET /api/public/blogs/{slug}`
- `GET /api/public/blogs/{slug}/context`
- `GET /api/public/works`
- `GET /api/public/works/{slug}`
- `GET /api/public/works/{slug}/context`

Auth/admin/media/AI/diagnostics endpoints:

- `GET /api/auth/login`, `GET /api/auth/test-login`, `GET /api/auth/session`, `GET /api/auth/csrf`, `POST /api/auth/logout`
- `GET /api/admin/dashboard`, members, pages, site settings, blogs CRUD, works CRUD
- `POST /api/uploads`, `DELETE /api/uploads`, `GET /media/*`
- Work video upload-url/upload/confirm/hls-job/youtube/order/delete routes
- AI runtime config, blog/work fix, batch job create/list/get/apply/cancel/delete routes
- Load-test diagnostic compatibility routes

## Behavior Notes

- Public list payloads use `{ items, page, pageSize, totalItems, totalPages }`.
- Public missing detail records return `404`; frontend clients convert expected detail `404`s to `null`.
- Admin work detail still exposes required legacy snake_case fields such as `all_properties`, `thumbnail_asset_id`, `icon_asset_id`, `thumbnail_url`, `icon_url`, and `videos_version`.
- Authenticated mutations require the HttpOnly auth cookie plus CSRF header. Missing/stale CSRF currently returns `400`, which the frontend can refresh and retry.
- `GET /api/auth/login` starts Google OAuth2 login when Spring Security Google client registration is configured; the OAuth success handler issues the same backend-owned auth cookie and DB session used by local test-login.
- `/media/*` URLs must stay stable through nginx and local storage/R2-compatible paths.

## Tests And Verification

Backend tests:

```bash
cd backend
./mvnw test
./mvnw verify
```

Dockerized Java 21 test path used in this workspace:

```bash
docker run --rm --network wb-spring-test \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://wb-spring-test-db:5432/portfolio \
  -e SPRING_DATASOURCE_USERNAME=portfolio \
  -e SPRING_DATASOURCE_PASSWORD=portfolio \
  -v "$PWD/backend:/workspace" \
  -w /workspace \
  --entrypoint ./mvnw \
  woong-blog-springboot-backend-buildcheck:local \
  -q -Dtestcontainers.enabled=false test
```

Focused test strategy:

- Unit tests for handlers and policies.
- MockMvc integration tests for public, auth/CSRF, admin mutation, and work-video contracts.
- PostgreSQL-backed Flyway tests for schema and persistence behavior.
- Compose/browser smoke before production cutover.

Final backend verification performed in Docker:

- Java 21 compile through the backend Maven wrapper.
- Full Maven test suite against a clean `postgres:16-alpine` container with Flyway migrations.
- Backend image build as `woong-blog-springboot-backend:local`.
- Dev, prod, and staging compose config rendering.
- Runtime smoke for `GET /api/health`, public home/blog reads, OAuth login misconfiguration returning `503`, test login/session/CSRF, and authenticated `GET /api/admin/members`.

## Git Flow And CI

The Java repository target is `kimwoonggon/woong-blog-java-springboot-nextjs`. CI keeps the same branch flow as the previous C# backend repository:

- `CI Dev` runs for `dev`, `feature/**`, and pull requests into `dev`.
- Successful `CI Dev` can publish `:dev` runtime images and prepare a `release/main-promote` PR into `main`.
- `CI Main Runtime` validates `main` and pull requests into `main`.
- Successful `CI Main Runtime` can publish `:main`, `:latest`, and SHA-tagged runtime images.
- Production redeploy pulls `ghcr.io/kimwoonggon/woong-blog-java-springboot-nextjs-runtime-{frontend,backend}:main`.

The branch choreography is intentionally C#-compatible, but backend CI steps are now Java 21/Maven-based rather than .NET-based.

## Remaining Parity Caveats

- Google OAuth2 callback support exists through Spring Security OAuth2 Login, but production requires real Google client secrets and redirect URI configuration.
- AI/Codex and HLS behavior is deterministic compatibility behavior first, not the full long-running external provider pipeline.
- Full Playwright browser parity still needs to run against the final compose stack.
- Historical docs under `docs/ralph/**` still describe the previous ASP.NET Core migration history and are kept as historical artifacts.
