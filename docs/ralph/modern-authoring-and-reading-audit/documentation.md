# Documentation

_Last updated: 2026-03-26T04:10:00Z_

**Current milestone**: M1

## How to Run
1. Start the runtime stack:
   - `docker compose up -d --build frontend backend nginx`
2. Run the main frontend checks:
   - `npm run lint`
   - `npm run build`
   - clean `.next/dev` if needed, then `npm run typecheck`
3. Run browser verification against `http://localhost`.

## How to Demo
1. Browse `/works` and `/blog`, then open detail pages and inspect “other posts/works” behavior.
2. Create a new blog/work, upload media, and observe whether the flow feels modern and obvious.
3. Try inline image insertion inside the blog editor.
4. Try technical writing affordances such as code block insertion / slash commands if supported.
5. Compare desktop vs mobile behavior for list and detail surfaces.

## Decisions Log
| Timestamp | Milestone | Decision | Reasoning |
|-----------|-----------|----------|-----------|
| 2026-03-26T04:10:00Z | M1 | Treat this as an audit + modernization pass, not just a visual restyle | The user is asking whether the experience is genuinely modern, not merely prettier. |
| 2026-03-26T04:10:00Z | M1 | Distinguish “modern capability exists” from “the UI makes it discoverable” | The current repo already supports some advanced editor behavior, but users may not perceive it. |
| 2026-03-26T04:10:00Z | M1 | Do not equate code blocks with generic code-file upload | The editor appears to support code blocks and custom widgets, not arbitrary code-file upload as a first-class concept. |
| 2026-03-26T04:10:00Z | M1 | Reading-surface stability and upload clarity are the highest-value modernity signals | Uneven list/detail browsing and confusing upload behavior make the product feel older fastest. |

## Known Issues
- The repo currently mixes polished and older-feeling authoring surfaces.
- Drag/drop support exists in some places but is not always clearly communicated.
- Code-oriented authoring exists partially through Tiptap extensions, but capability surfacing may still lag the underlying features.
