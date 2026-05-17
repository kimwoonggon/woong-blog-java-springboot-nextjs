# Implementation Rules

**Source of truth**: `plans.md`

## Rules
1. Execute milestones in `plans.md` order.
2. Run each milestone validation command before moving on.
3. Stop immediately on validation failure and fix before proceeding.
4. Treat the Notion-like admin surface as a staged product feature, not a blanket rewrite of all admin pages in one shot.
5. Solve density/navbar/admin-friction issues before or alongside the larger Notion-view feature so small UX wins are not blocked.
6. Preserve the distinction between “modernized now” and “deferred future capability”.
7. Do not promise member-management capability without the supporting backend/API work.

## Scope Guard
- Do not rebuild auth, CQRS, or the editor engine from scratch.
- Do not claim generic file/code upload if only code blocks/embeds are actually supported.
- Do not merge unrelated product features into this modernization pass.
