# Phase 3 — Coordinator Interns

## Summary
Redesigned the shared Intern Directory presentation, with coordinator cohort summaries and college-scoped records. Admin and host representative scopes are preserved.

## Changes
- Added search across student name, ID, program, and host company, plus placement-status filter.
- Added coordinator-only counts for scoped students, deployed students, and pending placement preferences.
- Added responsive summary cards and clearer detail/unavailable labels.
- Added `src/services/internDirectory.js` to derive credited hours and clearance from available records without coercing missing/invalid values into zero.
- Evaluation absence and source unavailability are distinguished; no extra profile data is generated.
- Added tests and a coordinator smoke assertion.

## Validation
- Tests: 79 passed.
- Production build: passed.
- Smoke: 45 checks run; coordinator intern assertion passed. The broader smoke run still has failures in Coordinator Dashboard, Coordinator Placement, and Messages (pre-existing checks outside this module).
- Lint: not configured.

## Caveat
Clearance certification remains a human action and cannot be saved until backend connection. Directory aggregates are based on available frontend records, not live service data.
