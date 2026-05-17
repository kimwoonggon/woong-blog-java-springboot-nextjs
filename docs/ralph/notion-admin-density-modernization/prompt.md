# Notion-Inspired Admin + Density Modernization

## Goals
- Fix the remaining density and layout issues on Works/Blog list and detail surfaces so cards and related-content sections use available space naturally and predictably.
- Redesign the navbar and public shell so the site feels more modern, better balanced, and less awkwardly centered.
- Improve admin information architecture and authoring flow: faster navigation, title-click editing, better post-create redirect behavior, and less surprising form friction.
- Explore and implement a Notion-inspired admin reading/writing view for Works/Blog content where a left-side list and right-side immediate editor coexist.
- Document what is in-scope now vs what should be deferred (for example, member list).

## Non-Goals
- Do not rebuild the entire product around a brand-new CMS architecture in one pass.
- Do not replace auth, CQRS, or persistence architecture unless a milestone explicitly requires a narrow supporting change.
- Do not conflate a Notion-like editing surface with a full Notion clone.
- Do not promise member management actions unless the supporting backend/API work is explicitly included.

## Hard Constraints
- Preserve existing public/admin/browser flows while modernizing UI/UX.
- Density/layout improvements must be browser-verified at desktop and mobile/tablet sizes.
- Notion view should start from currently existing editor capabilities (Tiptap, code block, slash command, uploads) rather than an editor rewrite.
- High-risk scope must be sequenced so smaller UX fixes are not blocked behind the larger Notion-view feature.
- Any member-list milestone must acknowledge current backend/API gaps.
- The first Notion-like view should assume **blog-first, content-first**, with autosave bounded to content editing rather than every metadata field.

## Deliverables
- [ ] Public density/layout improvement plan and code changes for Works/Blog lists and related-content surfaces
- [ ] Navbar modernization plan and code changes
- [ ] Admin IA improvements (home shortcut, title-click edit, create redirect behavior)
- [ ] Category/create-flow UX decision for Works
- [ ] Notion-inspired admin view design and staged implementation plan
- [ ] Clear decision on whether member list is in-scope now or deferred
- [ ] Browser verification evidence for the chosen milestones

## Done When
- [ ] Works/Blog surfaces fill space more naturally and related-content paging feels stable.
- [ ] Navbar and top-level public shell feel intentionally modern and better balanced.
- [ ] Admin panel navigation and edit entry points are materially faster to use.
- [ ] The Notion-view concept is implemented as a bounded first version for blog-first/content-first editing, or explicitly scoped into later milestones with testable criteria.
- [ ] Remaining deferred work (including any member-list follow-up) is documented honestly.
