# Woong Blog

## Introduction

Woong Blog is a personal portfolio and publishing application for presenting works, study notes, media-rich project pages, and profile content.

The project is built as a split-stack web application: a Next.js public/admin frontend, a Spring Boot API backend, PostgreSQL persistence, and Docker-based runtime packaging.

## Technology Stack

- **Frontend:** Next.js 16, React, TypeScript, App Router, Tailwind CSS
- **Backend:** Spring Boot 3.5, Java 21, Maven
- **Database:** PostgreSQL 16
- **Runtime:** Docker Compose, nginx
- **Authentication:** Backend-owned HttpOnly cookie sessions with CSRF protection
- **Media:** Backend-owned upload, storage, and public media serving
- **Testing:** Playwright, Vitest, JUnit 5, MockMvc, Testcontainers
- **CI/CD:** GitHub Actions and GHCR image publishing

## Architecture

The application uses a browser-to-nginx entrypoint.

```text
Browser
  -> nginx
    -> Next.js frontend
    -> Spring Boot API
      -> PostgreSQL
      -> media storage
```

Runtime responsibilities are split clearly:

- **nginx** routes frontend pages, API traffic, and media requests.
- **Next.js** owns public pages, admin UI, server-rendered views, and client interactions.
- **Spring Boot** owns authentication, admin mutations, public APIs, uploads, media serving, and persistence boundaries.
- **PostgreSQL** stores content, settings, users, and media metadata.
- **Docker Compose** defines the local, staging, and production-like runtime shape.

The repository keeps `dev` as the integration branch and `main` as the production branch.

Release flow:

- `CI Dev` validates changes on `dev`.
- A successful `dev` run refreshes `release/main-promote` and ensures a promotion PR to `main` exists.
- That promotion PR is marked for auto-merge, so `CI Main Runtime` on the `main`-targeted PR becomes the release gate.
- When the promotion PR checks pass and repository merge rules allow it, GitHub merges it into `main`.
- `main` is not pushed directly from `dev`; it advances through the promotion PR path.
- A merge to `main` triggers `CI Main Runtime` and `Publish GHCR Main`.
- The promotion workflow depends on the repository secret `PROMOTION_TOKEN` so its branch updates and PR mutations can trigger downstream GitHub Actions normally.

## License

This project is proprietary.

Copyright (c) 2026 Woonggon Kim. All rights reserved.

See [LICENSE](./LICENSE) for the full license terms.
