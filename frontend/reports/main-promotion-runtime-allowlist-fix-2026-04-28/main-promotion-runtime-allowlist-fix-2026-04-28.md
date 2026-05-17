# Main Promotion Runtime Allowlist Fix

Date: 2026-04-28

## Summary

The `dev` branch was green and staging images published successfully, but the generated `release/main-promote` PR failed `CI Main Runtime`. The runtime compose verification passed, while quality jobs failed before exercising application behavior because the runtime allowlist omitted scripts required by the main CI workflow.

This fix adds the missing test runner scripts and the frontend e2e readiness helper to `scripts/main-runtime-allowlist.txt` so future runtime-only main promotion branches include all files referenced by `ci-main-runtime.yml`.

While validating the dev PR, CI also exposed the same async delete-failure assertion race previously fixed for public detail admin actions. The inline blog editor test now waits for the retryable enabled `삭제` state after a rejected delete mutation.

## Files Changed

- `scripts/main-runtime-allowlist.txt`
- `src/test/inline-blog-editor-section.test.tsx`

## Production Files Changed

- None.

## Behavior Bugs Found

- No application runtime behavior bug was found.
- Promotion pipeline bug found: `CI Main Runtime` expects test scripts and `scripts/check-e2e-readiness.mjs`, but the runtime promotion allowlist did not include them.

## Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `gh run watch 25060857252 --interval 20` | Failed as expected | Identified missing allowlist files; compose runtime verification passed. |
| `ls scripts/run-*-tests.sh scripts/check-e2e-readiness.mjs` | Passed | Confirmed the missing files exist on `dev`. |
| `npm test -- --run src/test/inline-blog-editor-section.test.tsx src/test/public-detail-admin-actions.test.tsx` | Passed | 2 files, 12 tests. |
| `git diff --check` | Passed | No whitespace errors. |

## Risks And Deferred Items

- The first main promotion PR #23 remains red until regenerated from `dev` after this allowlist fix lands.
- Full validation should run through the normal dev PR checks before regenerating `release/main-promote`.

## Final Recommendation

Merge this allowlist fix into `dev`, wait for green CI/staging publication, rerun `Promote Main Runtime`, and recreate or update the `release/main-promote -> main` PR.
