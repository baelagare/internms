# Phase 3 — Student Placement

## Scope
Student Placement only. Existing routes and backend-disconnected boundary remain unchanged. No packages, configuration edits, API requests, authentication bypasses or demo identities added. Design uses the approved ui-ux-pro-max-based token system.

## Changes
- **Placement Workspace Structure:**
  - **Current Assignment Status Card:** Clean hero card displaying current assignment (`student.company` or `"No host company assigned yet"`), assigned role, deployment status badge, work location, supervisor name, submitted preference, and deployment start date.
  - **Placement Eligibility & Readiness:** Compact definition list displaying institutional eligibility gates (college match, GPA cutoff, disciplinary clearance, document checklist, and slot availability) with direct navigation link to the checklist.
  - **Available Opportunities:** Scannable list of registered host organizations with position titles, location, available slot count, supervisor name, and role description.
  - **Profile Information Notice:** Replaced raw amber box with accessible `Notice tone="warning"` with an "Update Profile" button when skills, coursework, or degree program are missing.
  - **Filtering & Sorting Toolbar:** Clean `Card` containing accessible `Field` controls for filtering (All, Eligible only, Open slots only) and sorting (Recommended order, Highest alignment, Lowest alignment, Company name).
- **Opportunity Cards (`OpportunityCard` in `StudentPlacementCards.jsx`):**
  - Clean card using design system tokens (`border-line`, `bg-subtle`, `text-ink`, `text-muted`).
  - Alignment score with `ProgressBar` (or honest "Match score unavailable" when no score is computed).
  - Aligned skills count and relevant coursework count chips.
  - Native `<details>` disclosure for requirements, skills to build, and company eligibility.
  - Accessible action button ("Request Placement" or "Update Preference") with 44px min touch target and clear descriptive status note.
- **Preference Submission Modal (`PlacementRequest`):**
  - Clean modal dialog confirming placement preference submission with company name, position, explanation that coordinator approval is required, and Cancel/Submit buttons.

## Files touched
- `src/views/StudentPlacement.jsx` (redesigned)
- `src/views/StudentPlacementCards.jsx` (redesigned)
- `tests/placement.test.js` (created)
- `scripts/smoke.mjs` (added placement landmark assertions)
- `scripts/validate.mjs` (included `placement.test.js` in validation suite)
- `docs/PHASE-3-STUDENT-PLACEMENT.md` (created)

## Validation results
- **46 unit & contract tests passing** (including 6 new tests in `tests/placement.test.js`).
- **Production build passed with 0 warnings** (Vite build in ~2.8s; 361.26 kB JS · 46.36 kB CSS).
- **44/44 runtime smoke checks passing** (including explicit assertions verifying placement landmarks).
- `git diff --check` passed cleanly.
