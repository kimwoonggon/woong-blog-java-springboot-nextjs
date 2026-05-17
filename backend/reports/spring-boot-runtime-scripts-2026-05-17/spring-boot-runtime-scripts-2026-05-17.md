# Spring Boot Runtime Scripts Audit - 2026-05-17

## Summary

Updated Docker/runtime scripts/docs for the Spring Boot backend migration without editing Java source. Backend Compose services now use Spring Boot environment variables (`SPRING_PROFILES_ACTIVE`, `SERVER_PORT`, `SPRING_DATASOURCE_*`, Hikari pool env) and retain production/staging secure-cookie and HTTPS-related flags as env-only settings.

Added `backend/Dockerfile` as a Java 21 multi-stage Maven-wrapper build and runtime image. The runtime image preserves `ffmpeg`, Node 20, Codex CLI, and k6 tooling.

Replaced backend helper scripts that referenced `dotnet`, `.csproj`, `WoongBlog.sln`, or `ASPNETCORE_*` with Maven wrapper and Spring Boot equivalents where safe. Added `backend/TESTING.md` with Maven, Docker, JUnit tag, and Testcontainers commands.

## Intentionally Not Changed

- No Java source files were edited.
- No Spring security, CSRF, cookie, controller, persistence, or Testcontainers Java configuration was changed.
- No frontend code was edited.
- No secrets or credentials were added to repository files.
- No full compose stack was started; validation used compose config rendering and Docker image builds.

## Goal Verification

- Docker/runtime ownership respected: yes.
- Spring Boot env names in backend services: yes.
- Docker Java 21 build/runtime: yes.
- Maven wrapper scripts: yes.
- Secure-cookie/HTTPS expectations preserved for production/staging env: yes.
- Env-only secrets preserved: yes.
- Testcontainers/JUnit command documentation added: yes.
- Java source untouched: yes.

## Validations Performed

- `npx skills find "spring boot docker testing"`
- Read Spring Boot skills:
  - `.agents/skills/java-springboot/SKILL.md`
  - `.agents/skills/springboot-security/SKILL.md`
  - `.agents/skills/springboot-tdd/SKILL.md`
  - `.agents/skills/spring-boot-test-patterns/SKILL.md`
- `bash -n` on patched shell scripts.
- Grep check for stale runtime names in touched surfaces: no matches for `ASPNETCORE`, `ConnectionStrings__`, `dotnet`, `WoongBlog.sln`, `.csproj`, `Auth__`, or `LoadTesting__BaseUrl`.
- Compose config rendered successfully:
  - `docker-compose.dev.yml`
  - `docker-compose.prod.yml`
  - `docker-compose.staging.yml`
- `docker build --target build -f backend/Dockerfile -t woong-blog-backend-buildcheck:local .`
- `docker build -f backend/Dockerfile -t woong-blog-backend-runtimecheck:local .`
- Runtime tool checks from built image:
  - Node `v20.20.2`
  - ffmpeg `4.4.2-0ubuntu0.22.04.1`
  - k6 `v2.0.0`
  - Codex CLI `0.130.0`

## Risks And Yellow Flags

- Host `./backend/mvnw -f backend/pom.xml test` failed because the local Java installation does not support release 21. The Docker Java 21 build succeeded.
- Suite-specific scripts use Maven/JUnit group names (`unit`, `component`, `integration`, `architecture`, `contract`). They will only select tests once corresponding JUnit tags exist.
- `run-backend-coverage.sh` expects JaCoCo Maven reporting. The current `pom.xml` appears to invoke JaCoCo during build, but report path behavior should be confirmed when coverage gates are finalized.
- Codex CLI emitted a warning when run without a mounted/existing `CODEX_HOME`; compose still mounts `/root/.codex`, which should satisfy normal runtime usage.

## Recommendation

Proceed with these runtime/docs changes. Before relying on suite filters in CI, add/confirm JUnit tags and run Maven tests on Java 21 or inside the backend Docker build environment.
