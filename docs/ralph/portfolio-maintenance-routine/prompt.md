# Portfolio Maintenance Ralph Routine

## Goals
- Maintain the portfolio app safely across public pages, admin pages, uploads, auth/session flows, compose/nginx runtime, HTTPS local verification, and release/push readiness.
- Use the local `portfolio-maintenance` skill as the default lane for narrow maintenance issues.
- Standardize when to use planning, execution, security review, and release verification.
- Keep ongoing maintenance brownfield-first, test-backed, and runtime-verified.

## Non-Goals
- Do not redesign the product or CMS architecture in this routine.
- Do not replace auth, upload, or compose architecture unless a specific maintenance slice explicitly requires it.
- Do not add new dependencies as part of routine maintenance planning.
- Do not treat build-only success as sufficient for admin/upload/auth changes.

## Hard Constraints
- Narrow issues should route through `portfolio-maintenance` first.
- Broad or ambiguous work must be planned before implementation.
- Auth/upload/member/HTTPS changes are security-sensitive by default.
- HTTPS issues must be verified on `https://localhost`, not just HTTP.
- Push safety must explicitly exclude secrets, local certs, cache/runtime artifacts, and storage-state files.

## Deliverables
- [ ] A Ralph-ready maintenance workflow for issue-driven fixes
- [ ] A weekly regression/stability pass plan
- [ ] A release-candidate verification and push-safety plan
- [ ] Maintenance milestones with allowed files and executable validation commands
- [ ] Documentation showing how the maintenance skills fit together

## Done When
- [ ] A maintainer can choose the right lane (`portfolio-maintenance`, `ralplan`, `ralph`, `security-review`, `code-review`) without ambiguity.
- [ ] Routine maintenance has milestone-based validation for public, admin, and HTTPS runtime paths.
- [ ] Release readiness includes explicit push-safety checks.
- [ ] The maintenance plan is concrete enough to hand directly to Ralph for ongoing upkeep.
