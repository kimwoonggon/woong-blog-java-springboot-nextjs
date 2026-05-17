# Implementation Rules

**Source of truth**: `plans.md`

## Rules
1. Execute milestones in `plans.md` order.
2. Run each milestone validation command before moving on.
3. Stop immediately on validation failure and fix before proceeding.
4. Keep the work focused on modern reading/authoring UX, not unrelated product expansion.
5. Prefer reuse of existing editor capabilities over inventing unsupported features and pretending they already exist.
6. Be explicit about capability boundaries: “supported”, “supported but hidden”, and “not supported yet” are different outcomes.
7. Do not claim design consistency without browser-level evidence across both public and admin/inline surfaces.

## Scope Guard
- Do not replace the backend/content model wholesale.
- Do not add unrelated social/product features.
- Do not claim file/code upload support if the repo only supports code blocks and embedded widgets.
- Do not silently defer important UX gaps; document them.
