You are auditing my repository after the Phase 2 backend physical split and the follow-up stabilization work.

This is an AUDIT-ONLY task.
Do NOT modify production code, test code, csproj files, Dockerfiles, CI files, or configuration.
You MAY create report artifacts only.

==================================================
GOAL
==================================================

Verify whether the work completed so far actually satisfies the intended Phase 2 architecture + stabilization direction, and produce a persistent HTML audit report.

This audit should answer:
1. Did the physical multi-csproj split remain correct?
2. Did the stabilization work preserve the intended boundaries?
3. Are we ready to move to the next phase (test rebalancing), or is more stabilization still needed?

==================================================
REPORT ARTIFACTS
==================================================

Create these files:

- backend/reports/phase2-stabilization-audit/phase2-stabilization-audit.md
- backend/reports/phase2-stabilization-audit/phase2-stabilization-audit.html
- backend/reports/phase2-stabilization-audit/phase2-stabilization-audit.json

Important:
- The Markdown report is the primary artifact.
- The HTML report should be static and minimal, with inline CSS only.
- The JSON report should be machine-readable.

Include in every report:
- generated timestamp
- current git branch name if available
- current commit SHA if available

==================================================
CONTEXT TO AUDIT AGAINST
==================================================

The intended backend project graph is:

- WoongBlog.Domain
  (no project references)

- WoongBlog.Application
  -> WoongBlog.Domain

- WoongBlog.Infrastructure
  -> WoongBlog.Application
  -> WoongBlog.Domain

- WoongBlog.Api
  -> WoongBlog.Application
  -> WoongBlog.Infrastructure

The intended architectural rules are:

1. Domain is dependency-free apart from runtime framework basics.
2. Application depends on Domain only.
3. Infrastructure depends on Application + Domain only.
4. Api depends on Application + Infrastructure.
5. No circular references.
6. No Application -> Infrastructure dependency.
7. No Domain -> Application/Infrastructure dependency.
8. Application must not expose ASP.NET HTTP result abstractions.
9. Application must not use IServiceScopeFactory / CreateScope / GetRequiredService.
10. Api owns HTTP result mapping.
11. DbContext and concrete store implementations live in Infrastructure.
12. Handlers and abstraction interfaces live in Application.
13. AiActionResult<T> and WorkVideoResult<T> remain HTTP-agnostic.
14. Content CQRS direction remains intact.
15. AI batch boundary remains intact.
16. WorkVideo handler/store/support boundary remains intact.

The stabilization work may also have included:
- cleaner composition boundaries such as AddApplication() / AddInfrastructure()
- EF design-time/runtime validation
- low-risk README path updates
- better classification of tests that were previously mislabeled as unit tests

==================================================
AUDIT TASKS
==================================================

1. Inspect solution and backend csproj files
- Print actual ProjectReference graph.
- Print relevant PackageReference distribution by project.

2. Inspect source boundaries
Search for:
- Application referencing Infrastructure project or namespaces
- Domain referencing Application or Infrastructure namespaces
- ASP.NET HTTP abstractions inside Application
- IServiceScopeFactory / CreateScope / GetRequiredService inside Application
- DbContext usage outside Infrastructure
- store implementations outside Infrastructure
- handlers or abstraction interfaces outside Application
- concrete implementation logic leaking into Api

3. Inspect composition root
- Check Program.cs
- Check Api service registration extensions
- Determine whether composition is clean and whether AddApplication() / AddInfrastructure() style separation exists or should exist
- Flag if Api still knows too much about concrete implementation details

4. Inspect EF design-time/runtime setup
- Verify WoongBlogDbContext location
- Verify design-time factory existence if applicable
- Verify migrations/design-time assumptions
- Flag anything that could break dotnet ef or runtime boot

5. Inspect result type boundaries
- Verify AiActionResult<T> remains HTTP-agnostic
- Verify WorkVideoResult<T> remains HTTP-agnostic
- Verify HTTP mapping remains in Api

6. Inspect AI and WorkVideo boundaries
- AI: verify provider implementations/background processors are in Infrastructure and handlers/contracts are in Application
- WorkVideo: verify handlers/ports/results are in Application and storage/HLS/transcoder/cleanup implementations are in Infrastructure

7. Inspect test structure
- Show test projects and what each references
- Flag tests currently named “unit” that actually depend on Infrastructure or ASP.NET
- Assess whether the repository is ready for the next “test rebalancing” PR

==================================================
OUTPUT FORMAT
==================================================

In the Markdown and HTML reports, include these sections:

1. Executive Summary
- Overall status: PASS / PASS with yellow flags / FAIL
- Count of high-risk violations
- Count of yellow flags
- Recommendation:
  - ready for test-rebalancing PR
  - ready for one more stabilization pass
  - not ready

2. PASS/FAIL Checklist
A table listing every audit criterion with:
- status
- short evidence

3. Project Reference Graph
Show the actual project graph exactly as discovered.

4. High-Risk Violations
A table with:
- severity
- file path(s)
- finding
- why it matters

5. Yellow-Flag Items
A table with:
- area
- file path(s)
- why it matters
- suggested cleanup

6. Follow-Up Recommendation
Be explicit:
- If stabilization is sufficient, say the repo is ready for the next test-rebalancing PR.
- If not, say what must be fixed first.

7. Deferred Items
List issues that are acceptable to defer to a later PR.

The JSON report should include structured fields for:
- overall_status
- branch
- commit_sha
- criteria_results
- project_reference_graph
- high_risk_violations
- yellow_flags
- recommendation
- deferred_items

==================================================
IMPORTANT CONSTRAINTS
==================================================

- Do not change source code.
- Do not fix issues during this audit.
- Only generate the report artifacts.
- Keep the HTML minimal and static.
- Prioritize correctness and evidence over styling.