# Phase 3 — Student Profile

## Scope
Student Profile only. Existing routes and backend-disconnected boundary remain unchanged. No packages, configuration edits, API requests, authentication bypasses or demo identities added. Design uses the approved ui-ux-pro-max-based token system.

## Changes
- **Clear Data Ownership:** Separated official institutional student records from student-managed profile values.
  - Added an **Official University Identity** card at the top displaying student name, official student ID, college, degree program, and disciplinary clearance as read-only institutional records.
  - Student-managed fields are grouped into clear, scannable fieldsets with semibold headers: *Academic performance*, *Contact information & links*, and *Professional summary*.
- **Academic Information Validation:**
  - Enforced Philippine university grading bounds (1.00 to 5.00, maximum 2 decimal places, 1.00 highest, 3.00 passing).
  - Clear academic standing select dropdown.
  - Disciplinary clearance is explicitly identified as an institutional record managed by the OJT Coordinator.
- **Contact & Career Summary:**
  - Validated institutional email, mobile contact number, optional portfolio/GitHub URL (enforcing HTTP/HTTPS protocols), and multiline career goals summary.
  - Form dirty tracking with beforeunload unsaved changes warning.
  - Accessible "Save Changes" button.
- **Skills & Completed Coursework:**
  - Redesigned `PortfolioList` with clean badge tags and accessible remove icon buttons (44px min touch target).
  - Replaced raw paragraphs with `EmptyState` component when no items are recorded.
  - Add form with inline validation preventing duplicate and empty entries.
- **Résumé / CV Document:**
  - Displays uploaded document metadata (filename, extension, size, upload date) with status badge.
  - Accessible FileInput with accepted formats hint.
  - Actions for "Preview Structured Résumé" and "Remove résumé".
  - Clean printable structured résumé modal with `print-report` letterhead and print button.
- **Achievements & Projects:**
  - List of recorded achievements with title, organization, date, and description.
  - Progressive disclosure: "+ Add Achievement or Project" reveals the form in place with Save and Cancel buttons.
  - Form validation for title, issuer, and description.

## Files touched
- `src/views/StudentProfile.jsx` (redesigned)
- `src/views/StudentProfileSections.jsx` (redesigned)
- `src/views/profileControls.jsx` (refactored to use design system `Field`)
- `tests/profile.test.js` (created)
- `scripts/smoke.mjs` (added profile section header assertions)
- `scripts/validate.mjs` (included `profile.test.js` in validation suite)
- `docs/PHASE-3-STUDENT-PROFILE.md` (created)

## Validation results
- **35 unit & contract tests passing** (including 4 new tests in `tests/profile.test.js`).
- **Production build passed with 0 warnings** (Vite build in ~4.2s; 362.26 kB JS · 46.36 kB CSS).
- **44/44 runtime smoke checks passing** (including explicit assertions verifying required scannable section headers in `StudentProfile`).
- `git diff --check` passed cleanly.
