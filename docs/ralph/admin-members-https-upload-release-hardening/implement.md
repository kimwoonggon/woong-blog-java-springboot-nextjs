# Implementation Rules

**Source of truth**: `plans.md`

## Rules
1. Execute milestones in `plans.md` order.
2. Run each milestone validation command before moving on.
3. Stop immediately on validation failure and fix before proceeding.
4. Keep the members feature read-only unless a later milestone explicitly expands scope.
5. Treat push safety as a release gate: do not upload secrets, local certs, caches, storage-state files, or unrelated WIP.
6. Verify HTTPS upload fixes on `https://localhost`, not just on HTTP.
7. Preserve the current upload/auth/CQRS architecture unless a narrow bug fix requires touching an adjacent boundary.

## Scope Guard
- Do not add member edit/delete/role-management actions in this pass.
- Do not expose raw session keys, provider subjects, IP addresses, cookies, tokens, or security-sensitive datasets.
- Do not skip the final release/push readiness gate.
- Do not push to `origin` before every validation command is green.
