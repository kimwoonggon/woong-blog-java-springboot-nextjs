# Implementation Rules

**Source of truth**: `plans.md`

## Rules
1. Execute milestones in `plans.md` order.
2. Run the milestone validation command before moving to the next milestone.
3. Stop immediately on validation failure and fix before proceeding.
4. Keep the refresh focused on UI consistency, authoring UX, responsive behavior, and publish/upload simplification.
5. Add new milestones to `plans.md` before widening scope.
6. Prefer design-system reuse, stable layout primitives, and deletion/simplification over bespoke one-off styling.
7. Do not claim a UX fix is complete without browser-level evidence on real public/admin flows.
8. Preserve current data contracts unless a milestone explicitly includes the supporting action/API change.

## Scope Guard
- Do not redesign unrelated navigation, auth, or backend architecture.
- Do not introduce a large new CMS workflow beyond the scoped publish/upload UX decisions.
- Do not add speculative animation-heavy behavior that makes responsive layout less predictable.
- Do not remove existing admin/public capabilities just to simplify the UI.
