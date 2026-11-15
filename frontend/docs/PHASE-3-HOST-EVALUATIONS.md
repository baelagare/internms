# Phase 3 — Host Company Representative Evaluations

## Summary
Redesigned the Host Company Representative's Evaluations view (`src/views/Evaluations.jsx`) with design system tokens, live criteria completion tracking, professional rating dropdowns, clean qualitative feedback inputs, and printable evaluation preview with institutional disclaimers.

## Changes
- Grouped the 19 criteria into 4 distinct rubric fieldsets with accessible legends:
  1. Technical competence & quality of work (q1–q5)
  2. Work habits, punctuality & attendance (q6–q10)
  3. Communication, teamwork & professional ethics (q11–q15)
  4. Initiative, adaptability & overall readiness (q16–q19)
- Replaced raw rating fields with accessible `Field` components featuring standard 1–5 qualitative labels (5 — Outstanding, 4 — Very Satisfactory, 3 — Satisfactory, 2 — Fair, 1 — Needs Improvement) and 44px min-height touch targets.
- Added live criteria completion tally card: displays `${ratedCount} of 19 criteria rated`, with total score, average, equivalent rating, and recommendation dynamically revealed only when all 19 criteria are rated.
- Replaced outdated "locally" terminology ("Submit evaluation locally") with professional submission labels: "Submit performance evaluation" / "Update performance evaluation" with `loadingLabel="Submitting evaluation…"`.
- Added explicit backend connection notice: indicates evaluations require Phase 4 Laravel backend to persist and be certified by the coordinator for graduation clearance.
- Redesigned `EvaluationDetails` modal with responsive print styles (`@media print`) and institutional headers.
- Added `src/views/evaluations.css` for scoped styling and responsive cards.
- Added `tests/evaluations.test.js` covering rubric completeness, scoring logic, out-of-bounds rejection, and UI completion requirements; added `Evaluations supervisor` smoke assertion.

## Validation
- Tests: 98 passed, 0 failed.
- Production build: passed.
- Host Evaluations smoke assertion: passed.
- Full smoke suite has known unrelated failures on Coordinator Dashboard, Coordinator Placement, Coordinator Settings, and Messages for student/supervisor/admin.
- Lint: not configured.

## Caveat
Submitting evaluations remains safely connected to `saveEvaluation`, which raises an honest unavailable notice until the Phase 4 backend is deployed. No fake scores or preselected ratings are applied to new evaluations.