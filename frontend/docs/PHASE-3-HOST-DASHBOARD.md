# Phase 3 — Host Company Representative Dashboard

## Summary
Added a dedicated company-scoped dashboard for the `supervisor` role. The existing coordinator and admin dashboard paths remain separate.

## Changes
- Added `src/services/hostDashboard.js` for company-scoped student, review, and evaluation summaries. Missing required collections produce an unavailable state; invalid credited hours remain unknown.
- Added `src/views/HostDashboard.jsx` and token-based responsive styles in `src/views/hostDashboard.css`.
- Routed the supervisor role to the dedicated host dashboard in `src/views/RoleDashboard.jsx`.
- Added unit coverage and supervisor dashboard smoke assertion.

## Validation
- Tests: 86 passed.
- Build: passed.
- Host dashboard smoke assertion: passed.
- Full smoke suite still reports unrelated failures for Coordinator Dashboard and Messages (supervisor/admin/student).
- Lint: not configured.

## Scope limits
No authentication, API, data, or access rules changed. Company scope uses existing `scopedStudents` company matching. Dashboard actions navigate only to existing approval/evaluation/posting routes.
