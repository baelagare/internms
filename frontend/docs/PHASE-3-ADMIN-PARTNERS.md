# Phase 3 — Admin Partners

## Summary
Completed the Admin Partners module on the shared partner view (`Partners` in `src/views/Management.jsx`). The admin path now presents a university-wide directory with a college scope filter, an added "Colleges covered" metric, and scoped empty states. Coordinator and supervisor (job posting) paths are unchanged.

## Changes
- `src/views/Management.jsx`
  - Admin subtitle: "Manage host company records across all colleges." (coordinator keeps the college-scoped wording).
  - Added admin-only "Colleges covered" metric (distinct recorded college values; excludes "ALL").
  - Distinguished "No partner records in this college" (active scope) from "No partner records yet" (nothing recorded) with matching guidance.
  - Partner creation still requires explicit institutional fields (college, supervisor, invitation token, capacity, GPA cutoff); no defaults are invented.
- `src/views/partners.css` — summary grid now uses `auto-fit` so 3 or 4 metrics lay out cleanly.
- `tests/adminPartners.test.js` (new) — admin landmarks, metrics, and no-defaults assertions.
- `scripts/validate.mjs` — added `tests/adminPartners.test.js`.
- `scripts/smoke.mjs` — added admin Partners landmark assertions.

## Limitations
- Add/edit partner records cannot be persisted until the Phase 4 backend is connected; the form surfaces the unavailable-save notice.
