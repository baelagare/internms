# Phase 3 — Host Company Representative Job Postings

## Summary
Refined the host representative path within the shared Partners/Job Postings screen. Coordinator/admin partner management remains unchanged.

## Changes
- Host posting editor now exposes only role title, role description/training scope, and required skills.
- Company-representative view no longer exposes GPA cutoff or maximum slot controls; these values remain under college partner administration.
- Added guidance to edit only company-confirmed information and clarified that capacity/eligibility are managed by the college.
- Added a no-posting-record state rather than inventing a role or posting.
- Added responsive notice styles, targeted tests, and host-specific smoke check.

## Validation
- Tests: 94 passed.
- Build: passed.
- Host posting smoke assertion: passed.
- Full smoke suite has known unrelated failures on Coordinator Dashboard/Placement/Settings and Messages for student/supervisor/admin.
- Lint: not configured.

## Caveat
Saving still fails honestly at the service boundary because the backend is not connected. The rep can edit only existing company-owned role information; no content is prefilled beyond stored record values.
