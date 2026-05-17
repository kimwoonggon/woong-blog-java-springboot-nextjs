# Spring Backend Migration Docs Audit - 2026-05-17

## Summary

Created backend migration planning documentation for replacing the ASP.NET Core backend with Spring Boot while preserving the current Next.js route and payload contract.

## Changed

- Added `docs/spring-backend-migration.md` with route groups, behavior notes, migration sequencing, verification commands, and remaining parity caveats.
- Added `todolist-2026-05-17.md` with mapped user instructions, completed planning TODOs, verification notes, and follow-up migration TODOs.
- Added this persistent audit report.
- Updated the migration docs and TODOs to reflect the requested Spring Boot skills: feature package structure, constructor injection, DTO boundaries, MockMvc/Testcontainers/JUnit tags, and JaCoCo.

## Intentionally Not Changed

- No Java production or test source was modified.
- No frontend source was modified.
- No Docker, compose, CI, or runtime configuration was modified.
- No Spring endpoint implementation was attempted.

## Goal Verification

- Backend docs/tests planning only: satisfied.
- Do not modify Java source: satisfied.
- Base docs on `instructions.md` and current route contract: satisfied by reviewing migration instructions and frontend API client/test route usage.
- Include verification commands and parity caveats: satisfied in `docs/spring-backend-migration.md`.
- List changed paths in final response: pending final response.

## Validations Performed

- `npx skills find spring boot migration documentation`
- Reviewed `instructions.md`.
- Reviewed current frontend API client contract under `src/lib/api/`.
- Reviewed compose API origin/media settings in `docker-compose*.yml`.
- Reviewed Spring skeleton dependencies in `backend/pom.xml`.
- Reviewed `.agents/skills/java-springboot/SKILL.md`.
- Reviewed `.agents/skills/springboot-tdd/SKILL.md`.
- Reviewed `.agents/skills/spring-boot-test-patterns/SKILL.md`.
- Verified the target documentation files did not already exist before creation.
- Read back the created Markdown/TODO artifacts.
- Confirmed generated audit artifact paths exist.

## Risks And Follow-Up

- The route list is based on static repo inspection and current frontend/test usage, not live ASP.NET Core HTTP snapshots.
- AI, HLS/media processing, load-test diagnostics, and mixed work-video field casing need explicit contract fixtures before implementation.
- Current Spring backend remains a skeleton, so no runtime parity can be claimed yet.
- JaCoCo and JUnit tag configuration are documented as migration requirements, but no Maven or Java test configuration was changed in this docs-only task.

## Recommendation

Use `docs/spring-backend-migration.md` as the migration control document, then make the first implementation PR a contract-freeze/test PR before adding Spring route behavior.
