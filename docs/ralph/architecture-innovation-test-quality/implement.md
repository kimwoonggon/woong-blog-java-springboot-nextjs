# Implementation Rules

**Source of truth**: `plans.md`

## Rules
1. Execute milestones in `plans.md` order.
2. Run the milestone validation command before moving to the next milestone.
3. Stop immediately on validation failure and fix before proceeding.
4. Keep this pass focused on verification, coverage, typing, nullable quality, DB review, and runtime validation.
5. Add new milestones to `plans.md` before widening scope.
6. Prefer evidence-backed improvements over speculative cleanup or refactors.
7. Use git checkpoints and small logical commits so every risky step is reversible.
8. Do not claim final auth/cookie/runtime sign-off from HTTP-only evidence when the target deployment path is HTTPS.

## Scope Guard
- Do not add unrelated product features.
- Do not make broad architectural rewrites merely to simplify tests.
- Do not change DB schema without evidence from entity/config/runtime review.
- Do not claim coverage progress without concrete report data.
