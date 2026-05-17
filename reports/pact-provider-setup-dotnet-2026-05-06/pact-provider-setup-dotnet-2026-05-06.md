# Pact Provider CI Dotnet Setup Audit - 2026-05-06

## Scope

Fix the CI failure blocking main promotion PR #68 by removing the Pact provider job's dependency on pulling `mcr.microsoft.com/dotnet/sdk:10.0` through Docker.

## Failure

PR #68 failed `Pact provider verification` in GitHub Actions run `25414949688`, job `74544519726`.

The job failed before provider tests started:

- Command: `docker run --pull=missing --rm -v "$PWD:/repo" -w /repo mcr.microsoft.com/dotnet/sdk:10.0 bash ./scripts/pact-provider-verify.sh`
- Failure mode: Docker could not pull `mcr.microsoft.com/dotnet/sdk:10.0`; MCR returned a blocked/denied HTML response.
- Classification: CI image-pull dependency failure, not a Pact contract assertion failure.

## Changed

- `.github/workflows/ci-dev.yml`
  - Added `actions/setup-dotnet@v4` with `dotnet-version: 10.0.x` to the Pact provider job.
  - Changed provider verification from Docker SDK image execution to `bash ./scripts/pact-provider-verify.sh` on the runner.

- `.github/workflows/ci-main-runtime.yml`
  - Applied the same Pact provider job change so PRs to `main` and main pushes use the same stable verification path.

- `todolist-2026-05-06.md`
  - Added failure analysis, plan alignment, and validation records for this CI fix.

## Intentionally Not Changed

- Did not change Pact files or provider contract assertions.
- Did not change backend application code.
- Did not change load-test semantics, targets, cache behavior, or DB behavior.
- Did not change compose runtime images or production deployment configuration.
- Did not remove Pact provider verification from CI.

## Validation

- PASS: `PACT_PROVIDER_PORT=5098 bash ./scripts/pact-provider-verify.sh`
  - Result: 1 Pact provider contract passed locally.

- PASS: `git diff --check`
  - No whitespace errors.

- PASS: grep guard for removed Docker SDK image invocation.
  - `.github/workflows` no longer contains `mcr.microsoft.com/dotnet/sdk:10.0 bash ./scripts/pact-provider-verify.sh`.

## Risks And Follow-Up

- GitHub Actions still needs network access for `actions/setup-dotnet@v4`, but this is consistent with the existing backend jobs and avoids a separate Docker registry pull path.
- PR #68 already has a failed check from the old workflow; the durable fix must be merged into `dev`, then a fresh main promotion PR/run should be verified.
- Existing Node.js 20 deprecation warnings remain unrelated to this fix.

## Recommendation

Open a focused PR to `dev`, merge after CI Dev is green, then use the new promotion run to replace or supersede PR #68 and verify `CI Main Runtime` again.
