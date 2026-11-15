# Phase 3 — Admin Interns

## Summary
Completed the Admin Interns module on the shared internal intern directory (`src/views/Interns.jsx`). The admin path now has a university-wide presentation: college scope filter, cohort summary strip, and scoped empty states. Coordinator behavior is unchanged, and the host representative keeps the separate `HostInternDirectory`.

## Changes
- `src/views/Interns.jsx`
  - Admin subtitle: "Student records across all colleges."
  - Admin now shows the cohort summary (Students in scope, Deployed, Placement preferences), scoped to the selected college.
  - Distinct empty states: "No students in this college" (college filter active) vs. "No students match" (search/placement filters) vs. "No student records yet" (nothing recorded).
- `tests/adminInterns.test.js` (new) — admin landmarks, scoped empty states, and `internDirectoryRecords` college scoping.
- `scripts/validate.mjs` — added `tests/adminInterns.test.js`.
- `scripts/smoke.mjs` — added admin Interns landmark assertions.

## Limitations
- "Certify clearance" remains a human certification action and cannot be saved until the Phase 4 backend is connected.
