# Implementation Rules

**Source of truth**: `plans.md`

## Rules
1. Execute milestones in `plans.md` order.
2. Run each milestone's validation command before moving on.
3. If validation fails, stop and fix before proceeding.
4. Do not widen scope beyond secure auth/session hardening, CSRF, proxy handling, and related docs/tests.
5. If new work is discovered, add it to `plans.md` before implementation.
6. Preserve working routes and UX unless a documented security reason requires change.
7. Prefer backend-owned cookie-session auth; do not introduce browser-exposed JWT storage.
8. Use environment variables / secret manager inputs only for secrets.

## Scope Guard
- Do not redesign unrelated content features or admin UX beyond auth/CSRF integration needs.
- Do not add mobile/stateless token architecture unless explicitly required later.
- Do not hardcode secrets, client secrets, or production-only host/proxy assumptions.
- Do not leave GET-based state-changing auth semantics in place if a safer route is required.
