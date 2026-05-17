# Documentation

_Last updated: 2026-03-27T00:00:00Z_

**Current milestone**: M1

## How to Run
1. Narrow issue lane:
   - invoke `$portfolio-maintenance <issue>`
2. Broad/ambiguous lane:
   - invoke `$ralplan <goal>`
3. Execution-to-green lane:
   - invoke `$ralph <plan-path>`
4. Security-sensitive changes:
   - add `$security-review`
5. Pre-push review:
   - add `$code-review`

## How to Demo
1. Pick a narrow maintenance issue and show it routes through `portfolio-maintenance`.
2. Run one public verification bundle and one admin verification bundle.
3. Run the HTTPS admin/upload bundle.
4. Show the push-safety checklist before any branch upload.

## Decisions Log
| Timestamp | Milestone | Decision | Reasoning |
|-----------|-----------|----------|-----------|
| 2026-03-27T00:00:00Z | M1 | Use `portfolio-maintenance` as the default narrow maintenance lane | Routine portfolio upkeep should not require a full Ralph planning cycle every time. |
| 2026-03-27T00:00:00Z | M2 | Keep weekly stability checks split into public, admin, and HTTPS bundles | The repo’s highest-risk regressions come from different runtime lanes, not a single unit-only path. |
| 2026-03-27T00:00:00Z | M3 | Treat auth/upload/member/HTTPS changes as security-sensitive by default | These surfaces are the easiest place to accidentally leak data or mis-verify a runtime assumption. |
| 2026-03-27T00:00:00Z | M4 | Make push-safety part of maintenance, not an afterthought | This repo uses many local-only/runtime artifacts that must never be uploaded accidentally. |

## Known Issues
- `portfolio-maintenance` exists only as a local repo skill unless copied to a broader shared skill path.
- Full maintenance discipline still depends on running the right lane instead of jumping straight to ad-hoc edits.
