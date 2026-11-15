# Phase 3 — Host Company Representative Interns

## Summary
Added a company-scoped intern directory for the `supervisor` role while preserving the coordinator/admin intern directory.

## Changes
- Added `src/services/hostInterns.js` to select interns assigned to the representative's company and derive available credited-hour, review-work, and evaluation-record indicators.
- Added `src/views/HostInternDirectory.jsx` and responsive styles in `src/views/hostInterns.css`.
- Routed only the supervisor role to this view from `src/views/Interns.jsx`.
- Host view does not display institutional clearance or evaluation scores; detail access remains limited to the existing other-role view.
- Added unit tests and host-specific smoke assertions.

## Validation
- Tests: 89 passed.
- Build: passed.
- Host Interns smoke assertion: passed.
- Full smoke suite still fails on unrelated Coordinator Dashboard, Coordinator Placement, Coordinator Settings, and Messages for student/supervisor/admin.
- Lint: not configured.

## Caveats
The host scope depends on the existing `scopedStudents` company-name match. These aggregates are based on frontend records, not live backend data. Approval/evaluation mutations remain unavailable until Phase 4.
