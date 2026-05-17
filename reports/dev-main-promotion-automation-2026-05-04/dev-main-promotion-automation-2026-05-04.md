# Audit Report - dev-main-promotion-automation-2026-05-04

## What changed

- Confirmed the current branch policy: `dev` success did not push `main`; it only fed `Publish GHCR Dev`, while `main` still required a separate promotion path.
- Updated [promote-main-runtime.yml](/mnt/d/woong-blog/woong-blog-backend-architecture-renovate-0419/woong-blog-aspcore-nextjs/.github/workflows/promote-main-runtime.yml) so `Promote Main Runtime` now also runs after a successful `CI Dev` completion on `dev`.
- Added automatic promotion-PR creation/reuse logic so a successful `dev` run refreshes `release/main-promote` and ensures there is an explicit PR into `main`.
- Updated [README.md](/mnt/d/woong-blog/woong-blog-backend-architecture-renovate-0419/woong-blog-aspcore-nextjs/README.md) and [main-flow.md](/mnt/d/woong-blog/woong-blog-backend-architecture-renovate-0419/woong-blog-aspcore-nextjs/docs/walkthroughs/main-flow.md) to state the real release flow clearly.
- Updated [todolist-2026-05-04.md](/mnt/d/woong-blog/woong-blog-backend-architecture-renovate-0419/woong-blog-aspcore-nextjs/todolist-2026-05-04.md) with the request mapping, plan, and completion record.

## What was intentionally not changed

- Did not make `dev` push directly to `main`.
- Did not change `CI Dev`, `CI Main Runtime`, `Publish GHCR Dev`, or `Publish GHCR Main`.
- Did not change runtime allowlist contents or Docker/runtime behavior.
- Did not run tests, build, or live GitHub workflow executions in this pass.

## Goal and non-goal check

### Goals

- Explain whether `dev` success pushes `main`: satisfied. The answer was no in the original state.
- Remove branch-flow ambiguity: satisfied. Docs and workflow now describe and implement the promotion path consistently.
- Reduce manual promotion friction: satisfied. `dev` green now auto-refreshes the promotion branch and PR.

### Non-goals

- Full continuous deployment from `dev` to production `main`: intentionally not implemented.
- Runtime validation or branch-protection policy changes: not part of this pass.

## Validations performed

- Static inspection of `.github/workflows/ci-dev.yml`, `.github/workflows/publish-ghcr-dev.yml`, `.github/workflows/promote-main-runtime.yml`, `README.md`, and `docs/walkthroughs/main-flow.md`.
- Backup creation under `.codex-backups/dev-main-promotion-automation-2026-05-04/`.
- File generation for persistent TODO and audit artifacts.

## Risks, yellow flags, and deferred follow-up

- The new PR-creation step was not executed against GitHub in this pass, so first live run should be observed in Actions.
- If repository branch protections or token permissions differ from expected defaults, PR creation may need an additional permission adjustment.
- The workflow now automates branch/PR preparation, but release approval still depends on humans merging `release/main-promote -> main`.

## Final recommendation

- Let the next successful `dev` run exercise `Promote Main Runtime` once in GitHub Actions.
- If you want, the next step is to add a small status/notification layer so failed promotion-PR creation is visible immediately.
