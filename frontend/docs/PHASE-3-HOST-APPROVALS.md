# Phase 3 — Host Company Representative Approvals

## Summary
Updated the shared Approvals view with a host-company-specific heading, explanation, and queue summaries while preserving existing supervisor review rules and scoped-student source.

## Changes
- Identifies the page as `Company review queue` and explains host scope.
- Separates supervisor verification from the college coordinator's final OJT credit decision.
- Adds company queue counts: needs review, verified, and returned for changes.
- Guards missing logs and attendance-dispute collections so unavailable records do not crash rendering.
- Preserves current submission categories, filters, detail modal, review/return actions, and backend-unavailable service behavior.
- Added host-specific unit and smoke checks.

## Validation
- Tests: 90 passed.
- Production build: passed.
- Host Approvals smoke assertion: passed.
- Full smoke suite remains failing on unrelated Coordinator Dashboard, Coordinator Placement, Coordinator Settings, and Messages (student/supervisor/admin).
- Lint: not configured.

## Caveats
Review counts are based on current frontend status strings. Review writes cannot persist until the backend is implemented.
