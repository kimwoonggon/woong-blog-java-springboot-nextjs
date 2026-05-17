# AI CQRS Refactor Audit - 2026-05-17

## Summary

Refactored the Spring Boot AI HTTP path from direct `AiController -> AiService` calls into `AiController -> command/query handlers -> AiService`, without adding a Mediator library and without changing `AiService` behavior.

## Changed

- Added CQRS-style command/query records and handler beans under `backend/src/main/java/com/woongblog/application/ai/`.
- Updated `backend/src/main/java/com/woongblog/ai/AiController.java` to constructor-inject handler beans and call `handle(...)` for every AI endpoint.
- Added focused tests:
  - `backend/src/test/java/com/woongblog/application/ai/AiApplicationHandlersTests.java`
  - `backend/src/test/java/com/woongblog/ai/AiControllerCqrsWebMvcTests.java`
- Updated `todolist-2026-05-17.md` with the scoped plan, instruction mapping, backup evidence, and validation results.

## Intentionally Not Changed

- `backend/src/main/java/com/woongblog/ai/AiService.java` was not changed.
- No Mediator, dispatch bus, or third-party CQRS dependency was introduced.
- No endpoint paths, HTTP methods, request JSON field names, or response map keys were intentionally changed.
- No frontend files, Docker files, database migrations, or non-AI backend modules were changed.

## Goal Verification

- Controller no longer injects `AiService` directly.
- Each AI endpoint now maps to a command/query and handler.
- Handlers keep `private final` service dependencies and constructor injection.
- Handlers delegate to the existing service/store behavior in `AiService`.
- Request compatibility is preserved by command records with the same JSON field names as the previous service request records.
- Legacy `/api/admin/ai/blog-fix-batch` still returns `{ "results": ..., "applied": ... }`.
- Missing request body behavior for `POST /api/admin/ai/blog-fix-batch-jobs/{jobId}/apply` is preserved by mapping it to a command with null `jobItemIds`.

## Validations

- Skill guidance:
  - Read local `java-springboot` skill.
  - Read local `springboot-tdd` skill.
  - Ran `npx skills find "spring boot cqrs tdd"`; found a matching public `springboot-tdd` skill, but used the already available local skill.
- Backup:
  - Backed up `AiController.java` and `AiService.java` under `.agent-backups/2026-05-17-ai-cqrs-refactor/`.
- TDD red attempt:
  - `./mvnw -q -Dtest=AiApplicationHandlersTests test`
  - Result: failed before test compilation because local Java is 17 and project requires Java 21.
- Java 21 targeted tests:
  - `docker run --rm -v /mnt/d/woong-blog-springboot-nextjs/backend:/workspace -v /home/kimwoonggon/.m2:/root/.m2 -w /workspace maven:3.9.9-eclipse-temurin-21 mvn -q -Dtest=AiApplicationHandlersTests,AiControllerCqrsWebMvcTests test`
  - Result: passed.
- Architecture checks:
  - `rg -n "AiService" backend/src/main/java/com/woongblog/ai/AiController.java`
  - Result: no matches.
  - `rg -n "Mediator|MediatR" backend/src/main/java/com/woongblog/application/ai backend/src/main/java/com/woongblog/ai/AiController.java`
  - Result: no matches.
  - `cmp -s backend/src/main/java/com/woongblog/ai/AiService.java .agent-backups/2026-05-17-ai-cqrs-refactor/backend/src/main/java/com/woongblog/ai/AiService.java`
  - Result: identical.

## Risks And Follow-Ups

- The controller constructor now has many handler dependencies. This is explicit and matches the requested no-mediator CQRS style, but future expansion may justify grouping by endpoint family if the AI surface grows further.
- Full backend integration tests and browser Playwright tests were not run for this narrow backend refactor.
- Local non-Docker Maven verification is blocked until the local shell uses Java 21.

## Final Recommendation

Keep this refactor as-is. The AI controller boundary now follows the requested CQRS-style path, the service behavior remains unchanged, and targeted Java 21 tests cover handler delegation plus controller JSON binding for the changed path.
