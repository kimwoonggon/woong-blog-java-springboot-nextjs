# Work Video CQRS Refactor Audit - 2026-05-17

## Summary

Refactored `WorkVideoController` so admin work-video endpoints now delegate to explicit command handlers in `com.woongblog.application.media`. Added record commands for upload URL issuance, multipart upload, upload confirmation, HLS job creation, YouTube attachment, reorder, and delete flows.

Added a small `WorkVideoStore` abstraction with `JdbcWorkVideoStore` for upload-session persistence and current video version reads. Existing `ContentService` and `MediaService` remain the behavior owners for video mutation and media writes.

## Changed

- Added work-video command records and Spring `@Service` handlers under `backend/src/main/java/com/woongblog/application/media/`.
- Added `WorkVideoStore`, `JdbcWorkVideoStore`, `WorkVideoUploadSession`, and `WorkVideoUploadSessionDraft`.
- Refactored `backend/src/main/java/com/woongblog/media/WorkVideoController.java` into a thin HTTP-to-command mapper.
- Added `backend/src/test/java/com/woongblog/application/media/WorkVideoCommandHandlersTest.java` covering all new handlers.
- Updated `todolist-2026-05-17.md` with the required plan, instruction mapping, backup note, verification results, and post-work status.

## Intentionally Not Changed

- No AI files were modified.
- `ContentService.java` and `MediaService.java` behavior and signatures were not changed.
- Endpoint paths, request parameter names, multipart usage, and JSON response key shapes were preserved.
- No Mediator or dispatcher library was introduced.
- No database schema or migration files were changed.

## Goal Verification

- Controller -> handler boundary: passed. `WorkVideoController` no longer references `JdbcTemplate`, `ContentService`, or `MediaService` directly.
- Handler -> store/service boundary: passed. Upload-session SQL moved to `JdbcWorkVideoStore`; media writes and video mutations remain delegated to existing services.
- Behavior preservation: passed by focused handler tests for upload URL, upload, confirm, HLS, YouTube, reorder, and delete flows.
- Scope control: passed. Production changes are limited to `application/media/**` and `WorkVideoController.java`; tests were added under the matching application media slice.

## Validations

- `./mvnw -q -Dtest=WorkVideoCommandHandlersTest test`
  - Result: failed before compilation on the host because local Java is 17 and the backend requires Java 21.
- `DOCKER_CONFIG=/tmp/codex-docker-config docker run --rm --user 1000:1000 -e MAVEN_CONFIG=/tmp/.m2 -v /home/kimwoonggon/.m2:/tmp/.m2 -v /mnt/d/woong-blog-springboot-nextjs:/workspace -w /workspace/backend maven:3.9-eclipse-temurin-21 ./mvnw -q -Dtest=WorkVideoCommandHandlersTest test`
  - Result: passed, 5 tests.
- `DOCKER_CONFIG=/tmp/codex-docker-config docker run --rm --user 1000:1000 --network wb-spring-test -e MAVEN_CONFIG=/tmp/.m2 -e SPRING_DATASOURCE_URL=jdbc:postgresql://wb-spring-test-db:5432/portfolio -e SPRING_DATASOURCE_USERNAME=portfolio -e SPRING_DATASOURCE_PASSWORD=portfolio -v /home/kimwoonggon/.m2:/tmp/.m2 -v /mnt/d/woong-blog-springboot-nextjs:/workspace -w /workspace/backend maven:3.9-eclipse-temurin-21 ./mvnw -q -Dproject.build.directory=/tmp/wb-work-video-cqrs-target-20260517 -Dtestcontainers.enabled=false -Dtest=BackendApplicationTests,WorkVideoCommandHandlersTest test`
  - Result: passed. This also verified Spring bean wiring with an isolated Maven build directory.
- `rg -n "JdbcTemplate|ContentService|MediaService" backend/src/main/java/com/woongblog/media/WorkVideoController.java`
  - Result: no matches.

## Risks And Follow-Ups

- The HLS endpoint remains a deterministic compatibility implementation that writes a minimal playlist and VTT file; this refactor intentionally did not expand transcoding behavior.
- Maven verification needs Java 21. The host shell has Java 17, so Java 21 checks were run in Docker.
- During verification, shared `backend/target` was affected by concurrent work in other slices. The final passing context check used an isolated `/tmp` build directory to avoid cross-worker target churn.

## Recommendation

Accept the work-video/media CQRS refactor. The next useful step is a full compose-backed API or Playwright smoke run once the broader backend slices are stable.
