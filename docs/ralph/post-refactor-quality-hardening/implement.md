# Implementation Rules

**Source of truth**: `plans.md`

## Rules
1. Follow the milestone order in `plans.md`.
2. Treat this as a regression-first quality sweep: strengthen proofs before broad cleanup or refactoring.
3. Run each milestone's Validation Commands immediately after the milestone.
4. If validation fails, stop and fix before moving on.
5. Do not widen scope into architecture redesign or feature work.
6. Prefer adding/strengthening targeted tests and lightweight support scripts over broad framework churn.
7. Keep the supported verification path compose-first when auth/admin/upload behavior matters.
8. If new gaps are discovered, add a new milestone to `plans.md` rather than smuggling work into the active one.

## Scope Guard
> Do not replace the current stack, auth model, or storage model. Do not remove existing verification layers to make the suite look cleaner. Do not broaden into unrelated UI redesign or product features. Do not introduce heavyweight external load tooling when a bounded local script/test can prove the same point for this pass.
