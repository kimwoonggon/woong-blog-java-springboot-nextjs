# Frontend Batch 4B - Global Dark Mode Readability Pass

Date: 2026-04-27

## Summary

Softened the global dark-mode palette for public and admin UI while preserving Batch 4A code block styling and existing layout behavior.

## Changed

- Updated dark theme tokens in `src/app/globals.css` from near-black/high-white values to soft charcoal surfaces, off-white text, muted borders, softer inputs, and lower-saturation accents.
- Updated `ThemeProvider` dark `theme-color` to match the new dark background.
- Moved dialog and sheet content surfaces from `bg-background` to `bg-popover`.
- Replaced selected hard-coded harsh admin/login dark classes with shared theme tokens.
- Added focused computed-style browser coverage in `tests/dark-mode.spec.ts`.

## Intentionally Not Changed

- No backend behavior changed.
- No saved content shape changed.
- No AI or WorkVideo behavior/tests were added.
- No broad visual regression framework or pixel-perfect screenshot assertions were added.
- Batch 4A code block tokens and behavior were left intact.

## Goal Verification

- Dark body/page background is no longer near-black.
- Dark primary text is no longer near-pure-white and remains contrast-readable.
- Muted text remains readable.
- Cards/panels are separated from the page background with subtle borders.
- Inputs are readable and not black.
- Dialogs/sheets use a soft popover surface.
- Focus rings remain visible.
- Public prose and Batch 4A code block tests remain green.

## Validations

| Command | Result |
| --- | --- |
| `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e -- tests/dark-mode.spec.ts --grep "DM-25"` | First run failed as expected, then passed after implementation |
| `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e -- tests/dark-mode.spec.ts` | Passed: 26 tests |
| `npm test -- --run` | Passed: 65 files / 369 tests |
| `npm run lint` | Passed: 0 errors / 6 existing warnings |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `git diff --check` | Passed |
| `docker compose -f docker-compose.dev.yml down --remove-orphans` | Passed |

## Risks and Follow-Ups

- Some specialized embedded/editor blocks still contain local dark utility classes; this batch avoided deeper component refactors.
- `sonner` rich-color toast styling was not customized in this pass.
- Broader visual regression infrastructure remains intentionally absent.

## Final Recommendation

Safe to proceed to the AI failure and partial-failure batch. This change did not alter AI, WorkVideo, backend, or content persistence behavior.
