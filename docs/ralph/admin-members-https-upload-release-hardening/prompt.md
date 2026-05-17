# Admin Members + HTTPS Upload + Release Hardening

## Goals
- Tighten push safety so caches, local certs, storage-state files, and other security-sensitive local artifacts stay out of the remote branch.
- Add an admin-visible **Members** page that lists who joined the site, using existing `Profile` / `AuthSession` data with a privacy-safe read-only surface.
- Fix the broken admin resume PDF upload flow when the site is running through the local HTTPS stack.
- Expand automated validation so release confidence grows with the number of developed versions/features.
- Finish with a release-ready state that can be pushed to `origin` without uploading secrets or unrelated local/runtime artifacts.

## Non-Goals
- Do not build full member management (edit/delete/impersonate/role mutate) in this pass.
- Do not expose raw session keys, provider subjects, IP addresses, cookies, tokens, or local security datasets in the members UI or API.
- Do not redesign the entire admin IA again; only add the member entry point needed for this release slice.
- Do not replace the existing upload/auth/CQRS architecture unless a narrow bug fix requires it.

## Hard Constraints
- Member listing should be **read-only by default** and expose only privacy-safe fields.
- The final branch upload must not include secrets, local cert keys, cache directories, storage-state artifacts, or unrelated WIP.
- HTTPS verification must use `https://localhost` with the local TLS stack, not an HTTP-only shortcut.
- Resume upload must still work in normal HTTP flows after the HTTPS fix.
- Validation must include both backend tests and browser-visible release checks.
- Any push-to-origin step must happen only after all verification is green.

## Deliverables
- [ ] Gitignore/cache/push-safety hardening plan and code changes (if gaps are found)
- [ ] Admin Members page plan and implementation (frontend + backend read API)
- [ ] HTTPS-mode admin resume PDF upload fix plan and implementation
- [ ] Expanded test plan and regression additions for members + resume upload + release safety
- [ ] Clear release/push readiness checklist for `origin`

## Done When
- [ ] A push-safe branch can be prepared without uploading secrets, local certs, caches, or storage-state artifacts.
- [ ] Admin navigation exposes a Members page and the page shows joined users with privacy-safe fields.
- [ ] Admin resume PDF upload works on `https://localhost` and still works on the normal HTTP/local runtime.
- [ ] Added tests cover the new members flow, the HTTPS resume upload fix, and the release-hardening expectations.
- [ ] The final verification bundle is green and the remaining push risks are explicitly documented.
