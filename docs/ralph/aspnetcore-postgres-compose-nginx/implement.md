# Implementation Rules

**Source of truth**: `plans.md`

## Rules
1. Follow the milestone order in `plans.md`.
2. Implement in TDD order whenever automation is feasible: write or update the failing test first, then code, then rerun the test.
3. After every milestone, run its full Validation Commands.
4. If validation fails, stop and fix before moving on.
5. Do not broaden scope just because adjacent refactors look attractive.
6. Preserve current route structure and visible UI unless a milestone explicitly changes admin workflow chrome.
7. Use ASP.NET Core as the auth authority: login start, callback handling, session issuance, logout, and authorization checks live there.
8. Respect the routing split: `/api/auth/*` and application APIs live on ASP.NET Core, and asset delivery lives under `/media/*`.
9. Prefer HttpOnly cookie/session-based auth semantics rather than frontend-managed bearer tokens.
10. Treat PostgreSQL as the primary application data source from the start; use seed/mock data rather than waiting on full migration.
11. Use local volume-backed storage for uploaded assets unless a later task explicitly changes the storage provider.
12. Prefer explicit error states over silent null/empty fallbacks when a user could mistake missing data for success.
13. Reduce avoidable C# nullable usage in request/application surfaces whenever the flow can be modeled with concrete defaults or explicit validation.
14. Treat admin flows as the highest-priority regression surface; widen tests there before polishing lower-risk public paths.
15. If new work is discovered, add a new milestone to `plans.md` rather than smuggling it into the active one.

## Scope Guard
> Do not skip tests to move faster. Do not keep Supabase as the primary app database path. Do not let the frontend become the long-lived auth/session owner. Do not redesign the public site. Do not rewrite editors unless the active milestone is the admin workspace consolidation milestone. Do not bypass Nginx/Compose requirements by keeping ad-hoc local-only runtime assumptions.
