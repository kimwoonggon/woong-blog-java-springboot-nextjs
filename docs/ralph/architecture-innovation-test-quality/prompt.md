# Architecture Innovation — Integrated Quality & Test Hardening

## Goals
- Validate the full frontend -> nginx -> ASP.NET Core -> PostgreSQL runtime path from both browser and server perspectives.
- Eliminate duplicate-slug write failures for work/blog creation before the broader quality pass continues.
- Strengthen backend/frontend tests and push meaningful coverage toward 100% where practical.
- Improve TypeScript type safety and reduce weak typing patterns.
- Review and reduce unnecessary C# nullable usage while preserving correct null semantics.
- Review EF Core schema/table/index/nullability correctness against the current domain model.
- Run realistic lightweight load tests and capture bottlenecks/failure points.
- Re-validate nginx routing, proxy headers, auth/cookie behavior, and deployment path assumptions.
- Separate plain-HTTP local verification from HTTPS reverse-proxy verification so secure-cookie/OAuth assumptions are proven on the correct protocol.

## Non-Goals
- Do not introduce unrelated product features.
- Do not perform speculative architectural rewrites just to increase coverage numbers.
- Do not blindly remove nullable markers or force 100% coverage with low-value tests.

## Hard Constraints
- Prioritize verification, integration stability, typing quality, and evidence-based fixes over feature expansion.
- Use git checkpoints and small reversible commits during implementation.
- Any DB/schema change must be justified by inspected entity/config/test evidence.
- Any nginx/auth/session/security change must be validated, not assumed.
- Coverage work must remain meaningful; no number-padding tests.

## Deliverables
- [ ] Duplicate-slug create/update paths no longer leak DB unique-constraint failures
- [ ] Current full-stack execution-flow summary grounded in the real codebase
- [ ] Integrated test plan and implemented high-value test improvements
- [ ] Coverage report summary with gaps, what was improved, and what remains
- [ ] TypeScript type-strengthening report and code changes
- [ ] C# nullable review with concrete safe improvements
- [ ] EF Core / DB schema review report with concrete issues or affirmations
- [ ] Lightweight load/performance test results and bottleneck observations
- [ ] nginx/runtime verification report
- [ ] Commit-by-commit audit trail and rollback points

## Done When
- [ ] Duplicate-title blog/work creates are handled safely without DB exceptions leaking to users.
- [ ] The integrated runtime path has explicit browser + backend verification evidence.
- [ ] Test coverage is improved in meaningful weak spots and coverage gaps are documented.
- [ ] TypeScript weak typing hotspots are reduced with concrete compile-time improvements.
- [ ] Safe nullable improvements are made or clearly deferred with reasons.
- [ ] EF Core schema review is documented with actioned fixes where justified.
- [ ] Load-test scenarios, timings, failure rates, and likely bottlenecks are documented.
- [ ] nginx/auth/proxy/runtime behavior is checked and documented for both the existing HTTP dev path and the HTTPS reverse-proxy path.
- [ ] All changes remain reversible via clear git checkpoints.
