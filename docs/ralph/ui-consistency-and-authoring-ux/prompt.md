# UI Consistency and Authoring UX Refresh

## Goals
- Make public Works and Blog listing/detail experiences visually stable, predictable, and comfortable across desktop, tablet, and mobile.
- Remove layout jitter caused by uneven card heights and shifting related-content positions.
- Improve authoring UX so image uploads do not require awkward drag-only behavior and publish flow is simpler.
- Apply a more consistent design language across listing cards, detail pages, inline editors, and admin create/edit flows.
- Keep the current content model and routing intact while improving presentation and interaction quality.

## Non-Goals
- Do not redesign the entire brand from scratch.
- Do not replace the current backend/CQRS/auth architecture.
- Do not introduce a full new CMS workflow or role system.
- Do not add unrelated content types or navigation changes.

## Hard Constraints
- The refresh must work in the current Next.js + ASP.NET Core + nginx brownfield stack.
- Public pages, inline editors, and admin editors must remain functional during the refactor.
- Mobile and dynamic-content behavior must be first-class acceptance criteria, not a later polish pass.
- Existing create/edit/readback paths must remain testable with browser-level verification.
- Scope should prefer design-system reuse and layout cleanup over bespoke one-off components.

## Deliverables
- [ ] Stable public Works list layout with consistent card sizing behavior
- [ ] Stable public Blog list layout with consistent card sizing behavior
- [ ] Stable related-content sections on Work/Blog detail pages without vertical jumpiness
- [ ] Improved admin/inline create-edit flows for Works/Blog with clearer, more consistent UI
- [ ] Image upload UX that supports normal click/select flow and drag/drop-friendly affordances where useful
- [ ] Simplified new-post/new-work publishing flow with explicit final behavior
- [ ] Responsive/mobile verification coverage for the refreshed UI
- [ ] Documentation of the chosen UX rules and remaining tradeoffs

## Done When
- [ ] Works and Blog cards no longer feel visually jagged because of uneven masonry-like heights.
- [ ] Related-content cards on detail pages keep a consistent, predictable grid/order as content changes.
- [ ] A user can create Works/Blog content without a confusing separate publish step in the default path.
- [ ] Image upload affordances are obvious on desktop and mobile and do not depend on hidden drag-only behavior.
- [ ] Design treatment is visibly more consistent across public cards, detail metadata, and editor shells.
- [ ] Browser verification covers desktop and at least one mobile-ish viewport scenario for the refreshed flows.
