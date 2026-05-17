# Documentation

_Last updated: 2026-03-26T08:45:00Z_

**Current milestone**: Complete (M1-M5)

## How to Run
1. Start the runtime stack:
   - `docker compose up -d --build frontend backend nginx`
2. Main checks:
   - `npm run lint`
   - clean `.next/dev` if needed, then `npm run typecheck`
   - `npm run build`
3. Browser verification uses `http://localhost`.

## How to Demo
1. Open `/works` and `/blog` on a large screen and observe denser first screens and the rebalanced navbar.
2. Open a work or blog detail page and inspect the related-content pager on desktop and mobile widths.
3. Open the admin panel and use `Public Home` / `Open Site`, title-click edit affordances, and the pages quick-jump links.
4. Create a work without changing the default category and confirm it returns to the admin list after save.
5. Open `/admin/blog/notion` and verify left-list / right-editor behavior, visible autosave status, and explicit post-settings saves.

## Decisions Log
| Timestamp | Milestone | Decision | Reasoning |
|-----------|-----------|----------|-----------|
| 2026-03-26T05:25:00Z | M1 | Separate density/nav/admin-friction fixes from the larger Notion-view feature | Low-risk UX wins should not wait on the biggest feature in the scope. |
| 2026-03-26T05:25:00Z | M1 | Build the Notion-like view as a staged immediate-edit surface, not a full Notion clone | The editor and content model already exist; the highest-value change is interaction model + layout, not a full reinvention. |
| 2026-03-26T05:25:00Z | M1 | Ship the first Notion view for Blog first, content first | Blog already has the richer Tiptap-based editor stack, so it is the safest first rollout surface. |
| 2026-03-26T05:25:00Z | M1 | Keep autosave away from title/publish in v1 | Title and publish changes have bigger side effects than body edits; content-only autosave is safer. |
| 2026-03-26T08:45:00Z | M1 | Raise public density targets to `8/4/2` for Works, `12/4/2` for Blog, and `6/4/2` for related content | Wide screens were still underfilled, so the first screen needed both larger page sizes and denser grid usage. |
| 2026-03-26T08:35:00Z | M2 | Default new works to `Uncategorized` instead of blocking create | Category stays editable, but create should not force premature taxonomy decisions. |
| 2026-03-26T08:35:00Z | M3 | Keep title/tags/publish on explicit save inside Notion View while body autosaves | This keeps the workspace content-first without silently changing public metadata or visibility. |
| 2026-03-26T08:45:00Z | M4 | Surface slash commands, code blocks, drag/drop/paste image support, and existing HTML/3D blocks directly in editor chrome | The capabilities already existed, but they were too hidden to feel like a modern authoring surface. |
| 2026-03-26T08:35:00Z | M5 | Keep members list deferred in this modernization pass | `Profile` / `AuthSession` data exists, but there is still no dedicated admin members UI/API, role/privacy review, or read-only listing contract to ship safely right now. |

## Known Issues
- Members list remains explicitly deferred. Shipping it would require a dedicated admin API/UI slice covering `Profile`, `AuthSession`, privacy rules, and read-only vs editable scope.
- The first Notion workspace is intentionally blog-only and content-first. Work authoring still uses the existing create/edit forms.
- Blog content autosaves, but title / tags / publish state remain explicit-save controls by design.
