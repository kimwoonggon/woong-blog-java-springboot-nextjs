# Current Main Server Evidence Handoff - 2026-05-12

This handoff script defaults to the latest fetched `origin/main` instead of a hard-coded commit SHA.

Set `EXPECTED_MAIN_SHA=<40-char-sha>` only when an exact deployment pin is required.

Optional image digest pins:

- `EXPECTED_BACKEND_IMAGE_DIGEST=sha256:<backend-digest>`
- `EXPECTED_FRONTEND_IMAGE_DIGEST=sha256:<frontend-digest>`

Fails immediately if provided expected image digests do not match the resolved GHCR manifest digests.
