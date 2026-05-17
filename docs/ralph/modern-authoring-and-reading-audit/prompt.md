# Modern Authoring and Reading Experience Audit + Refresh

## Goals
- Audit whether the current blog/work reading and authoring experience actually feels modern, coherent, and efficient.
- Improve blog/work list and detail reading flows so related-content browsing, card rhythm, and content discovery feel contemporary and stable.
- Modernize upload affordances across editor flows so image/media handling is obvious on desktop and mobile, with click-first UX and modern drag/drop support where appropriate.
- Clarify which “modern editor” capabilities already exist (image drag/drop, paste upload, code blocks, embeds) and close the highest-value gaps.
- Bring the visual language of public reading surfaces and admin/inline authoring surfaces into a more consistent design system.

## Non-Goals
- Do not replace the backend stack or content model wholesale.
- Do not build a full Notion/Substack-grade editor from scratch in one pass.
- Do not introduce unrelated social/product features such as comments, likes, or multi-user collaboration.
- Do not add speculative power-user capabilities unless they materially improve the scoped authoring/reading experience.

## Hard Constraints
- The repo is a brownfield Next.js + ASP.NET Core + nginx stack; improvements must respect current routing, auth, and content contracts unless a milestone explicitly includes the needed change.
- Public reading, admin editing, and inline editing must remain browser-testable during the refresh.
- “Modern” means concrete UX behavior, not just different styling.
- Desktop, tablet, and mobile behavior must be validated with browser-level evidence.
- Code/example authoring support should be grounded in the actual editor capabilities that exist today.

## Deliverables
- [ ] Audit summary of which modern capabilities already exist vs where the UX still falls short
- [ ] Modernized blog/work reading surfaces with coherent list/detail/related-content behavior
- [ ] Modernized media-upload experience across the relevant editor surfaces
- [ ] Clear plan for code-block / embed / advanced-authoring capabilities based on existing Tiptap support
- [ ] More consistent visual language across public cards, detail pages, inline shells, and admin editors
- [ ] Browser-level verification for the reading + authoring improvements

## Done When
- [ ] It is clear, with evidence, which “modern” capabilities are already supported and which were added/refined.
- [ ] A user can browse works/blogs and adjacent content without awkward layout drift or confusing next-item positioning.
- [ ] A content author can understand how to upload images/media without hidden or awkward interactions.
- [ ] The editor’s support for code-oriented content is explicit, testable, and aligned with the product direction.
- [ ] The reading and authoring surfaces feel like parts of one design system rather than separate generations of UI.
