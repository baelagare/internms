# Phase 3 — Coordinator Placement

## Summary
Added a dedicated coordinator placement review presentation while preserving existing student and admin/supervisor paths. The coordinator sees records from their college, placement status filtering, basic student preference/assignment details, and transparent unavailable recommendations.

## Changes
- `src/views/Placement.jsx`: coordinator branch with scoped student list, status filter, review details, and explicit disabled-backend feedback on attempted assignment.
- `src/views/placement.css`: token-based responsive summary and spacing.
- `tests/placement.test.js`: test for coordinator branch and unavailable ranking behavior.
- `scripts/smoke.mjs`: coordinator placement render assertion.

## Validation
- Tests: 69 passed.
- Build: passed.
- Smoke: 44/44 passed (server-render/runtime only).
- Lint: not configured.

## Important limitation
`placementRankings()` currently returns an empty list, and assignment writes are unavailable until Phase 4. Therefore the module does not display match percentages or real eligibility recommendations, and assignment confirmation cannot produce a success state. Existing records are scoped through `scopedStudents` to the coordinator's college.
