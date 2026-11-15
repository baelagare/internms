# Phase 3 — Coordinator Settings

## Summary
Redesigned the coordinator-facing college settings form in the shared management module. It uses only existing persisted values and existing threshold bounds.

## Changes
- Grouped current fields into Academic requirements, Attendance thresholds, and Task review threshold.
- Added inline numeric range validation and accessible associated errors before attempting a save.
- Added institution-confirmation and backend-unavailable notices.
- Missing settings show a provisioning/unavailable state; no threshold values are invented.
- Added responsive token-based styling and targeted tests/smoke render for coordinator.

## Validation
- Tests: 82 passed (see `.validation/tests.log`).
- Build: passed.
- Smoke: coordinator Settings render was added. The broader suite still has failures for coordinator Dashboard/Placement and Messages; the Settings check should be verified in `.validation/smoke.json`.
- Lint: not configured.

## Caveats
Existing numeric ranges come from `src/services/management.js` and require confirmation against approved university policy. Saving is disabled at the service boundary until Phase 4.
