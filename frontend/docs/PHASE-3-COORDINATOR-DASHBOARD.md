# Phase 3 — Coordinator Dashboard

## Summary
The coordinator now has a dedicated dashboard view and read-only presentation model. Other roles continue using the existing management dashboard. The new dashboard focuses on scoped review work, cohort status, and links to existing coordinator modules.

## Changes
- Added `src/services/coordinatorDashboard.js`: college-scoped records, review queue, active-alert count, checklist availability, and approved hour summaries. Missing source collections produce an unavailable dashboard; missing requirements remain unknown.
- Added `src/views/CoordinatorDashboard.jsx`: cohort overview, review queue, headline counts and quick navigation.
- Added token-based responsive styles in `src/views/coordinatorDashboard.css`.
- Routed coordinator role to the new view in `src/views/RoleDashboard.jsx`.
- Added focused tests and a server-render smoke assertion.

## Validation
- Tests: 65 passed.
- Production build: passed.
- Smoke checks: 44/44 passed (server rendering/runtime checks only).
- Lint: not configured.

## Scope and data caveats
- The page displays fields already present in frontend records; it does not call an API or synthesize records.
- Risk alert count follows the existing `hitlStatus/status` convention and excludes dismissed/dispatched alerts.
- Cohort hours include only supervisor-verified or coordinator-approved records with usable values.
- The approvals page and all later coordinator modules were not changed.
