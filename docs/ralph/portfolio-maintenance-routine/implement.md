# Implementation Rules

**Source of truth**: `plans.md`

## Rules
1. Execute maintenance milestones in `plans.md` order.
2. Use `portfolio-maintenance` first for narrow issues before expanding scope.
3. If the issue touches 3+ surfaces or has unclear acceptance criteria, re-plan before implementation.
4. Stop immediately on validation failure and fix before moving on.
5. Treat auth/upload/member/HTTPS changes as security-sensitive by default.
6. Do not push maintenance branches before the release gate is green.
7. Keep maintenance brownfield-first and verification-heavy.

## Scope Guard
- Do not broaden routine maintenance into architecture rewrites.
- Do not add new dependencies as part of standard maintenance.
- Do not treat build-only success as enough for admin/upload/auth/runtime work.
- Do not upload local secrets, certs, runtime artifacts, or storage-state files.
