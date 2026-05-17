# Post-Refactor Quality Hardening for Woong Blog

## Goals
- Audit the **database/schema contract** so the ASP.NET Core + PostgreSQL model reflects what the frontend and backend actually read and write.
- Broaden automated validation around **C# backend logic**, especially auth/session, public query shaping, admin mutation paths, uploads, and failure handling.
- Add a concrete and locally safe plan for **backend load / stress / throughput checks** beyond the current DB smoke script.
- Expand **frontend page functional coverage** across admin/public pages so page-level regressions are caught after refactoring.
- Prove **C# -> DB -> frontend** integration with explicit end-to-end acceptance criteria instead of relying on isolated test layers only.
- Keep the verification model compose-first and grounded in the current `Next.js + ASP.NET Core + PostgreSQL + nginx` stack.

## Non-Goals
- Re-architecting the app again.
- Redesigning the public or admin UI.
- Switching auth providers or changing the storage model.
- Introducing heavy external load-testing infrastructure for the first hardening pass.
- Replacing the existing test stack; this effort should extend and organize it.

## Hard Constraints
- Validation commands must use real repo commands and be chained with `&&`.
- Main validation surfaces should remain `vitest`, dockerized `.NET` tests, `Playwright`, `db-load-smoke.sh`, and compose/nginx runtime checks.
- The supported verification runtime remains **compose-first**; `next dev` is not the final truth for auth/admin/upload verification.
- Broad testing work must stay reviewable: milestone-sized, rollback-safe, and acceptance-criteria driven.
- Any testability support code must remain within explicitly allowed files.
- The plan must cover both success paths and failure/silent-regression paths.

## Deliverables
- A DB/schema review and validation plan tied to `PortfolioDbContext`, entities, constraints, and seed behavior.
- A backend logic verification plan for auth/session, uploads, admin mutations, public query shaping, and validator behavior.
- A backend load/soak plan that is safe to run locally.
- A frontend page/functionality expansion plan covering public/admin breadth and critical detail pages.
- An end-to-end integration verification plan proving browser -> nginx -> ASP.NET Core -> PostgreSQL -> frontend readback.
- Updated documentation/runbook expectations for executing the quality sweep.

## Done When
- [ ] Schema/data-contract validation explicitly covers constraints, JSON fields, uniqueness, seed assumptions, and representative read/write round trips.
- [ ] Backend auth/session/upload/admin/public logic has milestone-level automated coverage goals with executable validation commands.
- [ ] A locally safe backend load-check path exists with clear limits and pass/fail expectations.
- [ ] Frontend browser/unit coverage explicitly names the pages and flows that must be green after the refactor.
- [ ] The quality sweep proves at least one full C# -> DB -> frontend read/write cycle for each major content surface.
- [ ] Ralph execution can proceed from this spec without guessing about scope, files, or verification evidence.
