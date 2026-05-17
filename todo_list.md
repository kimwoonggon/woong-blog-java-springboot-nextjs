# Todo List

- [x] RED: Study public inline create returns to `/blog?page=1&pageSize=<current>`, clears stale search, and closes editor.
- [x] GREEN: BlogEditor/BlogPage inline create navigation implements page 1 return.
- [x] RED: Study detail inline edit/delete preserves original returnTo page/pageSize and never lands on unrelated page.
- [x] GREEN: Blog detail propagates safe returnTo through edit/delete/prev/next.
- [x] RED: Blog list clamps invalid page after deletion instead of rendering `No blog posts found` when posts still exist.
- [x] GREEN: Blog public list redirects/replaces to nearest valid page when requested page exceeds totalPages.
- [x] RED: Introduction and Contact inline save closes editor and refreshes public content.
- [x] GREEN: Add PageEditor onSaved flow and InlinePageEditorSection wrapper.
- [x] RED: Theme toggle is one-click light/dark, no dropdown, mobile label/hit area toggles.
- [x] GREEN: Replace ThemeToggle dropdown with direct toggle and mobile wide hit target.
- [x] RED: Public desktop nav and mobile drawer expose no Login/Signed in/Admin/Logout controls while `/login` remains available.
- [x] GREEN: Remove public Navbar account controls, preserve public edit affordances for admins.
- [x] RED: Admin blog next/prev changes exactly one page per click.
- [x] GREEN: Stabilize AdminBlogTableClient page state and URL sync.
- [x] RED: Backend Codex runtime creates/uses a directory home and rejects file-shaped Codex home with clear error.
- [x] GREEN: Remove `@openai/codex` version pin, use safe compose volume defaults, add runtime hardening.
- [x] RED/GREEN: Update stale tests that asserted old account menu/dropdown behavior.
- [x] VERIFY: Run backend, Vitest, lint/typecheck, Docker compose, and Playwright with videos enabled.
