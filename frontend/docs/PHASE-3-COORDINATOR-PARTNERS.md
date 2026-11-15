# Phase 3 — Coordinator Partners

## Summary
Updated the shared partner directory presentation used by coordinators/admins, while preserving host representative job-posting scope and existing record mutation service calls.

## Changes
- Added partner overview counts and clear `Partner directory` naming.
- Removed invitation token values from the directory; show invitation/representative-link status instead.
- Missing capacity now reads `Not recorded` instead of displaying null-like values.
- Added explicit guidance to use only confirmed partner data; absent fields are not auto-filled.
- Retained college-scoped records for coordinators, admin scope filter, and current edit/add form.
- Added responsive token styling, tests, and smoke landmarks.

## Validation
- Tests: 72 passed.
- Build: passed.
- Smoke: 44/44 passed (server-render/runtime checks, not browser interaction).
- Lint: not configured.

## Limitations
Partner mutations fail honestly because the backend is not connected. Summary counts are frontend-record-derived and should not be interpreted as live service data.
