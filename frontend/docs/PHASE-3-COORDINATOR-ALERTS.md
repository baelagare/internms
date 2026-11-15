# Phase 3 — Coordinator Alerts

## Summary
Updated the coordinator-facing alerts queue in `src/views/Governance.jsx` with status summaries, filtering, explicit human-review context, and progressive evidence disclosure. Admin alert route remains on the shared view.

## Changes
- College-scoped alert list for coordinator, with status filter: all, needs review, dispatched, dismissed.
- Summary counts use existing `hitlStatus`/`status` values only.
- Raw evidence is collapsed under a keyboard-operable details disclosure.
- Policy explanation is never fabricated; blank message unless a stored draft exists, and unavailable policy/backend notices are explicit.
- Added token-based responsive summary styles and focused tests/smoke check.

## Validation (targeted)
- Unit test suite: 75 passed.
- Production build: passed.
- Existing broad smoke suite surfaced unrelated pre-existing failures (coordinator dashboard landmark, Messages assertions, placement assertion); coordinator alerts check itself should be verified separately after running smoke.
- Lint: not configured.

## Caveats
Alert data and status counts are frontend-record-derived. Review/dismiss/dispatch operations cannot complete until the backend is connected. An alert is an indicator, not a confirmed finding.
